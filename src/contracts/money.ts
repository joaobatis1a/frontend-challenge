import Decimal from 'decimal.js'

// ETH trafega como string decimal (nunca como number) e é calculado com
// decimal.js para não perder precisão: 0.1 + 0.2 em number não dá 0.3.
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP })

export type Eth = string

const ETH_DECIMALS = 18

const toDecimal = (value: Decimal.Value): Decimal => new Decimal(value)

export const ethAdd = (a: Eth, b: Eth): Eth =>
  toDecimal(a).plus(b).toDecimalPlaces(ETH_DECIMALS).toFixed()

export const ethSub = (a: Eth, b: Eth): Eth =>
  toDecimal(a).minus(b).toDecimalPlaces(ETH_DECIMALS).toFixed()

export const ethMul = (a: Eth, quantity: number | string): Eth =>
  toDecimal(a).times(quantity).toDecimalPlaces(ETH_DECIMALS).toFixed()

/** `percent` em pontos percentuais: 10 significa 10%. */
export const ethPercent = (a: Eth, percent: number | string): Eth =>
  toDecimal(a).times(percent).div(100).toDecimalPlaces(ETH_DECIMALS).toFixed()

export const ethEquals = (a: Eth, b: Eth): boolean => toDecimal(a).equals(b)

export const ethGt = (a: Eth, b: Eth): boolean => toDecimal(a).greaterThan(b)

export const ethIsValid = (value: string): boolean => {
  if (!/^\d+(\.\d+)?$/.test(value)) return false
  return toDecimal(value).decimalPlaces() <= ETH_DECIMALS
}

export const ZERO_ETH: Eth = '0'

/** Formata para exibição, sem arredondar o valor guardado. Ex.: "1.25 ETH". */
export function formatEth(value: Eth, maxDecimals = 4): string {
  const d = toDecimal(value)
  const shown = d.toDecimalPlaces(maxDecimals, Decimal.ROUND_DOWN)
  const text = shown.isZero() && !d.isZero() ? `<${new Decimal(10).pow(-maxDecimals).toFixed()}` : shown.toFixed()
  return `${text} ETH`
}
