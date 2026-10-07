import { cn } from '@/lib/utils'

/**
 * Skeleton com efeito shimmer (faixa de luz que atravessa o bloco).
 * O tamanho vem de quem usa, para reservar o espaço do conteúdo e evitar
 * deslocamento de layout. Com movimento reduzido, o brilho fica parado.
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        'relative overflow-hidden rounded-md bg-surface-2',
        'before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer',
        'before:bg-gradient-to-r before:from-transparent before:via-white/[0.06] before:to-transparent',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
