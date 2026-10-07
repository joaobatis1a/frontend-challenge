import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Números visíveis: primeira, última e vizinhas da atual, com "…" entre elas. */
function pageList(current: number, total: number): (number | 'gap')[] {
  const pages = new Set([1, total, current - 1, current, current + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const out: (number | 'gap')[] = []
  sorted.forEach((p, i) => {
    const prev = sorted[i - 1]
    if (prev !== undefined && p - prev > 1) out.push('gap')
    out.push(p)
  })
  return out
}

const cell =
  'grid size-8 place-items-center rounded border border-border text-sm hover:border-primary aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:font-bold aria-[current=page]:text-primary-foreground'

/** A página vive na URL (`?page=2`): links reais, que funcionam com voltar/avançar do navegador. */
export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label="Paginação do catálogo" className="mt-10 flex justify-end">
      <ul className="flex items-center gap-2">
        {page > 1 && (
          <li>
            <Link
              to="/"
              hash="mercado"
              search={(prev) => ({ ...prev, page: page - 1 === 1 ? undefined : page - 1 })}
              className={cell}
              aria-label="Página anterior"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Link>
          </li>
        )}
        {pageList(page, totalPages).map((p, i) =>
          p === 'gap' ? (
            <li key={`gap-${i}`} aria-hidden className="px-1 text-muted-foreground">
              …
            </li>
          ) : (
            <li key={p}>
              <Link
                to="/"
                hash="mercado"
                search={(prev) => ({ ...prev, page: p === 1 ? undefined : p })}
                className={cn(cell)}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Página ${p}`}
              >
                {p}
              </Link>
            </li>
          ),
        )}
        {page < totalPages && (
          <li>
            <Link
              to="/"
              hash="mercado"
              search={(prev) => ({ ...prev, page: page + 1 })}
              className={cell}
              aria-label="Próxima página"
            >
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}
