// Gera imagens SVG determinísticas para os NFTs da base simulada.
// São substitutas: troque pelas imagens do Figma quando disponíveis
// (public/images/nft/<n>.svg, <n>-2.svg e <n>-3.svg) ou ajuste `image` em src/mocks/seed.ts.
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'images', 'nft')
mkdirSync(outDir, { recursive: true })

const COUNT = 48

function mulberry32(seed) {
  let t = (seed + 0x6d2b79f5) | 0
  return () => {
    t = (t + 0x6d2b79f5) | 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function svg(seed) {
  const rand = mulberry32(seed * 7919)
  const hue = Math.floor(rand() * 360)
  const h2 = (hue + 40 + Math.floor(rand() * 80)) % 360
  const shapes = Array.from({ length: 5 }, () => {
    const cx = Math.floor(rand() * 400)
    const cy = Math.floor(rand() * 400)
    const r = 30 + Math.floor(rand() * 110)
    const h = (hue + Math.floor(rand() * 120)) % 360
    const o = (0.25 + rand() * 0.5).toFixed(2)
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="hsl(${h} 80% 62%)" fill-opacity="${o}"/>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400" role="img" aria-hidden="true"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 70% 22%)"/><stop offset="1" stop-color="hsl(${h2} 75% 38%)"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/>${shapes}</svg>`
}

for (let n = 1; n <= COUNT; n += 1) {
  writeFileSync(join(outDir, `${n}.svg`), svg(n))
  writeFileSync(join(outDir, `${n}-2.svg`), svg(n + 1000))
  writeFileSync(join(outDir, `${n}-3.svg`), svg(n + 2000))
}

// Avatares simples para criadores.
const avatarDir = join(root, 'public', 'images', 'avatars')
mkdirSync(avatarDir, { recursive: true })
for (let n = 1; n <= 8; n += 1) {
  writeFileSync(join(avatarDir, `${n}.svg`), svg(n + 5000))
}

console.log(`Geradas ${COUNT * 3} imagens de NFT e 8 avatares em public/images`)
