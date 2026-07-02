import { createI18n } from 'vue-i18n'
import app from '@/lang/app.json'
import calendar from '@/lang/calendar.json'
import championships from '@/lang/championships.json'
import common from '@/lang/common.json'
import cup from '@/lang/cup.json'
import dashboard from '@/lang/dashboard.json'
import league from '@/lang/league.json'
import leagueTable from '@/lang/leagueTable.json'
import match from '@/lang/match.json'
import nav from '@/lang/nav.json'
import router from '@/lang/router.json'
import selectClub from '@/lang/selectClub.json'
import squad from '@/lang/squad.json'
import transfers from '@/lang/transfers.json'
import academy from '@/lang/academy.json'

// РЕГИСТРИРУЕТ РУССКИЙ СЛОВАРЬ КАК ОСНОВНОЙ НАБОР ПЕРЕВОДОВ
const messages = {
  ru: {
    app,
    calendar,
    championships,
    common,
    cup,
    dashboard,
    league,
    leagueTable,
    match,
    nav,
    router,
    selectClub,
    squad,
    transfers,
    academy,
  },
}

// СОЗДАЁТ ГЛОБАЛЬНЫЙ ЭКЗЕМПЛЯР ЛОКАЛИЗАЦИИ В COMPOSITION-РЕЖИМЕ
export const i18n = createI18n({
  legacy: false,
  warnHtmlMessage: false,
  locale: 'ru',
  messages,
})

export type TranslationParams = Record<string, string | number>

// ПРЕДОСТАВЛЯЕТ ПЕРЕВОДЧИК МОДУЛЯМ, КОТОРЫЕ РАБОТАЮТ ВНЕ VUE-КОМПОНЕНТОВ
export const t = (key: string, params: TranslationParams = {}): string =>
  i18n.global.t(key, params)

export default i18n
