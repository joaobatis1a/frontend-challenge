import { Outlet } from '@tanstack/react-router'
import { usePrivateCacheCleanup, useSessionCheck } from '@/features/auth/hooks'

// Provisório: cabeçalho, rodapé e avisos entram quando os prints do Figma chegarem.
export function RootLayout() {
  useSessionCheck()
  usePrivateCacheCleanup()
  return (
    <main id="conteudo">
      <Outlet />
    </main>
  )
}
