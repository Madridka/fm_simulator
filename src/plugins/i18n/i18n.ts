import { createI18n } from 'vue-i18n'
import ruMessages from '@/lang/ru.json'

// РЕГИСТРИРУЕТ РУССКИЙ СЛОВАРЬ КАК ОСНОВНОЙ НАБОР ПЕРЕВОДОВ
const messages = {
  ru: ruMessages,
}

// СОЗДАЁТ ГЛОБАЛЬНЫЙ ЭКЗЕМПЛЯР ЛОКАЛИЗАЦИИ В COMPOSITION-РЕЖИМЕ
export const i18n = createI18n({
  legacy: false,
  warnHtmlMessage: false,
  locale: 'ru',
  messages,
})

export default i18n
