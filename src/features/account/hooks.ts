import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AvatarInput, PasswordChangeInput, ProfileUpdateInput, User } from '@/contracts/auth'
import type { WalletCreateInput, WalletUpdateInput } from '@/contracts/wallets'
import { api } from '@/lib/api/endpoints'
import { keys } from '@/lib/query/keys'
import { sessionStore } from '@/lib/session/store'
import { useAuth, useOwner } from '@/features/auth/hooks'

export function useProfile() {
  const owner = useOwner()
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: keys.profile(owner),
    queryFn: ({ signal }) => api.profile.get({ signal }),
    enabled: isAuthenticated,
  })
}

/** Grava o usuário atualizado no cache e na sessão (cabeçalho, avatar). */
function useProfileMutation<TVars>(fn: (vars: TVars) => Promise<User>) {
  const qc = useQueryClient()
  const owner = useOwner()
  return useMutation({
    mutationFn: fn,
    onSuccess: (user) => {
      qc.setQueryData(keys.profile(owner), user)
      sessionStore.updateUser(user)
    },
  })
}

export const useUpdateProfile = () => useProfileMutation((input: ProfileUpdateInput) => api.profile.update(input))
export const useSetAvatar = () => useProfileMutation((input: AvatarInput) => api.profile.setAvatar(input))
export const useRemoveAvatar = () => useProfileMutation((_: void) => api.profile.removeAvatar())

export function useChangePassword() {
  return useMutation({ mutationFn: (input: PasswordChangeInput) => api.profile.changePassword(input) })
}

export function useWallets(enabled = true) {
  const owner = useOwner()
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: keys.wallets(owner),
    queryFn: ({ signal }) => api.wallets.list({ signal }),
    enabled: isAuthenticated && enabled,
  })
}

function useWalletMutation<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>) {
  const qc = useQueryClient()
  const owner = useOwner()
  return useMutation({
    mutationFn: fn,
    onSettled: () => qc.invalidateQueries({ queryKey: keys.wallets(owner) }),
  })
}

export const useCreateWallet = () => useWalletMutation((input: WalletCreateInput) => api.wallets.create(input))
export const useUpdateWallet = () =>
  useWalletMutation(({ id, input }: { id: string; input: WalletUpdateInput }) => api.wallets.update(id, input))
export const useRemoveWallet = () => useWalletMutation((id: string) => api.wallets.remove(id))
export const useConnectWallet = () => useWalletMutation((id: string) => api.wallets.connect(id))
export const useDisconnectWallet = () => useWalletMutation((id: string) => api.wallets.disconnect(id))
