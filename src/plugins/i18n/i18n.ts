import { createI18n } from 'vue-i18n'
import ruMessages from '@/lang/ru.json'

const messages = {
  ru: ruMessages,
}

export const i18n = createI18n({
  legacy: false,
  warnHtmlMessage: false,
  locale: 'ru',
  messages,
})

export default i18n
