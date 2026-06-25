import { championshipTranslations } from '@/i18n/championships'
import { appMessages } from '@/i18n/messages/app'
import { commonMessages } from '@/i18n/messages/common'
import { dashboardMessages } from '@/i18n/messages/dashboard'
import { leagueTableMessages } from '@/i18n/messages/leagueTable'
import { matchMessages } from '@/i18n/messages/match'
import { navMessages } from '@/i18n/messages/nav'

export const messages = {
  ru: {
    app: appMessages,
    nav: navMessages,
    common: commonMessages,
    match: matchMessages,
    dashboard: dashboardMessages,
    leagueTable: leagueTableMessages,
    championships: championshipTranslations,
  },
} as const

export type Locale = keyof typeof messages
