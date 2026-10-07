// Auditoria Lighthouse: início e detalhe do NFT, perfis mobile e desktop,
// 3 medições por combinação, mediana de cada categoria.
//
// Uso: npm run lighthouse   (faz o build, sobe o preview e roda tudo)
// Saída: lighthouse/reports/*.html|json e lighthouse/summary.md
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import os from 'node:os'
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'
import { chromium } from '@playwright/test'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'

const BASE = process.env.LH_BASE_URL ?? 'http://localhost:4173'
const RUNS = Number(process.env.LH_RUNS ?? 3)
const PAGES = [
  { id: 'inicio', path: '/' },
  { id: 'detalhe', path: '/nft/nft-01' },
]
const PROFILES = ['mobile', 'desktop']
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']
const OUT = join(process.cwd(), 'lighthouse')
const REPORTS = join(OUT, 'reports')
mkdirSync(REPORTS, { recursive: true })

const median = (values) => {
  const s = [...values].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

async function waitFor(url, timeoutMs = 60_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // ainda subindo
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Servidor não respondeu em ${url}`)
}

let server
// O preview roda dentro de um shell: é preciso encerrar a árvore de processos
// inteira, senão o servidor fica vivo na porta 4173 (no Windows, kill() só fecha o shell).
function stopServer() {
  if (!server?.pid) return
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
  else process.kill(-server.pid)
}
if (!process.env.LH_BASE_URL) {
  console.log('> build + preview')
  server = spawn('npm run build && npm run preview', { shell: true, stdio: 'ignore', detached: process.platform !== 'win32' })
  await waitFor(BASE, 180_000)
}

const chrome = await chromeLauncher.launch({
  chromePath: process.env.CHROME_PATH ?? chromium.executablePath(),
  chromeFlags: ['--headless=new', '--no-first-run', '--no-default-browser-check'],
})

const results = []
try {
  for (const page of PAGES) {
    for (const profile of PROFILES) {
      for (let run = 1; run <= RUNS; run += 1) {
        const name = `${page.id}-${profile}-${run}`
        process.stdout.write(`> ${name} ... `)
        const config = profile === 'desktop' ? desktopConfig : undefined
        const result = await lighthouse(
          `${BASE}${page.path}`,
          { port: chrome.port, output: ['html', 'json'], logLevel: 'error', onlyCategories: CATEGORIES },
          config,
        )
        const [html, json] = result.report
        writeFileSync(join(REPORTS, `${name}.html`), html)
        writeFileSync(join(REPORTS, `${name}.json`), json)
        const lhr = result.lhr
        const entry = {
          page: page.id,
          profile,
          run,
          scores: Object.fromEntries(CATEGORIES.map((c) => [c, Math.round((lhr.categories[c]?.score ?? 0) * 100)])),
          lcp: lhr.audits['largest-contentful-paint'].numericValue,
          cls: lhr.audits['cumulative-layout-shift'].numericValue,
          tbt: lhr.audits['total-blocking-time'].numericValue,
        }
        results.push(entry)
        console.log(CATEGORIES.map((c) => `${c}=${entry.scores[c]}`).join(' '))
      }
    }
  }
} finally {
  await chrome.kill()
  stopServer()
}

// Resumo com medianas
const pkg = JSON.parse(readFileSync(join(process.cwd(), 'node_modules/lighthouse/package.json'), 'utf8'))
const rows = []
for (const page of PAGES) {
  for (const profile of PROFILES) {
    const runs = results.filter((r) => r.page === page.id && r.profile === profile)
    rows.push({
      page: page.id,
      profile,
      ...Object.fromEntries(CATEGORIES.map((c) => [c, median(runs.map((r) => r.scores[c]))])),
      lcp: median(runs.map((r) => r.lcp)),
      cls: median(runs.map((r) => r.cls)),
      tbt: median(runs.map((r) => r.tbt)),
    })
  }
}

const md = [
  '# Auditoria Lighthouse',
  '',
  `Gerado em ${new Date().toISOString()} por \`npm run lighthouse\` (${RUNS} medições por página e perfil; valores = mediana).`,
  '',
  '| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |',
  '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ...rows.map(
    (r) =>
      `| ${r.page} | ${r.profile} | ${r.performance} | ${r.accessibility} | ${r['best-practices']} | ${r.seo} | ${(r.lcp / 1000).toFixed(2)} s | ${r.cls.toFixed(3)} | ${Math.round(r.tbt)} ms |`,
  ),
  '',
  '## Ambiente',
  '',
  `- Lighthouse ${pkg.version} (API Node), Chromium do Playwright em modo headless`,
  `- Node ${process.version}, ${os.type()} ${os.release()} (${os.arch()}), CPU: ${os.cpus()[0]?.model ?? '?'} × ${os.cpus().length}, ${Math.round(os.totalmem() / 1e9)} GB RAM`,
  `- Build de produção (\`vite build\`) servido por \`vite preview\` em ${BASE}`,
  '- Cenário padrão dos mocks (MSW ativo, como na demonstração publicada)',
  '- Perfil mobile: padrão do Lighthouse (Moto G Power emulado, 4G lento, CPU 4×). Perfil desktop: `desktop-config` oficial.',
  '',
  '## Medições individuais',
  '',
  '| Execução | Perf. | A11y | BP | SEO | LCP | CLS | TBT |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ...results.map(
    (r) =>
      `| ${r.page}-${r.profile}-${r.run} | ${r.scores.performance} | ${r.scores.accessibility} | ${r.scores['best-practices']} | ${r.scores.seo} | ${(r.lcp / 1000).toFixed(2)} s | ${r.cls.toFixed(3)} | ${Math.round(r.tbt)} ms |`,
  ),
  '',
]
writeFileSync(join(OUT, 'summary.md'), md.join('\n'))
console.log('\n' + md.slice(4, 4 + rows.length + 2).join('\n'))
