import { cn } from '@/lib/utils'

/** Largura de conteúdo do layout: 1200 px em telas grandes, com margem lateral no mobile. */
export function Container({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mx-auto w-full max-w-[1200px] px-4 md:px-6 xl:px-0', className)} {...props} />
}
