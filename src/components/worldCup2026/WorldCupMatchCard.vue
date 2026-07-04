<script setup lang="ts">
import type { WorldCupMatch } from '@/stores/worldCup2026/types'
import { getWorldCupStageLabel } from '@/data/worldCup2026/stageLabels'

defineProps<{
  match: WorldCupMatch
  getTeamName: (teamId: string) => string
  getTeamFlag: (teamId: string) => string
  selectedTeamId?: string
}>()

const resultText = (match: WorldCupMatch): string => {
  if (!match.result) {
    return '—'
  }
  let text = `${match.result.homeScore}:${match.result.awayScore}`
  if (match.result.decidedBy === 'extra-time') {
    text += ` д.в. ${match.result.extraTimeHomeScore}:${match.result.extraTimeAwayScore}`
  }
  if (match.result.decidedBy === 'penalties') {
    text += ` пен. ${match.result.penaltyHomeScore}:${match.result.penaltyAwayScore}`
  }
  return text
}
</script>

<template>
  <article
    class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    :class="[
      match.status === 'played' ? 'opacity-90' : '',
      match.homeTeamId === selectedTeamId || match.awayTeamId === selectedTeamId
        ? 'ring-2 ring-emerald-500'
        : '',
    ]"
  >
    <div class="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
      {{ match.date }} · {{ getWorldCupStageLabel(match.round) }}
    </div>
    <div class="flex items-center justify-between gap-2 text-sm">
      <span class="font-semibold">
        {{ getTeamFlag(match.homeTeamId) }} {{ getTeamName(match.homeTeamId) }}
      </span>
      <span class="font-black text-emerald-700">{{ resultText(match) }}</span>
      <span class="text-right font-semibold">
        {{ getTeamName(match.awayTeamId) }} {{ getTeamFlag(match.awayTeamId) }}
      </span>
    </div>
    <div class="mt-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
      {{ match.status === 'played' ? 'Завершён' : 'Запланирован' }}
    </div>
  </article>
</template>
