import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app/app'
import type { AppNavItem } from '@/stores/app/types'
import { useCareerContext } from '@/composables/useCareerContext'

export const useCareerNavigation = () => {
  const appStore = useAppStore()
  const { isWorldCupMode, paths } = useCareerContext()
  const { t } = useI18n()

  const navItems = computed<AppNavItem[]>(() => {
    if (isWorldCupMode.value) {
      return [
        { to: paths.value.dashboard, label: t('nav.overview'), icon: 'home' },
        { divider: true },
        { to: paths.value.squad, label: t('nav.squad'), icon: 'users' },
        { to: paths.value.squadRegistration, label: t('worldCup2026.nav.squadRegistration'), icon: 'academy' },
        { divider: true },
        { to: paths.value.calendar, label: t('nav.calendar'), icon: 'calendar' },
        { divider: true },
        { to: paths.value.fixtures, label: t('worldCup2026.nav.fixtures'), icon: 'swap' },
        { to: paths.value.groups, label: t('worldCup2026.nav.groups'), icon: 'table' },
        { to: paths.value.bracket, label: t('worldCup2026.nav.bracket'), icon: 'trophy' },
      ]
    }

    return appStore.navItems
  })

  return { navItems }
}
