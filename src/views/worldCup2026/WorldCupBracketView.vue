<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWorldCup2026Store } from '@/stores/worldCup2026/worldCup2026'
import type { WorldCupKnockoutTie, WorldCupMatch } from '@/stores/worldCup2026/types'

const { t } = useI18n()
const worldCupStore = useWorldCup2026Store()

const bracket = computed(() => worldCupStore.state?.knockoutBracket)

const teamLabel = (teamId?: string): string =>
  teamId ? `${worldCupStore.getTeamFlag(teamId)} ${worldCupStore.getTeamName(teamId)}` : 'Ожидает победителя'

const tieMatch = (tie: WorldCupKnockoutTie): WorldCupMatch | undefined =>
  worldCupStore.state?.matches.find((candidate) => candidate.id === `wc26-ko-${tie.id}`)

const teamScore = (tie: WorldCupKnockoutTie, side: 'home' | 'away'): string => {
  const result = tieMatch(tie)?.result
  if (!result) return '—'
  const score = result.decidedBy === 'extra-time' || result.decidedBy === 'penalties'
    ? side === 'home' ? result.extraTimeHomeScore : result.extraTimeAwayScore
    : side === 'home' ? result.homeScore : result.awayScore
  return String(score ?? (side === 'home' ? result.homeScore : result.awayScore))
}

const penaltyLabel = (tie: WorldCupKnockoutTie): string => {
  const result = tieMatch(tie)?.result
  if (result?.decidedBy !== 'penalties') return ''
  const winner = result.winnerTeamId ? worldCupStore.getTeamName(result.winnerTeamId) : ''
  return `${winner} победила по пенальти ${result.penaltyHomeScore}:${result.penaltyAwayScore}`
}

const isWinner = (tie: WorldCupKnockoutTie, teamId?: string): boolean =>
  Boolean(teamId && tieMatch(tie)?.result?.winnerTeamId === teamId)

const sections = computed(() => {
  if (!bracket.value) {
    return []
  }
  return [
    { title: t('worldCup2026.stages.round-of-32'), ties: bracket.value.roundOf32 },
    { title: t('worldCup2026.stages.round-of-16'), ties: bracket.value.roundOf16 },
    { title: t('worldCup2026.stages.quarter-final'), ties: bracket.value.quarterFinals },
    { title: t('worldCup2026.stages.semi-final'), ties: bracket.value.semiFinals },
    {
      title: t('worldCup2026.stages.third-place'),
      ties: bracket.value.thirdPlaceMatch ? [bracket.value.thirdPlaceMatch] : [],
    },
    { title: t('worldCup2026.stages.final'), ties: bracket.value.final ? [bracket.value.final] : [] },
  ].filter((section) => section.ties.length)
})
</script>

<template>
  <div v-if="sections.length" class="overflow-x-auto pb-4">
    <div class="grid min-w-[1120px] grid-flow-col auto-cols-[260px] gap-4 lg:min-w-max">
    <section
      v-for="section in sections"
      :key="section.title"
      class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h2 class="mb-4 text-sm font-black uppercase tracking-[0.2em] text-emerald-700">
        {{ section.title }}
      </h2>
      <ul class="flex min-h-[520px] flex-col justify-around gap-3">
        <li
          v-for="tie in section.ties"
          :key="tie.id"
          class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"
          :class="tie.homeTeamId === worldCupStore.state?.selectedTeamId || tie.awayTeamId === worldCupStore.state?.selectedTeamId ? 'ring-2 ring-emerald-500' : ''"
        >
          <div class="flex items-center justify-between gap-2 border-b border-slate-200 pb-2" :class="isWinner(tie, tie.homeTeamId) ? 'text-emerald-700' : ''">
            <span class="truncate font-bold"><span v-if="isWinner(tie, tie.homeTeamId)">✓ </span>{{ teamLabel(tie.homeTeamId) }}</span>
            <span class="font-black">{{ teamScore(tie, 'home') }}</span>
          </div>
          <div class="flex items-center justify-between gap-2 pt-2" :class="isWinner(tie, tie.awayTeamId) ? 'text-emerald-700' : ''">
            <span class="truncate font-bold"><span v-if="isWinner(tie, tie.awayTeamId)">✓ </span>{{ teamLabel(tie.awayTeamId) }}</span>
            <span class="font-black">{{ teamScore(tie, 'away') }}</span>
          </div>
          <div v-if="penaltyLabel(tie)" class="mt-2 rounded-md bg-amber-100 px-2 py-1.5 text-[10px] font-black text-amber-800">
            {{ penaltyLabel(tie) }}
          </div>
        </li>
      </ul>
    </section>
    </div>
  </div>
  <p v-else class="text-slate-400">Сетка плей-офф появится после группового этапа.</p>
</template>
