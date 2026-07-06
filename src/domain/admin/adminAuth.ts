const ADMIN_SESSION_KEY = 'fm-simulator-admin-session'

const configuredLogin = (): string => import.meta.env.VITE_ADMIN_LOGIN?.trim() ?? ''
const configuredPassword = (): string => import.meta.env.VITE_ADMIN_PASSWORD ?? ''

const readSessionStorage = (): Storage | undefined => {
  try {
    return typeof window === 'undefined' ? undefined : window.sessionStorage
  } catch {
    return undefined
  }
}

export const isAdminConfigured = (): boolean =>
  configuredLogin().length > 0 && configuredPassword().length > 0

export const authenticateAdmin = (login: string, password: string): boolean => {
  const authenticated =
    isAdminConfigured() && login.trim() === configuredLogin() && password === configuredPassword()
  if (authenticated) readSessionStorage()?.setItem(ADMIN_SESSION_KEY, 'authenticated')
  return authenticated
}

export const isAdminAuthenticated = (): boolean =>
  isAdminConfigured() && readSessionStorage()?.getItem(ADMIN_SESSION_KEY) === 'authenticated'

export const logoutAdmin = (): void => {
  readSessionStorage()?.removeItem(ADMIN_SESSION_KEY)
}
