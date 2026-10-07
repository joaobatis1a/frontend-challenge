import { useRef, useState, type FormEvent } from 'react'
import { useRouter, useSearch } from '@tanstack/react-router'
import { toast } from 'sonner'
import { loginSchema } from '@/contracts/auth'
import { Field, PasswordInput, inputClass } from '@/components/forms/Field'
import { focusFirstError, useFormErrors } from '@/components/forms/useFormErrors'
import { comingSoon } from '@/components/layout/comingSoon'
import { useLogin } from '@/features/auth/hooks'
import { AuthDialog, safeRedirect } from '@/features/auth/components/AuthDialog'

const loginForm = loginSchema.omit({ guestCartId: true })

export function LoginPage() {
  const { redirect } = useSearch({ from: '/login' })
  const router = useRouter()
  const login = useLogin()
  const formRef = useRef<HTMLFormElement>(null)
  const { errors, formError, validate, fromApi } = useFormErrors(loginForm)
  const [values, setValues] = useState({ email: '', password: '' })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const data = validate(values)
    if (!data) return focusFirstError(formRef.current)
    login.mutate(data, {
      onSuccess: ({ user }) => {
        toast.success(`Bem-vindo de volta, ${user.name.split(' ')[0]}!`)
        // Retorno ao fluxo anterior (ex.: checkout), preservando a busca da URL.
        router.history.push(safeRedirect(redirect))
      },
      onError: (error) => {
        fromApi(error)
        focusFirstError(formRef.current)
      },
    })
  }

  return (
    <AuthDialog mode="login" redirect={redirect} description="Entre para gerenciar sua carteira, coleção e perfil de criador.">
      <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-3">
        {formError && (
          <p role="alert" className="rounded border border-destructive/60 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        )}
        <Field label="E-mail" hideLabel error={errors.email}>
          {(p) => (
            <input
              {...p}
              type="email"
              autoComplete="email"
              placeholder="contato@email.com"
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
              className={`${inputClass} max-md:h-12 max-md:rounded-xl`}
            />
          )}
        </Field>
        <Field label="Senha" hideLabel error={errors.password}>
          {(p) => (
            <PasswordInput
              {...p}
              autoComplete="current-password"
              placeholder="Senha"
              value={values.password}
              onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
              className="max-md:h-12 max-md:rounded-xl"
            />
          )}
        </Field>
        <button
          type="button"
          onClick={() => comingSoon('A recuperação de senha')}
          className="self-end text-sm text-brand hover:underline"
        >
          Esqueceu a senha?
        </button>
        <button
          type="submit"
          disabled={login.isPending}
          className="mt-4 h-11 rounded bg-primary font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 max-md:h-14 max-md:rounded-xl"
        >
          {login.isPending ? 'Entrando…' : 'Entrar'}
        </button>
        <p className="text-center text-[11px] text-subtle">Demonstração: ana@example.com / Senha@123</p>
      </form>
    </AuthDialog>
  )
}
