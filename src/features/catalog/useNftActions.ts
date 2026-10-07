import { useNavigate, useRouterState } from '@tanstack/react-router'
import { toast } from 'sonner'
import { errorMessage } from '@/lib/api/errors'
import { useAuth } from '@/features/auth/hooks'
import { useAddToCart } from '@/features/cart/hooks'
import { useFavorites, useToggleFavorite } from './hooks'

/** Favoritar exige conta: sem sessão, leva ao login e volta para a mesma página. */
export function useFavoriteAction(nftId: string) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const href = useRouterState({ select: (s) => s.location.href })
  const { data } = useFavorites()
  const mutation = useToggleFavorite()
  const isFavorite = Boolean(data?.nftIds.includes(nftId))

  const toggle = () => {
    if (!isAuthenticated) {
      toast.info('Entre na sua conta para salvar favoritos.')
      void navigate({ to: '/login', search: { redirect: href } })
      return
    }
    const favorite = !isFavorite
    mutation.mutate(
      { nftId, favorite },
      {
        onSuccess: () => toast.success(favorite ? 'Adicionado aos favoritos' : 'Removido dos favoritos'),
        // A atualização otimista já foi desfeita no hook; aqui só avisamos.
        onError: (error) => toast.error(`${errorMessage(error)} O favorito voltou ao estado anterior.`),
      },
    )
  }

  return { isFavorite, toggle, isPending: mutation.isPending }
}

export function useQuickAdd() {
  const add = useAddToCart()
  return {
    isPending: add.isPending,
    addToCart: (nftId: string, editionId: string, name: string, quantity = 1) =>
      add.mutate(
        { nftId, editionId, quantity },
        {
          onSuccess: () => toast.success(`${name} adicionado ao carrinho`),
          onError: (error) => toast.error(errorMessage(error)),
        },
      ),
  }
}
