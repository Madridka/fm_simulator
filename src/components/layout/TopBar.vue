<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { Club, Match } from '@/types/football'

import ClubBadge from '@/components/ui/ClubBadge.vue'
import IconSymbol from '@/components/ui/IconSymbol.vue'

const props = defineProps<{
  nextMatch?: Match
  nextOpponent?: Club
  season?: number
  selectedClub?: Club
  teamFlag?: string
  teamFlagUrl?: string
  isWorldCupMode?: boolean
  dashboardPath?: string
}>()

const emit = defineEmits<{
  openNextMatch: []
  openMenu: []
}>()

const { t } = useI18n()

// ВОЗВРАЩАЕТ НАЗВАНИЕ ТУРНИРА СЛЕДУЮЩЕГО МАТЧА
const matchCompetition = (match: Match): string => {
  if (props.isWorldCupMode) {
    if (match.type === 'playoff') {
      return t('match.playoff')
    }
    return t('worldCup2026.overview.matchday', {
      current: match.roundNumber ?? match.round,
      total: 3,
    })
  }

  return match.type === 'league'
    ? t('match.round', { round: match.roundNumber ?? match.round })
    : match.type === 'playoff'
      ? t('match.playoff')
      : t('match.cup')
}
</script>

<template>
  <!-- ВЕРХНЯЯ ПАНЕЛЬ ПРИЛОЖЕНИЯ -->
  <header class="sticky top-0 z-30 border-b border-slate-200/90 bg-white/90 backdrop-blur-xl">
    <!-- КЛУБ И БЫСТРЫЕ ДЕЙСТВИЯ -->
    <div class="flex min-h-[86px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
      <div class="flex min-w-0 items-center gap-3">
        <button
          type="button"
          class="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 md:hidden"
          :aria-label="t('app.openMenu')"
          @click="emit('openMenu')"
        >
          <IconSymbol name="menu" class="h-5 w-5" />
        </button>

        <RouterLink :to="props.dashboardPath ?? '/dashboard'" class="flex min-w-0 items-center gap-3 md:gap-4">
          <img
            v-if="props.teamFlagUrl"
            :src="props.teamFlagUrl"
            :alt="selectedClub?.name ?? ''"
            class="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-slate-200 bg-white object-cover md:hidden"
          />
          <span
            v-else-if="props.teamFlag"
            class="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-slate-200 bg-white text-xl md:hidden"
          >
            {{ props.teamFlag }}
          </span>
          <ClubBadge v-else-if="selectedClub" :club="selectedClub" class="md:hidden" />
          <div class="min-w-0">
            <div class="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
              {{
                props.isWorldCupMode
                  ? t('worldCup2026.overview.title')
                  : t('app.season', { season: season ?? '' })
              }}
            </div>
            <div class="truncate text-lg font-black tracking-tight text-slate-950 sm:text-xl">
              {{ selectedClub?.name }}
            </div>
          </div>
        </RouterLink>
      </div>

      <!-- КАРТОЧКА СЛЕДУЮЩЕГО МАТЧА -->
      <button
        v-if="nextMatch && nextOpponent"
        type="button"
        class="group flex shrink-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-emerald-300 hover:bg-emerald-50 sm:px-4"
        @click="emit('openNextMatch')"
      >
        <div class="hidden text-right sm:block">
          <div class="text-[10px] font-black uppercase tracking-wider text-slate-400">
            {{ t('app.nextMatch') }}
          </div>
          <div class="text-sm font-extrabold text-slate-900">
            {{ nextOpponent.shortName }} {{ t('common.separator') }}
            {{ matchCompetition(nextMatch) }}
          </div>
        </div>
        <ClubBadge :club="nextOpponent" size="sm" />
        <span
          class="grid h-8 w-8 place-items-center rounded-full bg-emerald-500 text-white transition group-hover:translate-x-0.5"
        >
          <IconSymbol name="chevronRight" class="h-4 w-4" />
        </span>
      </button>
    </div>
  </header>
</template>
