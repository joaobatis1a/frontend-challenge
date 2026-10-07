import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { ImageIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { passwordChangeSchema, profileUpdateSchema, type User } from '@/contracts/auth'
import { Field, PasswordInput, inputClass } from '@/components/forms/Field'
import { focusFirstError, useFormErrors } from '@/components/forms/useFormErrors'
import { Skeleton } from '@/components/ui/skeleton'
import { AccountLayout } from '@/features/account/components/AccountLayout'
import { useChangePassword, useProfile, useRemoveAvatar, useSetAvatar, useUpdateProfile } from '@/features/account/hooks'
import { useOrders } from '@/features/orders/hooks'
import { useFavorites, useNft } from '@/features/catalog/hooks'
import { errorMessage, toApiError } from '@/lib/api/errors'
import { eth, formatDate } from '@/lib/format'

export function ProfilePage() {
  const { data: user, isPending, isError, error, refetch } = useProfile()
  return (
    <AccountLayout title="Perfil do colecionador">
      {isPending ? (
        <div className="grid gap-6 md:grid-cols-2" aria-busy="true" aria-label="Carregando perfil">
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
        <>
          <ProfileForm user={user} />
          <Activity />
          <Favorites />
        </>
      )}
    </AccountLayout>
  )
}

const profileForm = z.object({
  name: profileUpdateSchema.shape.name.unwrap(),
  username: profileUpdateSchema.shape.username.unwrap(),
  email: profileUpdateSchema.shape.email.unwrap(),
  ensName: profileUpdateSchema.shape.ensName,
})

const passwordForm = passwordChangeSchema
  .extend({ confirmPassword: z.string() })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'As senhas não coincidem' })

const MAX_AVATAR_BYTES = 512 * 1024

function ProfileForm({ user }: { user: User }) {
  const formRef = useRef<HTMLFormElement>(null)
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const setAvatar = useSetAvatar()
  const removeAvatar = useRemoveAvatar()
  const profileErrors = useFormErrors(profileForm)
  const passwordErrors = useFormErrors(passwordForm)
  const [values, setValues] = useState({ name: user.name, username: user.username, email: user.email, ensName: user.ensName ?? '' })
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  // Se o perfil mudar no servidor (ex.: depois de salvar), o formulário acompanha.
  useEffect(() => {
    setValues({ name: user.name, username: user.username, email: user.email, ensName: user.ensName ?? '' })
  }, [user])

  const errors = { ...profileErrors.errors, ...passwordErrors.errors }
  const wantsPasswordChange = Boolean(pw.currentPassword || pw.newPassword || pw.confirmPassword)
  const saving = updateProfile.isPending || changePassword.isPending

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const profile = profileErrors.validate(values)
    const password = wantsPasswordChange ? passwordErrors.validate(pw) : null
    if (!profile || (wantsPasswordChange && !password)) return focusFirstError(formRef.current)

    try {
      await updateProfile.mutateAsync(profile)
    } catch (error) {
      profileErrors.fromApi(error)
      focusFirstError(formRef.current)
      return
    }
    if (password) {
      try {
        await changePassword.mutateAsync({ currentPassword: password.currentPassword, newPassword: password.newPassword })
        setPw({ currentPassword: '', newPassword: '', confirmPassword: '' })
        toast.success('Perfil e senha atualizados')
        return
      } catch (error) {
        passwordErrors.fromApi(error)
        focusFirstError(formRef.current)
        toast.error('Perfil salvo, mas a senha não foi alterada.')
        return
      }
    }
    toast.success('Perfil atualizado')
  }

  const onAvatar = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return toast.error('Use uma imagem PNG, JPG, WEBP ou GIF.')
    if (file.size > MAX_AVATAR_BYTES) return toast.error('A imagem precisa ter no máximo 512 KB.')
    const reader = new FileReader()
    reader.onload = () =>
      setAvatar.mutate(
        { dataUrl: String(reader.result) },
        { onSuccess: () => toast.success('Avatar atualizado'), onError: (err) => toast.error(errorMessage(err)) },
      )
    reader.readAsDataURL(file)
  }

  return (
    <form ref={formRef} onSubmit={(e) => void submit(e)} noValidate aria-label="Dados do perfil">
      {profileErrors.formError && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {profileErrors.formError}
        </p>
      )}
      <div className="grid gap-6 md:grid-cols-2 md:gap-x-7">
        <Field label="Nome de exibição" required error={errors.name}>
          {(p) => <input {...p} autoComplete="name" value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} className={inputClass} />}
        </Field>
        <Field label="Nome de usuário" required error={errors.username}>
          {(p) => <input {...p} autoComplete="username" value={values.username} onChange={(e) => setValues((v) => ({ ...v, username: e.target.value }))} className={inputClass} />}
        </Field>
        <Field label="E-mail" required error={errors.email}>
          {(p) => <input {...p} type="email" autoComplete="email" value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} className={inputClass} />}
        </Field>
        <Field label="Nome ENS" error={errors.ensName} hint="Opcional. Ex.: ana → ana.eth">
          {(p) => (
            <div className="flex gap-2">
              <span className="grid h-10 place-items-center rounded border border-input px-3 text-sm" aria-hidden>
                .eth
              </span>
              <input {...p} value={values.ensName} onChange={(e) => setValues((v) => ({ ...v, ensName: e.target.value }))} className={inputClass} />
            </div>
          )}
        </Field>

        <div className="md:col-start-2 md:row-start-3">
          <p className="mb-2 text-sm" id="avatar-label">
            Avatar
          </p>
          <div className="flex items-center gap-5" role="group" aria-labelledby="avatar-label">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="Seu avatar" width={50} height={50} className="size-[50px] rounded-full object-cover" />
            ) : (
              <span className="grid size-[50px] place-items-center rounded-full bg-secondary text-brand" aria-label="Sem avatar">
                <ImageIcon className="size-5" aria-hidden />
              </span>
            )}
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded bg-primary px-6 text-sm font-bold text-primary-foreground focus-within:outline-2 focus-within:outline-ring hover:bg-primary/90">
              {setAvatar.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Alterar
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onAvatar} className="sr-only" aria-label="Escolher imagem de avatar" />
            </label>
            <button
              type="button"
              disabled={!user.avatarUrl || removeAvatar.isPending}
              onClick={() =>
                removeAvatar.mutate(undefined, {
                  onSuccess: () => toast.success('Avatar removido'),
                  onError: (err) => toast.error(errorMessage(err)),
                })
              }
              className="text-sm hover:text-brand disabled:opacity-50"
            >
              Remover
            </button>
          </div>
        </div>
      </div>

      <fieldset className="mt-8 grid max-w-[417px] gap-5">
        <legend className="mb-4 font-bold">Alterar senha</legend>
        <Field label="Senha atual" error={errors.currentPassword}>
          {(p) => <PasswordInput {...p} autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw((v) => ({ ...v, currentPassword: e.target.value }))} />}
        </Field>
        <Field label="Nova senha" error={errors.newPassword} hint="Mínimo de 8 caracteres, com letras e números.">
          {(p) => <PasswordInput {...p} autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw((v) => ({ ...v, newPassword: e.target.value }))} />}
        </Field>
        <Field label="Confirmar nova senha" error={errors.confirmPassword}>
          {(p) => <PasswordInput {...p} autoComplete="new-password" value={pw.confirmPassword} onChange={(e) => setPw((v) => ({ ...v, confirmPassword: e.target.value }))} />}
        </Field>
      </fieldset>

      <button
        type="submit"
        disabled={saving}
        className="mt-8 flex h-10 items-center gap-2 rounded bg-primary px-10 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Salvar
      </button>
    </form>
  )
}

const STATUS_LABEL = { pending: 'Pendente', confirmed: 'Confirmado', rejected: 'Recusado' } as const

/** Atividade: pedidos do usuário (também serve para retomar um pedido pendente). */
function Activity() {
  const { data, isPending, isError, error } = useOrders()
  return (
    <section id="atividade" aria-labelledby="activity-title" className="mt-14 scroll-mt-6">
      <h2 id="activity-title" className="mb-4 font-bold">
        Atividade
      </h2>
      {isPending ? (
        <Skeleton className="h-20 w-full" />
      ) : isError ? (
        <p className="text-sm text-destructive">{toApiError(error).message}</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Você ainda não fez nenhum pedido.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {data.map((o) => (
            <li key={o.id}>
              <Link
                to="/orders/$orderId"
                params={{ orderId: o.id }}
                className="flex flex-wrap items-center justify-between gap-2 rounded bg-card px-4 py-3 text-sm hover:ring-1 hover:ring-primary"
              >
                <span className="font-bold">{o.id}</span>
                <span className="text-muted-foreground">{formatDate(o.createdAt)}</span>
                <span>{o.snapshot.items.length} item(ns)</span>
                <span className="font-bold text-brand">{eth(o.snapshot.totalEth)}</span>
                <span className={o.status === 'rejected' ? 'text-destructive' : o.status === 'confirmed' ? 'text-brand' : ''}>
                  {STATUS_LABEL[o.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Favorites() {
  const { data, isPending } = useFavorites()
  return (
    <section id="favoritos" aria-labelledby="favorites-title" className="mt-14 scroll-mt-6">
      <h2 id="favorites-title" className="mb-4 font-bold">
        Lista de interesse
      </h2>
      {isPending ? (
        <Skeleton className="h-20 w-full" />
      ) : !data?.nftIds.length ? (
        <p className="text-sm text-muted-foreground">
          Nenhum favorito ainda.{' '}
          <Link to="/" hash="mercado" className="text-brand underline">
            Explorar NFTs
          </Link>
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.nftIds.map((id) => (
            <FavoriteItem key={id} nftId={id} />
          ))}
        </ul>
      )}
    </section>
  )
}

function FavoriteItem({ nftId }: { nftId: string }) {
  const { data } = useNft(nftId)
  if (!data) return <Skeleton className="aspect-square w-full" />
  return (
    <li>
      <Link to="/nft/$nftId" params={{ nftId }} className="block rounded bg-card p-2 hover:ring-1 hover:ring-primary">
        <img src={data.image} alt="" width={200} height={200} loading="lazy" className="aspect-square w-full rounded object-cover" />
        <p className="mt-2 truncate text-sm">{data.name}</p>
        <p className="text-sm font-bold text-brand">{eth(data.priceFromEth)}</p>
      </Link>
    </li>
  )
}
