import { createI18n, type I18n } from 'vue-i18n'
import ruMessages from '@/lang/ru.json'

const messages = {
  ru: ruMessages,
}

export const i18n: I18n = createI18n({
  legacy: false,
  warnHtmlMessage: false,
  locale: 'ru',
  messages,
})

export default i18n
