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
const { matchCompetition, matchDate, opponent, resultData, venue } = useMatchDisplay()

const openMatch = (match: Match): void => {
  matchStore.openMatch(match)
}
</script>

<template>
  <article
    class="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_14px_40px_rgba(24,51,43,0.07)]"
  >
    <header class="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
      <div>
        <div class="text-[10px] font-black uppercase tracking-[0.14em] text-sky-600">
          {{ t('dashboard.teamForm') }}
        </div>
        <h2 class="mt-0.5 text-lg font-black tracking-tight text-slate-950">
          {{ t('dashboard.recentResults') }}
        </h2>
      </div>
      <span class="text-xs font-bold text-slate-400">{{
        t('dashboard.matchesCount', { count: matches.length })
      }}</span>
    </header>

    <div v-if="matches.length" class="min-h-0 flex-1 divide-y divide-slate-100 overflow-auto px-4">
      <RouterLink
        v-for="match in props.matches"
        :key="match.id"
        to="/match"
        class="group flex items-center gap-3 px-1 py-3.5"
        @click="openMatch(match)"
      >
        <span
          class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-black"
          :class="{
            'bg-emerald-100 text-emerald-700': resultData(match).tone === 'emerald',
            'bg-amber-100 text-amber-700': resultData(match).tone === 'amber',
            'bg-rose-100 text-rose-700': resultData(match).tone === 'rose',
          }"
        >
          {{ resultData(match).letter }}
        </span>
        <ClubBadge v-if="opponent(match)" :club="opponent(match)!" size="sm" />
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-extrabold text-slate-900">
            {{ opponent(match)?.shortName }}
          </div>
          <div class="mt-0.5 text-[11px] font-semibold text-slate-400">
            {{ matchCompetition(match) }} {{ t('common.separator') }} {{ venue(match) }}
          </div>
        </div>
        <div class="text-right">
          <div class="text-base font-black text-slate-950">{{ resultData(match).score }}</div>
          <div class="text-[9px] font-bold uppercase text-slate-400">
            {{ matchDate(match) }}
          </div>
        </div>
      </RouterLink>
    </div>

    <div v-else class="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center">
      <span class="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-500">
        <IconSymbol name="trophy" class="h-5 w-5" />
      </span>
      <p class="mt-3 text-sm font-bold text-slate-500">{{ t('dashboard.seasonStarts') }}</p>
      <p class="mt-1 text-xs text-slate-400">{{ t('dashboard.playedMatchesHint') }}</p>
    </div>
  </article>
</template>
