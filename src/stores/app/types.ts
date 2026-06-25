export type AppNavIcon = 'home' | 'users' | 'swap' | 'table' | 'calendar' | 'trophy'

export interface AppNavRouteItem {
  to: string
  label: string
  icon: AppNavIcon
  divider?: false
}

export interface AppNavDividerItem {
  divider: true
  to?: never
  label?: never
  icon?: never
}

export type AppNavItem = AppNavRouteItem | AppNavDividerItem
