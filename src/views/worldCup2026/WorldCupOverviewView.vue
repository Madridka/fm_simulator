<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { flagEmoji } from '@/data/nationalTeams/worldCup2026/teams'
import { useWorldCup2026Store } from '@/stores/worldCup2026/worldCup2026'
import WorldCupStandingTable from '@/components/worldCup2026/WorldCupStandingTable.vue'
import type { WorldCupMatch } from '@/stores/worldCup2026/types'

const { t } = useI18n()
const router = useRouter()
const worldCupStore = useWorldCup2026Store()

const state = computed(() => worldCupStore.state)
const selectedTeam = computed(() => worldCupStore.selectedTeam)

const userGroupStanding = computed(() => {
  if (!state.value || !selectedTeam.value) {
    return undefined
  }
  const rows = state.value.standings[selectedTeam.value.groupId]
  return rows?.find((row) => row.teamId === selectedTeam.value?.id)
})

const recentResults = computed(() => {
  if (!state.value) {
    return []
  }
  return [...state.value.matches]
    .filter((match) => match.status === 'played')
    .sort((a, b) => b.order - a.order)
    .slice(0, 5)
})

const nextOpponent = computed(() => {
  const match = worldCupStore.nextMatch
  if (!match || !state.value) {
    return undefined
  }
  const opponentId =
    match.homeTeamId === state.value.selectedTeamId ? match.awayTeamId : match.homeTeamId
  return state.value.teams.find((team) => team.id === opponentId)
})

const stageLabel = computed(() => {
  if (!state.value) {
    return ''
  }
  return t(`worldCup2026.stages.${state.value.currentRound}`)
})

const formatResult = (match: WorldCupMatch): string => {
  if (!match.result) {
    return ''
  }
  const base = `${worldCupStore.getTeamName(match.homeTeamId)} ${match.result.homeScore}:${match.result.awayScore} ${worldCupStore.getTeamName(match.awayTeamId)}`
  if (match.result.decidedBy === 'extra-time') {
    return `${base} (д.в. ${match.result.extraTimeHomeScore}:${match.result.extraTimeAwayScore})`
  }
  if (match.result.decidedBy === 'penalties') {
    return `${base} (пен. ${match.result.penaltyHomeScore}:${match.result.penaltyAwayScore})`
  }
  return base
}

const simulate = (): void => {
  worldCupStore.simulateNextMatchDay()
}

const simulateRest = (): void => {
  while (worldCupStore.canSimulate) {
    worldCupStore.simulateNextMatchDay()
  }
}

const newTournament = (): void => {
  worldCupStore.resetTournament()
  void router.push({ name: 'world-cup-select-team' })
}

const userGroupRows = computed(() => {
  if (!state.value || !selectedTeam.value) {
    return []
  }
  return state.value.standings[selectedTeam.value.groupId] ?? []
})
</script>

<template>
  <div v-if="state && selectedTeam" class="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
    <div class="space-y-5">
      <article
        v-if="state.status === 'finished' && worldCupStore.isChampion"
        class="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/20 to-yellow-600/10 p-6 text-center"
      >
        <p class="text-sm font-black uppercase tracking-[0.3em] text-amber-200">
          {{ t('worldCup2026.overview.champion') }}
        </p>
        <div class="mt-4 text-5xl">{{ flagEmoji(selectedTeam.flagCode) }}</div>
        <h2 class="mt-3 text-3xl font-black uppercase">{{ selectedTeam.name }}</h2>
        <Button class="mt-6 !font-black" :label="t('worldCup2026.overview.newTournament')" @click="newTournament" />
      </article>

      <article
        v-else-if="worldCupStore.isUserEliminated"
        class="rounded-2xl border border-red-400/30 bg-red-950/30 p-6"
      >
        <h2 class="text-xl font-black uppercase">{{ t('worldCup2026.overview.eliminated') }}</h2>
        <p class="mt-2 text-slate-300">
          {{
            t('worldCup2026.overview.eliminatedAt', {
              stage: t(`worldCup2026.stages.${state.userEliminatedAt}`),
            })
          }}
        </p>
        <div class="mt-4 flex flex-wrap gap-3">
          <Button
            v-if="worldCupStore.canSimulate"
            :label="t('worldCup2026.overview.simulateRest')"
            @click="simulateRest"
          />
          <Button
            severity="secondary"
            :label="t('worldCup2026.overview.newTournament')"
            @click="newTournament"
          />
        </div>
      </article>

      <article v-else class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <p class="text-xs font-black uppercase tracking-[0.2em] text-amber-300/80">
          {{ stageLabel }}
        </p>
        <h2 class="mt-2 text-2xl font-black uppercase">
          <template v-if="!state.lastSimulatedOrder">
            {{ t('worldCup2026.overview.notStarted') }}
          </template>
          <template v-else-if="state.status === 'group-stage'">
            {{
              t('worldCup2026.overview.matchday', {
                current: state.currentMatchday,
                total: 3,
              })
            }}
          </template>
          <template v-else>
            {{ t('worldCup2026.overview.qualified', { round: stageLabel }) }}
          </template>
        </h2>
        <p v-if="nextOpponent" class="mt-3 text-slate-300">
          {{
            t(
              state.lastSimulatedOrder
                ? 'worldCup2026.overview.nextOpponent'
                : 'worldCup2026.overview.firstOpponent',
              {
                team: `${flagEmoji(nextOpponent.flagCode)} ${nextOpponent.name}`,
              },
            )
          }}
        </p>
        <Button
          v-if="worldCupStore.canSimulate"
          class="mt-5 !font-black"
          :label="t('worldCup2026.overview.simulate')"
          @click="simulate"
        />
      </article>

      <article class="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
        <h3 class="text-sm font-black uppercase tracking-[0.15em] text-slate-400">
          {{ t('worldCup2026.overview.recentResults') }}
        </h3>
        <ul class="mt-3 space-y-2">
          <li
            v-for="match in recentResults"
            :key="match.id"
            class="rounded-lg bg-black/20 px-3 py-2 text-sm text-slate-200"
          >
            {{ formatResult(match) }}
          </li>
          <li v-if="!recentResults.length" class="text-sm text-slate-500">—</li>
        </ul>
      </article>
    </div>

    <aside class="space-y-5">
      <article class="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
        <h3 class="text-sm font-black uppercase tracking-[0.15em] text-slate-400">
          {{ t('worldCup2026.overview.yourTeam') }}
        </h3>
        <div class="mt-3 flex items-center gap-3">
          <span class="text-4xl">{{ flagEmoji(selectedTeam.flagCode) }}</span>
          <div>
            <div class="text-xl font-black">{{ selectedTeam.name }}</div>
            <div class="text-sm text-amber-200">{{ selectedTeam.rating }}</div>
          </div>
        </div>
        <p v-if="userGroupStanding" class="mt-4 text-sm text-slate-300">
          {{ t('worldCup2026.overview.groupPosition') }}:
          <strong>{{ userGroupStanding.position }}</strong> · {{ userGroupStanding.points }} оч.
        </p>
      </article>

      <WorldCupStandingTable
        :rows="userGroupRows"
        :highlight-team-id="selectedTeam.id"
        :title="t('worldCup2026.group', { letter: selectedTeam.groupId })"
      />
    </aside>
  </div>
</template>
