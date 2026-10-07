import { Link } from '@tanstack/react-router'
import { Container } from '@/components/layout/Container'

export function NotFoundPage() {
  return (
    <Container className="py-24 text-center">
      <p className="text-6xl font-bold text-brand" aria-hidden>
        404
      </p>
      <h1 className="mt-4 text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-3 text-muted-foreground">O endereço que você acessou não existe ou foi movido.</p>
      <Link to="/" className="mt-8 inline-block rounded bg-primary px-6 py-2.5 font-bold text-primary-foreground hover:bg-primary/90">
        Voltar ao início
      </Link>
    </Container>
  )
}
