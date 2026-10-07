// Utilidades de hash do ambiente simulado.

const encoder = new TextEncoder()

const toHex = (bytes: ArrayBuffer): string =>
  Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('')

/**
 * Hash de senha com PBKDF2 (Web Crypto) e sal por usuário. A senha em texto
 * nunca é guardada: o banco simulado só conhece `salt` e `hash`.
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 20_000 },
    key,
    256,
  )
  return toHex(bits)
}

export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** FNV-1a de 32 bits em hexadecimal: resumo curto e determinístico (não é segurança). */
export function fnv1a(text: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

/** Hash simulado de transação: 0x + 64 hexadecimais derivados do id do pedido. */
export function fakeTxHash(seed: string): string {
  let out = ''
  for (let i = 0; out.length < 64; i += 1) out += fnv1a(`${seed}:${i}`)
  return `0x${out.slice(0, 64)}`
}
