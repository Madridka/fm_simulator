<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import ClubBadge from '@/components/ClubBadge.vue'
import { useClubStore } from '@/stores/clubStore'
import { useGameStore } from '@/stores/gameStore'

const gameStore = useGameStore()
const clubStore = useClubStore()
const route = useRoute()
const router = useRouter()
const settingsOpen = ref(false)

const hasGame = computed(() => Boolean(gameStore.game))
const nextMatch = computed(() => gameStore.nextMatch)
const nextOpponent = computed(() => {
  const match = nextMatch.value
  const game = gameStore.game
  if (!match || !game) return undefined
  const id = match.homeClubId === game.selectedClubId ? match.awayClubId : match.homeClubId
  return clubStore.getClubById(id)
})

const navItems = [
  { to: '/dashboard', label: 'Обзор', icon: 'home' },
  { divider: true },
  { to: '/squad', label: 'Состав', icon: 'users' },
  { to: '/transfers', label: 'Трансферы', icon: 'swap' },
  { divider: true },
  { to: '/league', label: 'Лига', icon: 'table' },
  { to: '/cup', label: 'Кубок', icon: 'trophy' },
]

const isActive = (item: (typeof navItems)[number]): boolean => {
  if (!item.to) return false
  return route.path === item.to
}

const openNextMatch = (): void => {
  if (!nextMatch.value) return
  gameStore.openMatch(nextMatch.value.id)
  void router.push('/match')
}

const reset = (): void => {
  settingsOpen.value = false
  gameStore.resetGame()
  void router.push('/select-club')
}
</script>

<template>
  <div class="min-h-screen min-w-[320px] bg-[#eef2f0] font-sans text-slate-900">
    <template v-if="hasGame">
      <aside class="fixed inset-y-0 left-0 z-40 hidden w-[228px] flex-col border-r border-white/10 bg-[#101c19] text-white shadow-[14px_0_40px_rgba(4,18,14,0.18)] md:flex">
        <RouterLink to="/dashboard" class="flex h-[86px] items-center gap-3 border-b border-white/10 px-5">
          <ClubBadge v-if="gameStore.selectedClub" :club="gameStore.selectedClub" />
          <div class="min-w-0">
            <div class="truncate text-sm font-black tracking-tight">{{ gameStore.selectedClub?.shortName }}</div>
            <div class="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-emerald-200/60">FM Simulator</div>
          </div>
        </RouterLink>

        <nav class="flex-1 px-3 py-5">
          <template v-for="(item, index) in navItems" :key="item.to ?? `divider-${index}`">
            <div v-if="item.divider" class="mx-3 my-3 h-px bg-white/10"></div>
            <RouterLink
              v-else-if="item.to"
              :to="item.to"
              class="group mb-1 flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold text-slate-300 transition hover:bg-white/7 hover:text-white"
              :class="isActive(item) ? 'bg-emerald-400/15 text-emerald-300 shadow-[inset_3px_0_0_#34d399]' : ''"
              @click="settingsOpen = false"
            >
              <svg v-if="item.icon === 'home'" class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></svg>
              <svg v-else-if="item.icon === 'users'" class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a5 5 0 0 1 10 0v2M16 4a3 3 0 0 1 0 6M15 14a5 5 0 0 1 6 4v2"/></svg>
              <svg v-else-if="item.icon === 'swap'" class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 7h13m-4-4 4 4-4 4M17 17H4m4 4-4-4 4-4"/></svg>
              <svg v-else-if="item.icon === 'table'" class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 9v11M16 9v11"/></svg>
              <svg v-else class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 13v4m-4 3h8"/></svg>
              <span>{{ item.label }}</span>
            </RouterLink>
          </template>
        </nav>

        <div class="relative border-t border-white/10 p-3">
          <button type="button" class="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white" :aria-expanded="settingsOpen" @click="settingsOpen = !settingsOpen">
            <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 8.96 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3v-4h.08A1.7 1.7 0 0 0 4.6 8.96a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.03-1.56V3h4v.08A1.7 1.7 0 0 0 15.04 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.26.62.86 1.03 1.56 1.03H21v4h-.08A1.7 1.7 0 0 0 19.4 15z"/></svg>
            <span>Меню</span>
            <svg class="ml-auto h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          <div v-if="settingsOpen" class="absolute bottom-3 left-[calc(100%+10px)] w-48 rounded-xl border border-slate-200 bg-white p-2 text-slate-900 shadow-2xl">
            <div class="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Игра</div>
            <button type="button" class="w-full rounded-lg px-3 py-2.5 text-left text-sm font-bold text-rose-700 hover:bg-rose-50" @click="reset">Новая игра</button>
          </div>
        </div>
      </aside>

      <div class="min-h-screen md:pl-[228px]">
        <header class="sticky top-0 z-30 border-b border-slate-200/90 bg-white/90 backdrop-blur-xl">
          <div class="flex min-h-[86px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <RouterLink to="/dashboard" class="flex min-w-0 items-center gap-3 md:gap-4">
              <ClubBadge v-if="gameStore.selectedClub" :club="gameStore.selectedClub" class="md:hidden" />
              <div class="min-w-0">
                <div class="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Сезон {{ gameStore.game?.season }}</div>
                <div class="truncate text-lg font-black tracking-tight text-slate-950 sm:text-xl">{{ gameStore.selectedClub?.name }}</div>
              </div>
            </RouterLink>

            <button v-if="nextMatch && nextOpponent" type="button" class="group flex shrink-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-emerald-300 hover:bg-emerald-50 sm:px-4" @click="openNextMatch">
              <div class="hidden text-right sm:block">
                <div class="text-[10px] font-black uppercase tracking-wider text-slate-400">Следующий матч</div>
                <div class="text-sm font-extrabold text-slate-900">{{ nextOpponent.shortName }} · {{ nextMatch.type === 'league' ? `тур ${nextMatch.round}` : 'кубок' }}</div>
              </div>
              <ClubBadge :club="nextOpponent" size="sm" />
              <span class="grid h-8 w-8 place-items-center rounded-full bg-emerald-500 text-white transition group-hover:translate-x-0.5">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m9 18 6-6-6-6"/></svg>
              </span>
            </button>
          </div>

          <nav class="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 md:hidden">
            <template v-for="(item, index) in navItems" :key="item.to ?? `mobile-divider-${index}`">
              <RouterLink v-if="item.to" :to="item.to" class="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold text-slate-500" :class="isActive(item) ? 'bg-emerald-100 text-emerald-800' : ''">{{ item.label }}</RouterLink>
            </template>
            <button class="rounded-lg px-3 py-2 text-xs font-bold text-rose-600" @click="reset">Новая игра</button>
          </nav>
        </header>

        <main class="min-h-[calc(100dvh-86px)] p-4 sm:p-6 lg:p-8">
          <RouterView />
        </main>
      </div>
    </template>

    <main v-else class="min-h-screen p-4 sm:p-6">
      <RouterView />
    </main>
  </div>
</template>
