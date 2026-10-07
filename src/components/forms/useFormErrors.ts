import { useState } from 'react'
import type { ZodType } from 'zod'
import { toApiError } from '@/lib/api/errors'

/**
 * Validação de formulário com o MESMO schema zod do contrato da API.
 * - `validate`: confere no cliente antes de enviar (devolve os dados ou null);
 * - `fromApi`: mostra nos campos os erros devolvidos pela API (fieldErrors).
 */
export function useFormErrors<T>(schema: ZodType<T>) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const validate = (values: unknown): T | null => {
    const result = schema.safeParse(values)
    if (result.success) {
      setErrors({})
      setFormError(null)
      return result.data
    }
    const next: Record<string, string> = {}
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || 'form'
      next[key] ??= issue.message
    }
    setErrors(next)
    return null
  }

  const fromApi = (error: unknown) => {
    const apiError = toApiError(error)
    const { form, ...fields } = apiError.fieldErrors
    setErrors(fields)
    setFormError(form ?? (Object.keys(fields).length ? null : apiError.message))
  }

  const setError = (field: string, message: string) => setErrors((e) => ({ ...e, [field]: message }))

  return { errors, formError, validate, fromApi, setError, setFormError }
}

/** Foca o primeiro campo inválido (ajuda quem navega por teclado/leitor de tela). */
export function focusFirstError(form: HTMLFormElement | null) {
  requestAnimationFrame(() => form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
}
