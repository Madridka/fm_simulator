<script setup lang="ts">
import { computed } from 'vue'
import { useWorldCup2026Store } from '@/stores/worldCup2026/worldCup2026'
import WorldCupMatchCard from '@/components/worldCup2026/WorldCupMatchCard.vue'
import { getWorldCupStageLabel } from '@/data/worldCup2026/stageLabels'
import type { WorldCupRound } from '@/stores/worldCup2026/enums'

const worldCupStore = useWorldCup2026Store()

const stageGroups: Array<{ id: string; rounds: WorldCupRound[] }> = [
  { id: 'group-stage', rounds: ['group-stage-1', 'group-stage-2', 'group-stage-3'] },
  { id: 'round-of-32', rounds: ['round-of-32'] },
  { id: 'round-of-16', rounds: ['round-of-16'] },
  { id: 'quarter-final', rounds: ['quarter-final'] },
  { id: 'semi-final', rounds: ['semi-final'] },
  { id: 'third-place', rounds: ['third-place'] },
  { id: 'final', rounds: ['final'] },
]

const sections = computed(() => stageGroups
  .map((group) => ({
    round: group.id,
    title: getWorldCupStageLabel(group.rounds[0]!),
    matches: worldCupStore.state?.matches
      .filter((match) => group.rounds.includes(match.round))
      .sort((a, b) => a.order - b.order) ?? [],
  }))
  .filter((section) => section.matches.length))
</script>

<template>
  <div class="space-y-7">
    <section v-for="section in sections" :key="section.round">
      <h2 class="mb-3 text-lg font-black text-slate-950">{{ section.title }}</h2>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <WorldCupMatchCard
          v-for="match in section.matches"
          :key="match.id"
          :match="match"
          :selected-team-id="worldCupStore.state?.selectedTeamId"
          :get-team-name="worldCupStore.getTeamName"
          :get-team-flag="worldCupStore.getTeamFlag"
        />
      </div>
    </section>
    <p v-if="!worldCupStore.knockoutStarted" class="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
      Матчи плей-офф будут сформированы после завершения группового этапа.
    </p>
  </div>
</template>
