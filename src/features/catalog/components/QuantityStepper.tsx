import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuantityStepperProps {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  label: string
  disabled?: boolean
  size?: 'sm' | 'md'
}

/** Controle de quantidade (− 1 +). Quantidades são sempre inteiras e respeitam o limite. */
export function QuantityStepper({ value, min = 1, max, onChange, label, disabled, size = 'md' }: QuantityStepperProps) {
  const btn = cn(
    'grid place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted-foreground',
    size === 'md' ? 'size-8' : 'size-5',
  )
  return (
    <div role="group" aria-label={label} className="flex items-center gap-3">
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= min}
        aria-label="Diminuir quantidade"
      >
        <Minus className={size === 'md' ? 'size-4' : 'size-3'} aria-hidden />
      </button>
      <output aria-live="polite" aria-label="Quantidade" className="min-w-4 text-center tabular-nums">
        {value}
      </output>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label="Aumentar quantidade"
      >
        <Plus className={size === 'md' ? 'size-4' : 'size-3'} aria-hidden />
      </button>
    </div>
  )
}
