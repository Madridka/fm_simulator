// МОДЕЛЬ ПУНКТОВ И РАЗДЕЛИТЕЛЕЙ ГЛАВНОЙ НАВИГАЦИИ
export type AppNavIcon =
  | 'home'
  | 'users'
  | 'academy'
  | 'swap'
  | 'table'
  | 'calendar'
  | 'tasks'
  | 'trophy'
  | 'medal'

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
