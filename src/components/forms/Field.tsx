import { useId, useState, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export const inputClass =
  'h-10 w-full rounded border border-input bg-transparent px-3 text-sm placeholder:text-subtle focus:border-primary aria-invalid:border-destructive disabled:opacity-60'

interface FieldProps {
  label: string
  error?: string
  required?: boolean
  hint?: string
  /** Esconde o label visualmente (os formulários de login usam só placeholder no layout). */
  hideLabel?: boolean
  className?: string
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby': string | undefined; required?: boolean }) => ReactNode
}

/**
 * Campo de formulário acessível: label ligado ao input, erro anunciado e
 * associado por aria-describedby. Recebe o input como função para não
 * esconder qual elemento é renderizado.
 */
export function Field({ label, error, required, hint, hideLabel, className, children }: FieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className={cn('text-sm', hideLabel && 'sr-only')}>
        {label}
        {required && (
          <span className="ml-0.5 text-[#f07a50]" aria-hidden>
            *
          </span>
        )}
      </label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy, required })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

/** Input de senha com botão de mostrar/ocultar. */
export function PasswordInput({ className, ...props }: React.ComponentProps<'input'>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={cn(inputClass, 'pr-10', className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center text-subtle hover:text-brand"
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visible}
      >
        {visible ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
      </button>
    </div>
  )
}
