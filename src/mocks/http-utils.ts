import { delay, HttpResponse } from 'msw'
import type { ZodType } from 'zod'
import type { ApiErrorBody, ApiErrorCode } from '@/contracts/errors'
import { commit, getDb, publicUser, type DbSession, type DbUser } from './db'
import { getScenario, seeded } from './scenarios'

const STATUS: Record<ApiErrorCode, number> = {
  validation_error: 422,
  unauthenticated: 401,
  session_expired: 401,
  invalid_credentials: 401,
  forbidden: 403,
  wallet_connection_refused: 403,
  not_found: 404,
  email_taken: 409,
  wallet_address_taken: 409,
  availability_conflict: 409,
  quote_outdated: 409,
  idempotency_conflict: 409,
  coupon_invalid: 422,
  coupon_expired: 422,
  transient_failure: 503,
  server_error: 500,
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  extra: Pick<ApiErrorBody, 'fieldErrors' | 'details'> = {},
): Response {
  const body: ApiErrorBody = { code, message, ...extra }
  return HttpResponse.json(body, { status: STATUS[code] })
}

let requestCounter = 0

/**
 * Aplica o cenário ativo antes de qualquer handler: latência determinística,
 * queda de conexão e falhas HTTP. Devolve uma resposta pronta se o cenário
 * exigir; `null` significa "siga em frente".
 */
export async function gate(opts: { latencyMs?: number } = {}): Promise<Response | null> {
  const scenario = getScenario()
  requestCounter += 1
  const { min, max } = scenario.latency
  const ms = opts.latencyMs ?? Math.round(min + seeded(requestCounter) * (max - min))
  await delay(ms)

  if (scenario.networkDown) return HttpResponse.error()
  if (scenario.httpFailureStatus) {
    const status = scenario.httpFailureStatus
    const code: ApiErrorCode = status === 500 ? 'server_error' : 'transient_failure'
    return HttpResponse.json(
      { code, message: `Falha simulada (HTTP ${status}).` } satisfies ApiErrorBody,
      { status, headers: status === 429 ? { 'Retry-After': '2' } : undefined },
    )
  }
  return null
}

/** Converte erros do zod em `fieldErrors` (primeira mensagem de cada campo). */
export function parseBody<T>(
  schema: ZodType<T>,
  data: unknown,
): { ok: true; data: T } | { ok: false; response: Response } {
  const result = schema.safeParse(data)
  if (result.success) return { ok: true, data: result.data }
  const fieldErrors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || 'form'
    if (!fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return {
    ok: false,
    response: apiError('validation_error', 'Revise os campos informados.', { fieldErrors }),
  }
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return undefined
  }
}

export type AuthResult =
  | { ok: true; user: DbUser; session: DbSession }
  | { ok: false; response: Response }

export function readToken(request: Request): string | null {
  const header = request.headers.get('Authorization')
  return header?.startsWith('Bearer ') ? header.slice(7) : null
}

export function findSession(token: string | null): { user: DbUser; session: DbSession } | null {
  if (!token) return null
  const db = getDb()
  const session = db.sessions.find((s) => s.token === token)
  if (!session) return null
  const user = db.users.find((u) => u.id === session.userId)
  return user ? { user, session } : null
}

export function requireAuth(request: Request): AuthResult {
  const token = readToken(request)
  if (!token) {
    return { ok: false, response: apiError('unauthenticated', 'Entre na sua conta para continuar.') }
  }
  const found = findSession(token)
  const expired =
    getScenario().sessionExpired || (found && new Date(found.session.expiresAt).getTime() <= Date.now())
  if (!found || expired) {
    return { ok: false, response: apiError('session_expired', 'Sua sessão expirou. Entre novamente.') }
  }
  return { ok: true, ...found }
}

/** Expira todas as sessões agora (usado pelos controles de teste). */
export function expireAllSessions(): void {
  for (const s of getDb().sessions) s.expiresAt = new Date(Date.now() - 1000).toISOString()
  commit()
}

export { publicUser }
