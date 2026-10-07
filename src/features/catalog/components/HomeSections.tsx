import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { comingSoon } from '@/components/layout/comingSoon'
import { eth } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useFeatured } from '../hooks'

const SLIDES = [
  { image: '/images/nft/emerald.webp', alt: 'Ilustração de um macaco de óculos e jaqueta verde' },
  { image: '/images/nft/nomad.webp', alt: 'Ilustração de um gorila de chapéu e moletom lilás' },
  { image: '/images/nft/golden.webp', alt: 'Ilustração de um macaco dourado com fones de ouvido' },
]

/** Hero do desktop/tablet. A imagem é estática (sem esperar a API) para não atrasar o LCP. */
export function HeroDesktop() {
  const [slide, setSlide] = useState(0)
  const current = SLIDES[slide] ?? SLIDES[0]!
  return (
    <section aria-labelledby="hero-title" className="hidden items-center gap-10 py-6 md:grid md:grid-cols-[1fr_minmax(0,450px)]">
      <div className="lg:pl-12">
        <p className="mb-6 text-sm tracking-wider">Bem-vindo à Kurio</p>
        <h1 id="hero-title" className="text-4xl leading-[1.45] font-bold tracking-wider uppercase lg:text-[44px]">
          Seja dono do futuro <br className="hidden lg:block" />
          da arte digital
        </h1>
        <p className="mt-5 max-w-[540px] text-sm leading-6 text-muted-foreground">
          Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas
          e tenha uma parte da cultura da internet.
        </p>
        <div className="mt-10 flex items-center justify-between lg:max-w-[600px]">
          <Link
            to="/"
            hash="mercado"
            className="rounded bg-primary px-7 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            EXPLORAR
          </Link>
          <div className="flex gap-2" role="group" aria-label="Escolher destaque">
            {SLIDES.map((s, i) => (
              <button
                key={s.image}
                type="button"
                onClick={() => setSlide(i)}
                aria-label={`Destaque ${i + 1} de ${SLIDES.length}`}
                aria-pressed={i === slide}
                className="grid size-6 place-items-center"
              >
                <span className={cn('size-2 rounded-full bg-primary', i !== slide && 'opacity-60')} />
              </button>
            ))}
          </div>
        </div>
      </div>
      <img
        src={current.image}
        alt={current.alt}
        width={450}
        height={450}
        fetchPriority="high"
        className="aspect-square w-full rounded-3xl object-cover"
      />
    </section>
  )
}

/** Hero do mobile: cartão arredondado com duas ilustrações sobrepostas. */
export function HeroMobile() {
  return (
    <section
      aria-labelledby="hero-title-mobile"
      className="relative mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-[#5a3a24] via-[#3b2618] to-[#241612] p-4 md:hidden"
    >
      <div className="relative z-10 max-w-[56%]">
        <p className="text-xs">Bem-vindo à Kurio</p>
        <h1 id="hero-title-mobile" className="mt-2 text-lg leading-8 font-bold tracking-wide uppercase">
          Seja dono da cultura digital
        </h1>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">Descubra NFTs selecionados de criadores do mundo todo.</p>
        <Link to="/" hash="mercado" className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-brand">
          EXPLORAR <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <img
        src="/images/nft/emerald.webp"
        alt=""
        width={140}
        height={140}
        fetchPriority="high"
        className="absolute top-3 right-3 size-[140px] rounded-xl object-cover"
      />
      <img
        src="/images/nft/nomad.webp"
        alt=""
        width={60}
        height={60}
        className="absolute top-[96px] right-[100px] size-[60px] rounded-lg border-2 border-card object-cover"
      />
    </section>
  )
}

/** Card lateral "NFT em destaque — oferta limitada". */
export function FeaturedSpotlight() {
  const { data, isPending, isError } = useFeatured()
  const nft = data?.[0]
  if (isError) return null
  return (
    <aside aria-labelledby="spotlight-title" className="mt-4 rounded bg-card pt-4">
      <h2 id="spotlight-title" className="px-3 text-lg font-bold text-brand uppercase">
        NFT em destaque
      </h2>
      <p className="mb-3 px-8 font-semibold uppercase">Oferta limitada</p>
      {isPending || !nft ? (
        <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
      ) : (
        <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="block">
          <img
            src={nft.image}
            alt={`${nft.name}, a partir de ${eth(nft.priceFromEth)}`}
            width={310}
            height={400}
            loading="lazy"
            className="aspect-[3/4] w-full rounded-2xl object-cover"
          />
        </Link>
      )}
    </aside>
  )
}

const BANNERS = [
  {
    image: '/images/nft/emerald.webp',
    title: 'Lançamentos gênesis de edição limitada',
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    search: { featured: true },
  },
  {
    image: '/images/nft/baron.webp',
    title: 'Arte digital selecionada e muito mais',
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    search: { category: ['digital-art' as const] },
  },
]

export function PromoBanners() {
  return (
    <section aria-label="Coleções em destaque" className="mt-20 grid gap-6 md:grid-cols-2">
      {BANNERS.map((b) => (
        <article key={b.title} className="grid grid-cols-[minmax(0,45%)_1fr] overflow-hidden rounded bg-card">
          <img src={b.image} alt="" width={290} height={250} loading="lazy" className="h-full w-full object-cover" />
          <div className="flex flex-col items-end justify-center gap-3 p-4 text-right">
            <h2 className="leading-6 font-semibold">{b.title}</h2>
            <p className="text-xs leading-5 text-muted-foreground">{b.text}</p>
            <Link
              to="/"
              search={b.search}
              hash="mercado"
              className="inline-flex items-center gap-2 rounded bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Explorar <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </article>
      ))}
    </section>
  )
}

const ARTICLES = [
  { image: '/images/nft/baron.webp', date: '12 de setembro', read: 6, title: 'Como funciona a propriedade de NFTs', text: 'Aprenda a colecionar, negociar e verificar ativos digitais.' },
  { image: '/images/nft/emerald.webp', date: '13 de setembro', read: 2, title: '10 artistas digitais para acompanhar', text: 'Conheça criadores que moldam a cultura digital.' },
  { image: '/images/nft/nomad.webp', date: '15 de setembro', read: 3, title: 'Raridade, atributos e procedência', text: 'Entenda raridade, procedência, direitos autorais e utilidade.' },
  { image: '/images/nft/golden.webp', date: '15 de setembro', read: 2, title: 'Como proteger sua carteira', text: 'Proteja seus ativos e sua identidade.' },
]

export function MintJournal() {
  return (
    <section aria-labelledby="journal-title" className="mt-24">
      <h2 id="journal-title" className="text-center text-2xl font-semibold">
        Diário da Cunhagem
      </h2>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
      </p>
      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {ARTICLES.map((a) => (
          <li key={a.title}>
            <article className="h-full overflow-hidden rounded bg-card">
              <img src={a.image} alt="" width={270} height={195} loading="lazy" className="aspect-[270/195] w-full object-cover" />
              <div className="p-4">
                <p className="text-xs text-muted-foreground">
                  {a.date} | Leitura de {a.read} min
                </p>
                <h3 className="mt-3 text-sm leading-5 font-semibold">{a.title}</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{a.text}</p>
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-brand hover:underline"
                  onClick={() => comingSoon('O Diário da Cunhagem')}
                >
                  Ler mais <span className="sr-only">sobre {a.title}</span> →
                </button>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
