import { useRef, useState, type FormEvent } from 'react'
import { useRouter, useSearch } from '@tanstack/react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { signupSchema } from '@/contracts/auth'
import { Field, PasswordInput, inputClass } from '@/components/forms/Field'
import { focusFirstError, useFormErrors } from '@/components/forms/useFormErrors'
import { useSignup } from '@/features/auth/hooks'
import { AuthDialog, safeRedirect } from '@/features/auth/components/AuthDialog'

/** Campos do layout: nome de usuário, e-mail, senha e confirmação. */
const signupForm = z
  .object({
    username: signupSchema.shape.username.unwrap(),
    email: signupSchema.shape.email,
    password: signupSchema.shape.password,
    confirmPassword: z.string().min(1, 'Confirme a senha'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não coincidem',
  })

export function SignupPage() {
  const { redirect } = useSearch({ from: '/signup' })
  const router = useRouter()
  const signup = useSignup()
  const formRef = useRef<HTMLFormElement>(null)
  const { errors, formError, validate, fromApi } = useFormErrors(signupForm)
  const [values, setValues] = useState({ username: '', email: '', password: '', confirmPassword: '' })
  const set = (field: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [field]: e.target.value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const data = validate(values)
    if (!data) return focusFirstError(formRef.current)
    signup.mutate(
      { name: data.username, username: data.username, email: data.email, password: data.password },
      {
        onSuccess: () => {
          toast.success('Conta criada! Seu carrinho foi mantido.')
          router.history.push(safeRedirect(redirect))
        },
        onError: (error) => {
          fromApi(error)
          focusFirstError(formRef.current)
        },
      },
    )
  }

  const mobileInput = 'max-md:h-12 max-md:rounded-xl'

  return (
    <AuthDialog mode="signup" redirect={redirect} description="Crie seu perfil de colecionador e conecte uma carteira quando quiser.">
      <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-3">
        {formError && (
          <p role="alert" className="rounded border border-destructive/60 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        )}
        <Field label="Nome de usuário" hideLabel error={errors.username}>
          {(p) => (
            <input {...p} autoComplete="username" placeholder="Nome de usuário" value={values.username} onChange={set('username')} className={`${inputClass} ${mobileInput}`} />
          )}
        </Field>
        <Field label="E-mail" hideLabel error={errors.email}>
          {(p) => (
            <input {...p} type="email" autoComplete="email" placeholder="Digite seu e-mail" value={values.email} onChange={set('email')} className={`${inputClass} ${mobileInput}`} />
          )}
        </Field>
        <Field label="Senha" hideLabel error={errors.password} hint="Mínimo de 8 caracteres, com letras e números.">
          {(p) => (
            <PasswordInput {...p} autoComplete="new-password" placeholder="Senha" value={values.password} onChange={set('password')} className={mobileInput} />
          )}
        </Field>
        <Field label="Confirmar senha" hideLabel error={errors.confirmPassword}>
          {(p) => (
            <PasswordInput {...p} autoComplete="new-password" placeholder="Confirmar senha" value={values.confirmPassword} onChange={set('confirmPassword')} className={mobileInput} />
          )}
        </Field>
        <button
          type="submit"
          disabled={signup.isPending}
          className="mt-4 h-11 rounded bg-primary font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 max-md:h-14 max-md:rounded-xl"
        >
          {signup.isPending ? 'Criando…' : <><span className="md:hidden">Criar perfil</span><span className="max-md:hidden">Criar conta</span></>}
        </button>
      </form>
    </AuthDialog>
  )
}
