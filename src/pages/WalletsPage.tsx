import { useRef, useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { NETWORK_LABELS, NETWORKS, type NetworkId } from '@/contracts/cart'
import {
  MAX_WALLETS,
  PROVIDER_LABELS,
  WALLET_PROVIDERS,
  walletCreateSchema,
  type WalletProvider,
} from '@/contracts/wallets'
import { Field, inputClass } from '@/components/forms/Field'
import { focusFirstError, useFormErrors } from '@/components/forms/useFormErrors'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AccountLayout } from '@/features/account/components/AccountLayout'
import { useCreateWallet, useRemoveWallet, useUpdateWallet, useWallets } from '@/features/account/hooks'
import type { WalletWithConnection } from '@/lib/api/endpoints'
import { errorMessage } from '@/lib/api/errors'

export function WalletsPage() {
  const { data: wallets, isPending, isError, error, refetch } = useWallets()
  const [adding, setAdding] = useState(false)
  const primary = wallets?.find((w) => w.isPrimary)
  const secondary = wallets?.find((w) => !w.isPrimary)

  return (
    <AccountLayout title="Carteiras">
      {isPending ? (
        <div className="grid gap-6 md:grid-cols-2" aria-busy="true" aria-label="Carregando carteiras">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : isError ? (
        <p role="alert" className="text-destructive">
          {errorMessage(error)}{' '}
          <button type="button" className="underline" onClick={() => void refetch()}>
            Tentar novamente
          </button>
        </p>
      ) : (
        <div className="flex flex-col gap-12">
          <WalletSection
            title="Carteira principal"
            description="Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados."
            wallet={primary}
            canAdd={!primary && (wallets?.length ?? 0) < MAX_WALLETS}
            isPrimary
          />
          <WalletSection
            title="Carteira secundária"
            description="Você ainda não adicionou uma carteira secundária."
            wallet={secondary}
            canAdd={!secondary && Boolean(primary)}
            adding={adding}
            onAdd={() => setAdding(true)}
            onDone={() => setAdding(false)}
          />
        </div>
      )}
    </AccountLayout>
  )
}

interface WalletSectionProps {
  title: string
  description: string
  wallet: WalletWithConnection | undefined
  canAdd: boolean
  isPrimary?: boolean
  adding?: boolean
  onAdd?: () => void
  onDone?: () => void
}

function WalletSection({ title, description, wallet, canAdd, isPrimary, adding, onAdd, onDone }: WalletSectionProps) {
  const headingId = `${isPrimary ? 'primary' : 'secondary'}-wallet-title`
  const showForm = Boolean(wallet) || isPrimary || adding
  return (
    <section aria-labelledby={headingId}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id={headingId} className="font-bold">
            {title}
          </h2>
          {(isPrimary || !wallet) && !adding && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {!showForm && canAdd && (
          <button type="button" onClick={onAdd} className="font-bold text-brand hover:underline">
            Adicionar
          </button>
        )}
      </div>
      {showForm && (
        <WalletForm key={wallet?.id ?? 'new'} wallet={wallet} isPrimary={Boolean(isPrimary)} onDone={onDone} />
      )}
    </section>
  )
}

interface FormValues {
  label: string
  network: NetworkId | ''
  address: string
  ensName: string
  provider: WalletProvider | ''
}

/** Formulário de cadastro/edição. Valida com o mesmo schema do contrato e mostra erros da API. */
function WalletForm({ wallet, isPrimary, onDone }: { wallet?: WalletWithConnection; isPrimary: boolean; onDone?: () => void }) {
  const formRef = useRef<HTMLFormElement>(null)
  const create = useCreateWallet()
  const update = useUpdateWallet()
  const remove = useRemoveWallet()
  const { errors, formError, validate, fromApi } = useFormErrors(walletCreateSchema)
  const [values, setValues] = useState<FormValues>({
    label: wallet?.label ?? '',
    network: wallet?.network ?? '',
    address: wallet?.address ?? '',
    ensName: wallet?.ensName ?? '',
    provider: wallet?.provider ?? '',
  })
  const set = (patch: Partial<FormValues>) => setValues((v) => ({ ...v, ...patch }))
  const saving = create.isPending || update.isPending

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const data = validate({ ...values, network: values.network || undefined, provider: values.provider || undefined, isPrimary })
    if (!data) return focusFirstError(formRef.current)
    const onError = (error: unknown) => {
      fromApi(error)
      focusFirstError(formRef.current)
    }
    if (wallet) {
      update.mutate(
        { id: wallet.id, input: { ...data, ensName: values.ensName } },
        { onSuccess: () => toast.success('Carteira atualizada'), onError },
      )
    } else {
      create.mutate(data, {
        onSuccess: () => {
          toast.success('Carteira cadastrada')
          onDone?.()
        },
        onError,
      })
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="mt-6" aria-label={wallet ? `Editar ${wallet.label}` : 'Nova carteira'}>
      {formError && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {formError}
        </p>
      )}
      <div className="grid gap-6 md:grid-cols-2 md:gap-x-7">
        <Field label="Apelido da carteira" required error={errors.label}>
          {(p) => <input {...p} value={values.label} onChange={(e) => set({ label: e.target.value })} className={inputClass} />}
        </Field>
        <Field label="Rede" required error={errors.network}>
          {(p) => (
            <Select value={values.network} onValueChange={(v) => v && set({ network: v as NetworkId })}>
              <SelectTrigger {...p} className="h-10 w-full rounded border-input bg-transparent dark:bg-transparent">
                <SelectValue placeholder="Selecione uma rede" />
              </SelectTrigger>
              <SelectContent>
                {NETWORKS.map((n) => (
                  <SelectItem key={n} value={n}>
                    {NETWORK_LABELS[n]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
        <Field label="Endereço da carteira" required error={errors.address}>
          {(p) => (
            <input {...p} value={values.address} onChange={(e) => set({ address: e.target.value })} placeholder="Endereço 0x da carteira" spellCheck={false} className={inputClass} />
          )}
        </Field>
        <Field label="ENS ou identificação secundária (opcional)" error={errors.ensName}>
          {(p) => (
            <input {...p} value={values.ensName} onChange={(e) => set({ ensName: e.target.value })} placeholder="ex.: nova.kurio.eth" className={inputClass} />
          )}
        </Field>
        <Field label="Tipo de carteira" required error={errors.provider}>
          {(p) => (
            <Select value={values.provider} onValueChange={(v) => v && set({ provider: v as WalletProvider })}>
              <SelectTrigger {...p} className="h-10 w-full rounded border-input bg-transparent dark:bg-transparent">
                <SelectValue placeholder="Selecione uma carteira" />
              </SelectTrigger>
              <SelectContent>
                {WALLET_PROVIDERS.map((w) => (
                  <SelectItem key={w} value={w}>
                    {PROVIDER_LABELS[w]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="flex h-10 items-center gap-2 rounded bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Salvar carteira
        </button>
        {!wallet && onDone && (
          <button type="button" onClick={onDone} className="text-sm text-muted-foreground hover:text-brand">
            Cancelar
          </button>
        )}
        {wallet && !wallet.isPrimary && (
          <>
            <button
              type="button"
              onClick={() =>
                update.mutate(
                  { id: wallet.id, input: { isPrimary: true } },
                  { onSuccess: () => toast.success(`${wallet.label} agora é a principal`), onError: (e) => toast.error(errorMessage(e)) },
                )
              }
              className="text-sm text-brand hover:underline"
            >
              Tornar principal
            </button>
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(wallet.id, {
                  onSuccess: () => toast.success('Carteira removida'),
                  onError: (e) => toast.error(errorMessage(e)),
                })
              }
              className="text-sm text-muted-foreground hover:text-destructive"
            >
              Remover
            </button>
          </>
        )}
      </div>
    </form>
  )
}
