import { z } from 'zod'

export interface User {
  id: string
  name: string
  email: string
  username: string
  bio: string
  /** Nome ENS simulado (ex.: "ana.eth"). */
  ensName: string | null
  avatarUrl: string | null
  createdAt: string
}

export interface AuthResponse {
  user: User
  token: string
  expiresAt: string
}

export interface SessionResponse {
  user: User
  expiresAt: string
}

const ensNameSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9-]{3,32}$/, 'Use de 3 a 32 letras minúsculas, números ou hífen')

export const signupSchema = z.object({
  /** No cadastro o layout pede o nome de usuário; ele também vira o nome de exibição. */
  name: z.string().trim().min(2, 'Informe seu nome'),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z
    .string()
    .min(8, 'A senha precisa ter pelo menos 8 caracteres')
    .regex(/[A-Za-z]/, 'Inclua pelo menos uma letra')
    .regex(/\d/, 'Inclua pelo menos um número'),
  /** Carrinho do visitante, para mesclar com o da conta ao autenticar. */
  guestCartId: z.string().optional(),
})
export type SignupInput = z.infer<typeof signupSchema>

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
  guestCartId: z.string().optional(),
})
export type LoginInput = z.infer<typeof loginSchema>

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome').optional(),
  username: z
    .string()
    .trim()
    .min(3, 'Mínimo de 3 caracteres')
    .regex(/^[a-z0-9_]+$/i, 'Use apenas letras, números e _')
    .optional(),
  email: z.string().trim().toLowerCase().email('E-mail inválido').optional(),
  /** Sem o sufixo ".eth"; vazio remove o nome ENS. */
  ensName: z.union([ensNameSchema, z.literal('')]).optional(),
  bio: z.string().max(280, 'Máximo de 280 caracteres').optional(),
})
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual'),
  newPassword: z
    .string()
    .min(8, 'A senha precisa ter pelo menos 8 caracteres')
    .regex(/[A-Za-z]/, 'Inclua pelo menos uma letra')
    .regex(/\d/, 'Inclua pelo menos um número'),
})
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>

/** Avatar enviado como data URL (simula upload de arquivo). Limite de ~512 KB. */
export const avatarSchema = z.object({
  dataUrl: z
    .string()
    .regex(/^data:image\/(png|jpeg|webp|gif);base64,/, 'Formato de imagem inválido')
    .max(700_000, 'Imagem muito grande (máximo de 512 KB)'),
})
export type AvatarInput = z.infer<typeof avatarSchema>
