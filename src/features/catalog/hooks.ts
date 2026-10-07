import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CatalogSearch, FavoritesResponse } from '@/contracts/nft'
import { api } from '@/lib/api/endpoints'
import { keys } from '@/lib/query/keys'
import { useAuth, useOwner } from '@/features/auth/hooks'

/**
 * Catálogo. Cada combinação de filtros tem sua própria chave: uma resposta
 * atrasada de uma busca antiga cai na chave antiga e nunca aparece na tela.
 * O `signal` cancela a requisição anterior quando os filtros mudam.
 */
export function useCatalog(search: CatalogSearch) {
  return useQuery({
    queryKey: keys.nfts.list(search),
    queryFn: ({ signal }) => api.nfts.list(search, { signal }),
    // Mantém a página anterior visível enquanto a nova carrega (sem piscar).
    placeholderData: keepPreviousData,
  })
}

export function useFeatured() {
  return useQuery({
    queryKey: keys.nfts.featured(),
    queryFn: ({ signal }) => api.nfts.featured({ signal }),
  })
}

export function useNft(id: string) {
  return useQuery({
    queryKey: keys.nfts.detail(id),
    queryFn: ({ signal }) => api.nfts.detail(id, { signal }),
  })
}

export function useFavorites() {
  const owner = useOwner()
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: keys.favorites(owner),
    queryFn: ({ signal }) => api.favorites.list({ signal }),
    enabled: isAuthenticated,
  })
}

/**
 * Favoritar com atualização otimista: o coração muda na hora e, se a API
 * falhar, volta ao estado anterior (rollback).
 */
export function useToggleFavorite() {
  const qc = useQueryClient()
  const owner = useOwner()
  const key = keys.favorites(owner)

  return useMutation({
    mutationFn: ({ nftId, favorite }: { nftId: string; favorite: boolean }) =>
      favorite ? api.favorites.add(nftId) : api.favorites.remove(nftId),
    onMutate: async ({ nftId, favorite }) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<FavoritesResponse>(key)
      qc.setQueryData<FavoritesResponse>(key, (old) => {
        const ids = new Set(old?.nftIds ?? [])
        if (favorite) ids.add(nftId)
        else ids.delete(nftId)
        return { nftIds: [...ids] }
      })
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous)
    },
    onSuccess: (data) => qc.setQueryData(key, data),
  })
}
