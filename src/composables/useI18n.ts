import { readonly, ref } from 'vue'
import { messages, type Locale } from '@/i18n/messages'

const currentLocale = ref<Locale>('ru')

type InterpolationValue = string | number

const readMessage = (locale: Locale, key: string): string => {
  const value = key.split('.').reduce<unknown>((node, segment) => {
    if (!node || typeof node !== 'object') {
      return undefined
    }

    return (node as Record<string, unknown>)[segment]
  }, messages[locale])

  return typeof value === 'string' ? value : key
}

const interpolate = (message: string, params: Record<string, InterpolationValue> = {}): string =>
  message.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? `{${key}}`))

export const useI18n = () => {
  const t = (key: string, params?: Record<string, InterpolationValue>): string =>
    interpolate(readMessage(currentLocale.value, key), params)

  const setLocale = (locale: Locale): void => {
    currentLocale.value = locale
  }

  return {
    locale: readonly(currentLocale),
    setLocale,
    t,
  }
}