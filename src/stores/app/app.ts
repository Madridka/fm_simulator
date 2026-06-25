import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import i18n from '@/plugins/i18n/i18n'
import type { AppNavItem } from '@/stores/app/types'

export const useAppStore = defineStore('app', () => {
  const t = (key: string): string => i18n.global.t(key)

  const settingsOpen = ref(false)
  const drawerVisible = ref(false)

  const navItems = computed<AppNavItem[]>(() => [
    { to: '/dashboard', label: t('nav.overview'), icon: 'home' },
    { divider: true },
    { to: '/squad', label: t('nav.squad'), icon: 'users' },
    { to: '/transfers', label: t('nav.transfers'), icon: 'swap' },
    { divider: true },
    { to: '/calendar', label: t('nav.calendar'), icon: 'calendar' },
    { divider: true },
    { to: '/league', label: t('nav.league'), icon: 'table' },
    { to: '/cup', label: t('nav.cup'), icon: 'trophy' },
  ])

  const openDrawer = (): void => {
    drawerVisible.value = true
  }

  const closeSettings = (): void => {
    settingsOpen.value = false
  }

  const toggleSettings = (): void => {
    settingsOpen.value = !settingsOpen.value
  }

  const closeNavigation = (): void => {
    settingsOpen.value = false
    drawerVisible.value = false
  }

  return {
    settingsOpen,
    drawerVisible,
    navItems,
    openDrawer,
    closeSettings,
    toggleSettings,
    closeNavigation,
  }
})
