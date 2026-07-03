<script setup lang="ts">
import type { WorldCupMatch } from '@/stores/worldCup2026/types'

defineProps<{
  match: WorldCupMatch
  getTeamName: (teamId: string) => string
  getTeamFlag: (teamId: string) => string
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
    class="rounded-xl border border-white/10 bg-[#0d1524]/80 p-4"
    :class="match.status === 'played' ? 'opacity-90' : ''"
  >
    <div class="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
      {{ match.date }} · {{ match.round }}
    </div>
    <div class="flex items-center justify-between gap-2 text-sm">
      <span class="font-semibold">
        {{ getTeamFlag(match.homeTeamId) }} {{ getTeamName(match.homeTeamId) }}
      </span>
      <span class="font-black text-amber-200">{{ resultText(match) }}</span>
      <span class="text-right font-semibold">
        {{ getTeamName(match.awayTeamId) }} {{ getTeamFlag(match.awayTeamId) }}
      </span>
    </div>
  </article>
</template>
