<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useMatchDisplay } from '@/composables/useMatchDisplay'
import { useMatchStore } from '@/stores/matches/matchStore'
import type { Match } from '@/types/football'

import ClubBadge from '@/components/ui/ClubBadge.vue'
import IconSymbol from '@/components/ui/IconSymbol.vue'

const props = defineProps<{
  matches: Match[]
}>()

const { t } = useI18n()
const matchStore = useMatchStore()
const { matchCompetition, matchDate, opponent, venue } = useMatchDisplay()

// ОТКРЫВАЕТ ВЫБРАННЫЙ БУДУЩИЙ МАТЧ
const openMatch = (match: Match): void => {
  matchStore.openMatch(match)
}
</script>

<template>
  <!-- ПАНЕЛЬ БЛИЖАЙШИХ МАТЧЕЙ -->
  <article
    class="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_14px_40px_rgba(24,51,43,0.07)]"
  >
    <!-- ЗАГОЛОВОК РАСПИСАНИЯ -->
    <header class="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
      <div>
        <h2 class="mt-0.5 text-lg font-black tracking-tight text-slate-950">
          {{ t('dashboard.schedule') }}
        </h2>
      </div>
      <RouterLink
        to="/calendar"
        class="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-amber-100 hover:text-amber-800"
      >
        {{ t('dashboard.calendar') }}
      </RouterLink>
    </header>

    <div v-if="matches.length" class="min-h-0 flex-1 divide-y divide-slate-100 overflow-auto px-4">
      <component
        :is="index === 0 ? RouterLink : 'div'"
        v-for="(match, index) in props.matches"
        :key="match.id"
        :to="index === 0 ? '/match' : undefined"
        class="group flex items-center gap-3 px-1 py-3.5"
        @click="index === 0 && openMatch(match)"
      >
        <div class="w-10 shrink-0 text-center">
          <div class="text-sm font-black text-slate-900">
            {{ matchDate(match).split(' ')[0] }}
          </div>
          <div class="text-[9px] font-black uppercase text-slate-400">
            {{ matchDate(match).split(' ')[1] }}
          </div>
        </div>
        <ClubBadge v-if="opponent(match)" :club="opponent(match)!" size="sm" />
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-extrabold text-slate-900">
            {{ opponent(match)?.name }}
          </div>
          <div class="mt-0.5 text-[11px] font-semibold text-slate-400">
            {{ matchCompetition(match) }} {{ t('common.separator') }} {{ venue(match) }}
          </div>
        </div>
        <span
          v-if="index === 0"
          class="grid h-7 w-7 place-items-center rounded-full bg-emerald-100 text-emerald-700 transition group-hover:translate-x-0.5"
        >
          <IconSymbol name="chevronRight" class="h-3.5 w-3.5" />
        </span>
      </component>
    </div>

    <div
      v-else
      class="flex min-h-0 flex-1 items-center justify-center p-8 text-center text-sm font-semibold text-slate-400"
    >
      {{ t('dashboard.noMatchesLeft') }}
    </div>
  </article>
</template>
