export { StandardLabel } from './standard'

export const LAYOUTS = {
  standard: 'Standard',
  compact: 'Compatto',
  detailed: 'Dettagliato'
} as const

export type LayoutType = keyof typeof LAYOUTS 