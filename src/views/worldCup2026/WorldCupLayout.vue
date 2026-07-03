<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { flagEmoji } from '@/data/nationalTeams/worldCup2026/teams'
import { useWorldCup2026Store } from '@/stores/worldCup2026/worldCup2026'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const worldCupStore = useWorldCup2026Store()

const navItems = [
  { name: 'world-cup-overview', labelKey: 'worldCup2026.nav.overview', path: '/world-cup-2026' },
  { name: 'world-cup-groups', labelKey: 'worldCup2026.nav.groups', path: '/world-cup-2026/groups' },
  {
    name: 'world-cup-fixtures',
    labelKey: 'worldCup2026.nav.fixtures',
    path: '/world-cup-2026/fixtures',
  },
  {
    name: 'world-cup-bracket',
    labelKey: 'worldCup2026.nav.bracket',
    path: '/world-cup-2026/bracket',
  },
]

const selectedTeam = computed(() => worldCupStore.selectedTeam)

const resetToMenu = (): void => {
  worldCupStore.resetTournament()
  void router.push({ name: 'select-mode' })
}
</script>

<template>
  <div class="min-h-screen bg-[#07101f] text-white">
    <header class="border-b border-white/10 bg-[#0a1628]/95 backdrop-blur-md">
      <div class="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div class="flex items-center gap-3">
          <span v-if="selectedTeam" class="text-3xl">{{ flagEmoji(selectedTeam.flagCode) }}</span>
          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.25em] text-amber-300/80">
              {{ t('worldCup2026.overview.title') }}
            </p>
            <h1 class="text-lg font-black uppercase sm:text-xl">
              {{ selectedTeam?.name }}
            </h1>
          </div>
        </div>
        <button
          type="button"
          class="text-sm font-bold text-slate-400 transition hover:text-white"
          @click="resetToMenu"
        >
          {{ t('worldCup2026.overview.mainMenu') }}
        </button>
      </div>

      <nav class="mx-auto flex max-w-[1600px] gap-1 overflow-x-auto px-4 pb-3 sm:px-6">
        <RouterLink
          v-for="item in navItems"
          :key="item.name"
          :to="item.path"
          class="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition"
          :class="
            route.name === item.name
              ? 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/40'
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
          "
        >
          {{ t(item.labelKey) }}
        </RouterLink>
      </nav>
    </header>

    <main class="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
      <RouterView />
    </main>
  </div>
</template>
