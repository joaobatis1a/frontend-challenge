import { Link } from '@tanstack/react-router'
import { CheckCircle2, Loader2, Wallet as WalletIcon } from 'lucide-react'
import { toast } from 'sonner'
import { NETWORK_LABELS } from '@/contracts/cart'
import { PROVIDER_LABELS, WALLET_PROVIDERS, type WalletProvider } from '@/contracts/wallets'
import { Skeleton } from '@/components/ui/skeleton'
import { useConnectWallet, useDisconnectWallet, useWallets } from '@/features/account/hooks'
import type { WalletWithConnection } from '@/lib/api/endpoints'
import { errorMessage } from '@/lib/api/errors'
import { shortAddress } from '@/lib/format'
import { cn } from '@/lib/utils'

interface WalletPickerProps {
  selectedId: string
  onSelect: (wallet: WalletWithConnection) => void
  error?: string
}

const radio = 'grid size-4 shrink-0 place-items-center rounded-full border border-primary'
const dot = (on: boolean) => (on ? <span className="size-2 rounded-full bg-primary" /> : null)

/**
 * Seleção da carteira cadastrada e simulação da conexão (aprovação, recusa e
 * desconexão acontecem na API simulada, cenário "wallet-refused").
 */
export function WalletPicker({ selectedId, onSelect, error }: WalletPickerProps) {
  const { data: wallets, isPending, isError, refetch } = useWallets()
  const connect = useConnectWallet()
  const disconnect = useDisconnectWallet()
  const selected = wallets?.find((w) => w.id === selectedId)

  if (isPending) return <Skeleton className="h-40 w-full" />
  if (isError)
    return (
      <p role="alert" className="text-sm text-destructive">
        Não foi possível carregar suas carteiras.{' '}
        <button type="button" className="underline" onClick={() => void refetch()}>
          Tentar novamente
        </button>
      </p>
    )
  if (!wallets?.length)
    return (
      <div className="rounded border border-border p-4 text-sm">
        Você ainda não cadastrou uma carteira.{' '}
        <Link to="/wallets" className="text-brand underline">
          Cadastrar carteira
        </Link>
      </div>
    )

  const pickProvider = (provider: WalletProvider) => {
    const match = wallets.find((w) => w.provider === provider)
    if (match) onSelect(match)
    else toast.info(`Nenhuma carteira ${PROVIDER_LABELS[provider]} cadastrada. Cadastre em Carteiras.`)
  }

  return (
    <div className="flex flex-col gap-5">
      <fieldset aria-describedby={error ? 'wallet-error' : undefined}>
        <div className="mb-3 flex items-center justify-between">
          <legend className="font-bold">Carteira conectada</legend>
          <Link to="/wallets" className="text-sm font-semibold text-brand hover:underline">
            Trocar carteira
          </Link>
        </div>
        <div role="radiogroup" aria-label="Carteira para pagamento" className="flex flex-col gap-3">
          {wallets.map((w) => (
            <button
              key={w.id}
              type="button"
              role="radio"
              aria-checked={w.id === selectedId}
              onClick={() => onSelect(w)}
              className="flex items-start gap-4 rounded-xl bg-card p-4 text-left ring-primary aria-checked:ring-1 md:rounded md:border md:border-border md:bg-transparent md:aria-checked:border-primary"
            >
              <span className={cn(radio, 'mt-1')}>{dot(w.id === selectedId)}</span>
              <span className="flex-1">
                <span className="block font-bold">
                  {w.label} {w.isPrimary && <span className="text-xs font-normal text-brand">(principal)</span>}
                </span>
                <span className="block text-sm text-muted-foreground">{w.ensName ?? shortAddress(w.address)}</span>
                <span className="block text-sm text-muted-foreground">
                  Rede {NETWORK_LABELS[w.network]} · {PROVIDER_LABELS[w.provider]}
                </span>
              </span>
              {w.connected && <CheckCircle2 className="size-5 text-brand" aria-label="Conectada" />}
            </button>
          ))}
        </div>
        {error && (
          <p id="wallet-error" className="mt-2 text-xs text-destructive">
            {error}
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-3 font-bold">Carteira e rede</legend>
        <div role="radiogroup" aria-label="Provedor da carteira" className="flex flex-col gap-3">
          {WALLET_PROVIDERS.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={selected?.provider === p}
              onClick={() => pickProvider(p)}
              className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 text-left text-sm md:rounded md:border md:border-border md:bg-transparent md:aria-checked:border-foreground"
            >
              <span className="grid size-9 place-items-center rounded-full border border-border text-xs font-bold text-brand md:hidden">
                {p === 'coinbase' ? <WalletIcon className="size-4" aria-hidden /> : PROVIDER_LABELS[p][0]}
              </span>
              <span className="flex-1">{PROVIDER_LABELS[p]}</span>
              <span className={radio}>{dot(selected?.provider === p)}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {selected && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-border p-3 text-sm" aria-live="polite">
          {selected.connected ? (
            <>
              <span className="flex items-center gap-2 text-brand">
                <CheckCircle2 className="size-4" aria-hidden /> {selected.label} conectada
              </span>
              <button
                type="button"
                onClick={() =>
                  disconnect.mutate(selected.id, {
                    onSuccess: () => toast.info('Carteira desconectada'),
                    onError: (e) => toast.error(errorMessage(e)),
                  })
                }
                disabled={disconnect.isPending}
                className="text-muted-foreground underline hover:text-brand"
              >
                Desconectar
              </button>
            </>
          ) : (
            <>
              <span>{connect.isPending ? 'Aguardando aprovação na carteira…' : 'Carteira desconectada'}</span>
              <button
                type="button"
                onClick={() =>
                  connect.mutate(selected.id, {
                    onSuccess: () => toast.success('Carteira conectada'),
                    onError: (e) => toast.error(errorMessage(e)),
                  })
                }
                disabled={connect.isPending}
                className="flex items-center gap-2 rounded bg-primary px-3 py-1.5 font-semibold text-primary-foreground disabled:opacity-60"
              >
                {connect.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Conectar carteira
              </button>
            </>
          )}
          {connect.isError && !connect.isPending && (
            <p role="alert" className="w-full text-xs text-destructive">
              {errorMessage(connect.error)} Tente novamente ou escolha outra carteira.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
