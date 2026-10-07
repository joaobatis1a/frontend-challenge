// Contrato de erro: todas as respostas não-2xx da API simulada usam este formato.
export const API_ERROR_CODES = [
  'validation_error', // 422: campos inválidos (veja fieldErrors)
  'unauthenticated', // 401: sem sessão
  'session_expired', // 401: sessão existia e expirou
  'invalid_credentials', // 401: e-mail ou senha incorretos
  'forbidden', // 403: sem permissão
  'wallet_connection_refused', // 403: a carteira recusou a conexão (simulado)
  'not_found', // 404: recurso inexistente
  'email_taken', // 409: conflito de cadastro
  'wallet_address_taken', // 409: carteira já cadastrada
  'availability_conflict', // 409: quantidade acima do disponível
  'quote_outdated', // 409: preço, taxa ou disponibilidade mudou desde a cotação
  'idempotency_conflict', // 409: mesma chave com conteúdo diferente
  'coupon_invalid', // 422: cupom inexistente
  'coupon_expired', // 422: cupom vencido
  'transient_failure', // 503: falha temporária, vale tentar de novo
  'server_error', // 500
] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

export interface ApiErrorBody {
  code: ApiErrorCode
  message: string
  /** Mensagens por campo, para formulários: { email: "E-mail já cadastrado" } */
  fieldErrors?: Record<string, string>
  /** Dados extras úteis para recuperar do erro (ex.: nova cotação). */
  details?: Record<string, unknown>
}
