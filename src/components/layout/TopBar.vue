<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import type { Club, Match } from '@/types/football'

import type { AppNavItem } from '@/components/layout/types'
import ClubBadge from '@/components/ui/ClubBadge.vue'
import IconSymbol from '@/components/ui/IconSymbol.vue'

const props = defineProps<{
  activePath: string
  items: AppNavItem[]
  nextMatch?: Match
  nextOpponent?: Club
  season?: number
  selectedClub?: Club
}>()

const emit = defineEmits<{
  openNextMatch: []
  resetGame: []
}>()

const { t } = useI18n()

const isActive = (item: AppNavItem): boolean => Boolean(item.to && props.activePath === item.to)

const matchCompetition = (match: Match): string =>
  match.type === 'league' ? t('match.round', { round: match.round }) : t('match.cup')
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-slate-200/90 bg-white/90 backdrop-blur-xl">
    <div class="flex min-h-[86px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
      <RouterLink to="/dashboard" class="flex min-w-0 items-center gap-3 md:gap-4">
        <ClubBadge v-if="selectedClub" :club="selectedClub" class="md:hidden" />
        <div class="min-w-0">
          <div class="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
            {{ t('app.season', { season: season ?? '' }) }}
          </div>
          <div class="truncate text-lg font-black tracking-tight text-slate-950 sm:text-xl">
            {{ selectedClub?.name }}
          </div>
        </div>
      </RouterLink>

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

    <nav class="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 md:hidden">
      <template v-for="(item, index) in items" :key="item.to ?? `mobile-divider-${index}`">
        <RouterLink
          v-if="item.to"
          :to="item.to"
          class="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold text-slate-500"
          :class="isActive(item) ? 'bg-emerald-100 text-emerald-800' : ''"
        >
          {{ item.label }}
        </RouterLink>
      </template>
      <button
        class="rounded-lg px-3 py-2 text-xs font-bold text-rose-600"
        @click="emit('resetGame')"
      >
        {{ t('app.newGame') }}
      </button>
    </nav>
  </header>
</template>
