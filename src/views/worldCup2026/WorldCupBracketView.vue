<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWorldCup2026Store } from '@/stores/worldCup2026/worldCup2026'
import type { WorldCupKnockoutTie } from '@/stores/worldCup2026/types'

const { t } = useI18n()
const worldCupStore = useWorldCup2026Store()

const bracket = computed(() => worldCupStore.state?.knockoutBracket)

const formatTie = (tie: WorldCupKnockoutTie): string => {
  const home = tie.homeTeamId ? worldCupStore.getTeamName(tie.homeTeamId) : '—'
  const away = tie.awayTeamId ? worldCupStore.getTeamName(tie.awayTeamId) : '—'
  const winner = tie.winnerTeamId ? ` → ${worldCupStore.getTeamName(tie.winnerTeamId)}` : ''
  return `${home} vs ${away}${winner}`
}

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
  <div v-if="sections.length" class="space-y-6">
    <section
      v-for="section in sections"
      :key="section.title"
      class="rounded-2xl border border-white/10 bg-white/5 p-5"
    >
      <h2 class="mb-4 text-sm font-black uppercase tracking-[0.2em] text-amber-300">
        {{ section.title }}
      </h2>
      <ul class="space-y-2">
        <li
          v-for="tie in section.ties"
          :key="tie.id"
          class="rounded-lg bg-black/20 px-3 py-2 text-sm text-slate-200"
        >
          {{ formatTie(tie) }}
        </li>
      </ul>
    </section>
  </div>
  <p v-else class="text-slate-400">Сетка плей-офф появится после группового этапа.</p>
</template>
