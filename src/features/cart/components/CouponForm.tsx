import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { couponSchema } from '@/contracts/cart'
import { toApiError } from '@/lib/api/errors'
import { cn } from '@/lib/utils'
import { useApplyCoupon, useRemoveCoupon } from '../hooks'

/** Aplicar/remover cupom. Erros (inválido, expirado) aparecem ligados ao campo. */
export function CouponForm({ appliedCode, variant = 'desktop' }: { appliedCode: string | null; variant?: 'desktop' | 'mobile' }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const inputId = `coupon-${variant}`

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const parsed = couponSchema.safeParse({ code })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Informe o cupom')
      return
    }
    setError(null)
    apply.mutate(parsed.data.code, {
      onSuccess: () => {
        setCode('')
        toast.success('Cupom aplicado')
      },
      onError: (err) => {
        const apiError = toApiError(err)
        setError(apiError.fieldErrors.code ?? apiError.message)
      },
    })
  }

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between rounded border border-primary/60 px-3 py-2 text-sm">
        <span>
          Cupom <strong className="text-brand">{appliedCode}</strong> aplicado
        </span>
        <button
          type="button"
          onClick={() =>
            remove.mutate(undefined, {
              onSuccess: () => toast.success('Cupom removido'),
              onError: (err) => toast.error(toApiError(err).message),
            })
          }
          disabled={remove.isPending}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-brand"
        >
          <X className="size-3" aria-hidden /> Remover
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor={inputId} className={cn('mb-2 block text-sm font-bold', variant === 'mobile' && 'sr-only')}>
        Código promocional
      </label>
      <div className={cn('flex', variant === 'mobile' && 'rounded-full bg-background p-1')}>
        <input
          id={inputId}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Digite o código promocional..."
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          autoComplete="off"
          className={cn(
            'h-10 min-w-0 flex-1 bg-transparent px-3 text-sm placeholder:text-subtle',
            variant === 'desktop' ? 'rounded-l border border-input border-r-0' : 'rounded-full',
          )}
        />
        <button
          type="submit"
          disabled={apply.isPending}
          className={cn(
            'h-10 px-5 font-bold text-primary-foreground disabled:opacity-60',
            variant === 'desktop' ? 'rounded-r bg-primary' : 'rounded-full bg-gradient-to-r from-[#e0a06a] to-[#b8763f]',
          )}
        >
          {apply.isPending ? 'Aplicando…' : 'Aplicar'}
        </button>
      </div>
      {error && (
        <p id={`${inputId}-error`} role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
      <p className="mt-1 text-[11px] text-subtle">Experimente WELCOME10 ou ETHER5.</p>
    </form>
  )
}
