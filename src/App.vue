<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import ClubBadge from '@/components/ClubBadge.vue'
import { useGameStore } from '@/stores/gameStore'

const gameStore = useGameStore()
const router = useRouter()
const settingsOpen = ref(false)

const navItems = [
  { to: '/dashboard', label: 'Обзор' },
  { to: '/squad', label: 'Состав' },
  { to: '/competitions', label: 'Турниры' },
  { to: '/calendar', label: 'Календарь' },
  { to: '/transfers', label: 'Трансферы' },
]

const hasGame = computed(() => Boolean(gameStore.game))

const reset = (): void => {
  settingsOpen.value = false
  gameStore.resetGame()
  void router.push('/select-club')
}
</script>

<template>
  <div
    class="relative min-h-screen min-w-[320px] overflow-x-hidden bg-[linear-gradient(135deg,rgba(11,93,70,0.14),transparent_34%),linear-gradient(180deg,#f7faf6_0%,#e7f0ea_48%,#dfe9e3_100%)] font-sans text-[#172033] before:pointer-events-none before:fixed before:inset-0 before:-z-10 before:bg-[linear-gradient(90deg,rgba(28,120,86,0.08)_1px,transparent_1px),linear-gradient(rgba(28,120,86,0.05)_1px,transparent_1px)] before:bg-[length:48px_48px] before:[mask-image:linear-gradient(180deg,rgba(0,0,0,0.88),rgba(0,0,0,0.14))]"
  >
    <header
      v-if="hasGame"
      class="sticky top-0 z-30 border-b border-emerald-950/30 bg-gradient-to-r from-emerald-950 via-slate-950 to-emerald-900 shadow-[0_18px_40px_rgba(15,47,44,0.24)]"
    >
      <div
        class="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <RouterLink
          to="/dashboard"
          class="flex w-fit items-center gap-3 rounded-lg px-2 py-1 transition hover:-translate-y-px hover:bg-white/15"
          @click="settingsOpen = false"
        >
          <ClubBadge v-if="gameStore.selectedClub" :club="gameStore.selectedClub" />
          <div>
            <div class="text-sm font-medium text-emerald-50/80">Сезон {{ gameStore.game?.season }}</div>
            <div class="font-semibold text-white">{{ gameStore.selectedClub?.name }}</div>
          </div>
        </RouterLink>

        <div class="flex flex-wrap items-center gap-2">
          <nav class="flex flex-wrap items-center gap-2">
            <RouterLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="rounded-md px-3 py-2 text-sm font-semibold text-emerald-50/90 transition hover:bg-white/15 hover:text-white"
              active-class="bg-lime-300 text-emerald-950 shadow-sm hover:bg-lime-300 hover:text-emerald-950"
              @click="settingsOpen = false"
            >
              {{ item.label }}
            </RouterLink>
          </nav>

          <div class="relative">
            <button
              type="button"
              class="inline-grid h-10 w-10 place-items-center rounded-lg border border-emerald-50/30 bg-white/10 text-emerald-50 shadow-sm hover:bg-white/20"
              aria-label="Настройки"
              :aria-expanded="settingsOpen"
              @click="settingsOpen = !settingsOpen"
            >
              <span class="flex flex-col gap-1">
                <span class="block h-0.5 w-4 rounded-full bg-current"></span>
                <span class="block h-0.5 w-4 rounded-full bg-current"></span>
                <span class="block h-0.5 w-4 rounded-full bg-current"></span>
              </span>
            </button>
            <div
              v-if="settingsOpen"
              class="absolute right-0 top-[calc(100%+8px)] z-20 min-w-[180px] overflow-hidden rounded-lg border border-slate-400/30 bg-white/95 shadow-[0_22px_50px_rgba(15,23,42,0.18)]"
            >
              <div class="px-3 py-2 text-xs font-semibold uppercase text-slate-500">Настройки</div>
              <button
                type="button"
                class="w-full px-3 py-2.5 text-left text-sm font-bold text-rose-800 hover:bg-rose-50"
                @click="reset"
              >
                Новая игра
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-6">
      <RouterView />
    </main>
  </div>
</template>
