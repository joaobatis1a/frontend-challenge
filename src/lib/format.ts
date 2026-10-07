import { formatEth } from '@/contracts/money'
import type { Eth } from '@/contracts/money'

export { formatEth }

/** Preço sem arredondar para cima: "1.19 ETH". Até 4 casas, como no layout. */
export const eth = (value: Eth): string => formatEth(value, 4)

/** "0xA91F…E82C" */
export function shortAddress(address: string): string {
  if (address.length <= 12) return address
  return `0x${address.slice(2, 6).toUpperCase()}…${address.slice(-4).toUpperCase()}`
}

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

/** "29 jul. 2026" */
export const formatDate = (iso: string): string => dateFmt.format(new Date(iso))
