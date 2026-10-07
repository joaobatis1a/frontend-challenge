import { useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { CATEGORY_LABELS, type NftCategory } from '@/contracts/nft'
import { Container } from './Container'
import { comingSoon } from './comingSoon'

const FEATURES = [
  {
    letter: 'W',
    title: 'Segurança da carteira',
    text: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    letter: 'C',
    title: 'Criadores em destaque',
    text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    letter: 'D',
    title: 'Alertas de lançamentos',
    text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
]

const FOOTER_CATEGORIES: NftCategory[] = ['digital-art', 'photography', 'music', '3d', 'utility']

/** Link para algo fora do escopo: avisa em vez de navegar para uma página vazia. */
function SoonLink({ label }: { label: string }) {
  return (
    <button type="button" className="text-left hover:text-brand" onClick={() => comingSoon(label)}>
      {label}
    </button>
  )
}

function SocialIcon({ label, path }: { label: string; path: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => comingSoon(`O perfil no ${label}`)}
      className="grid size-8 place-items-center rounded border border-primary text-brand hover:bg-primary hover:text-primary-foreground"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
        <path d={path} />
      </svg>
    </button>
  )
}

export function WalletBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded border border-primary/60 bg-secondary px-2 py-1 text-[9px] font-bold tracking-wider text-brand">
      METAMASK <span aria-hidden>•</span> WALLETCONNECT <span aria-hidden>•</span> COINBASE
    </span>
  )
}

export function Footer() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const subscribe = (e: FormEvent) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Informe um e-mail válido')
      return
    }
    setError(null)
    comingSoon('A newsletter')
  }

  return (
    <footer className="mt-16 pb-24 md:mt-24 md:pb-6">
      <Container>
        <div className="rounded-t bg-card">
          <div className="grid gap-8 p-6 md:grid-cols-2 md:p-10 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.letter} className="lg:border-r lg:border-primary lg:pr-6">
                <span
                  aria-hidden
                  className="mb-5 grid size-[74px] place-items-center rounded-full bg-primary text-2xl font-bold text-primary-foreground"
                >
                  {f.letter}
                </span>
                <h2 className="mb-3 font-semibold">{f.title}</h2>
                <p className="text-sm leading-6 text-muted-foreground">{f.text}</p>
              </div>
            ))}
            <form onSubmit={subscribe} noValidate>
              <h2 className="mb-4 font-semibold leading-5">Antecipe-se ao próximo lançamento</h2>
              <label htmlFor="newsletter-email" className="sr-only">
                Seu e-mail
              </label>
              <div className="flex">
                <input
                  id="newsletter-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="digite seu e-mail..."
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'newsletter-error' : undefined}
                  className="h-10 min-w-0 flex-1 rounded-l bg-secondary/70 px-3 text-sm placeholder:text-subtle"
                />
                <button
                  type="submit"
                  className="h-10 rounded-r bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Enviar
                </button>
              </div>
              {error && (
                <p id="newsletter-error" className="mt-2 text-xs text-destructive">
                  {error}
                </p>
              )}
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
              </p>
            </form>
          </div>

          <div className="grid gap-3 bg-secondary px-6 py-6 text-sm md:grid-cols-4 md:items-center md:px-8">
            <span className="font-bold tracking-widest">KURIO</span>
            <span className="leading-5">Feito para colecionadores, criadores e cultura</span>
            <a href="mailto:contato@email.com" className="hover:text-brand">
              contato@email.com
            </a>
            <a href="tel:+551140028922" className="hover:text-brand">
              +55 11 4002 8922
            </a>
          </div>

          <div className="grid gap-8 px-6 py-8 text-sm sm:grid-cols-2 md:px-8 lg:grid-cols-4">
            <nav aria-labelledby="footer-perfil">
              <h2 id="footer-perfil" className="mb-3 font-semibold">
                Meu perfil
              </h2>
              <ul className="flex flex-col gap-2">
                <li>
                  <Link to="/profile" className="hover:text-brand">
                    Meu perfil
                  </Link>
                </li>
                <li>
                  <Link to="/wallets" className="hover:text-brand">
                    Carteiras
                  </Link>
                </li>
                <li>
                  <SoonLink label="Atividade" />
                </li>
                <li>
                  <SoonLink label="Estúdio do criador" />
                </li>
                <li>
                  <Link to="/cart" className="hover:text-brand">
                    Carrinho
                  </Link>
                </li>
              </ul>
            </nav>
            <nav aria-labelledby="footer-ajuda">
              <h2 id="footer-ajuda" className="mb-3 font-semibold">
                Central de ajuda
              </h2>
              <ul className="flex flex-col gap-2">
                {['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item'].map(
                  (label) => (
                    <li key={label}>
                      <SoonLink label={label} />
                    </li>
                  ),
                )}
              </ul>
            </nav>
            <nav aria-labelledby="footer-colecoes">
              <h2 id="footer-colecoes" className="mb-3 font-semibold">
                Coleções
              </h2>
              <ul className="flex flex-col gap-2">
                {FOOTER_CATEGORIES.map((c) => (
                  <li key={c}>
                    <Link to="/" search={{ category: [c] }} hash="mercado" className="hover:text-brand">
                      {CATEGORY_LABELS[c]}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div>
              <h2 className="mb-3 font-semibold">Redes sociais</h2>
              <div className="flex gap-2">
                <SocialIcon label="Facebook" path="M14 8h3V4h-3c-2.8 0-4 1.7-4 4.3V10H7v4h3v8h4v-8h3l1-4h-4V8.6c0-.4.3-.6.7-.6Z" />
                <SocialIcon label="Instagram" path="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm0 2a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H7Zm5 3.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM17.3 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
                <SocialIcon label="Twitter" path="M22 5.9c-.7.3-1.5.5-2.3.6.8-.5 1.5-1.3 1.8-2.2-.8.5-1.7.8-2.6 1a4 4 0 0 0-6.9 3.7A11.4 11.4 0 0 1 3.7 4.8a4 4 0 0 0 1.2 5.4c-.6 0-1.3-.2-1.8-.5 0 2 1.4 3.6 3.2 4a4 4 0 0 1-1.8.1 4 4 0 0 0 3.8 2.8A8.1 8.1 0 0 1 2 18.2 11.4 11.4 0 0 0 8.3 20c7.4 0 11.5-6.2 11.5-11.5v-.5c.8-.6 1.5-1.3 2-2.1Z" />
                <SocialIcon label="LinkedIn" path="M5 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM3.3 9h3.4v11H3.3V9Zm5.6 0h3.3v1.5c.5-.9 1.6-1.8 3.3-1.8 3.5 0 4.2 2.3 4.2 5.3v6h-3.4v-5.3c0-1.3 0-2.9-1.8-2.9s-2.1 1.4-2.1 2.8V20H8.9V9Z" />
                <SocialIcon label="YouTube" path="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8c.2.9.9 1.6 1.8 1.8 1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8ZM10 15V9l5.2 3L10 15Z" />
              </div>
              <h2 className="mt-6 mb-3 font-semibold">Carteiras compatíveis</h2>
              <WalletBadge />
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-xs">© 2026 Kurio. Propriedade digital para todos.</p>
      </Container>
    </footer>
  )
}
