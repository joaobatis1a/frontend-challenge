import { toast } from 'sonner'

/**
 * Ações fora do escopo do desafio (criadores, artigos, login social, newsletter…).
 * Em vez de fingir sucesso, avisam que ainda não estão disponíveis.
 */
export function comingSoon(feature: string): void {
  toast.info(`${feature} ainda não está disponível nesta demonstração.`)
}
