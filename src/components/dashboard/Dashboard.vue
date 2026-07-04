<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { useCareerContext } from '@/composables/useCareerContext'
import { useClubStore } from '@/stores/clubs/clubsStore'
import { useCompetitionStore } from '@/stores/competitions/competitionStore'
import { useGameStore } from '@/stores/game/gameStore'
import { useMatchStore } from '@/stores/matches/matchStore'
import { getClubCompetitionId } from '@/domain/competition/competitionIdentity'
import { calculateClubRating } from '@/domain/club/teamRating'
import type { Club, LeagueTableRow } from '@/types/football'
import { getWorldCupStageLabel } from '@/data/worldCup2026/stageLabels'

import DashboardHero from '@/components/dashboard/DashboardHero.vue'
import DashboardLeaguePanel from '@/components/dashboard/DashboardLeaguePanel.vue'
import DashboardLineupPanel from '@/components/dashboard/DashboardLineupPanel.vue'
import DashboardMatchesColumn from '@/components/dashboard/DashboardMatchesColumn.vue'
import DashboardWorldCupGroupPanel from '@/components/dashboard/DashboardWorldCupGroupPanel.vue'
import WorldCupDashboardHero from '@/components/dashboard/WorldCupDashboardHero.vue'

const gameStore = useGameStore()
const clubStore = useClubStore()
const competitionStore = useCompetitionStore()
const matchStore = useMatchStore()
const { isWorldCupMode, selectedClub, worldCupStore, paths } = useCareerContext()
const { t } = useI18n()

const club = computed((): Club | undefined => selectedClub.value)

const teamRating = computed((): number => {
  if (!club.value) {
    return 0
  }
  if (isWorldCupMode.value && worldCupStore.state) {
    const lineup = worldCupStore.state.lineups[worldCupStore.state.selectedTeamId]
    return calculateClubRating(club.value, lineup)
  }
  const game = gameStore.game
  if (!game) {
    return 0
  }
  return calculateClubRating(club.value, game.lineups[game.selectedClubId])
})

const divisionName = computed((): string => {
  if (isWorldCupMode.value && worldCupStore.selectedTeam) {
    return t('worldCup2026.group', { letter: worldCupStore.selectedTeam.groupId })
  }
  return club.value ? clubStore.getClubCompetitionName(club.value) : ''
})

const tournamentStageName = computed((): string => {
  if (isWorldCupMode.value && worldCupStore.state) {
    return worldCupStore.state.status === 'finished'
      ? 'Турнир завершен'
      : getWorldCupStageLabel(worldCupStore.state.currentRound)
  }
  return divisionName.value
})

const leagueRows = computed((): LeagueTableRow[] =>
  club.value ? (competitionStore.leagueTables[getClubCompetitionId(club.value)] ?? []) : [],
)

const userGroupStanding = computed(() => {
  if (!isWorldCupMode.value || !worldCupStore.state || !worldCupStore.selectedTeam) {
    return undefined
  }
  const rows = worldCupStore.state.standings[worldCupStore.selectedTeam.groupId]
  return rows?.find((row) => row.teamId === worldCupStore.selectedTeam?.id)
})

const userGroupRows = computed(() => {
  if (!isWorldCupMode.value || !worldCupStore.selectedTeam || !worldCupStore.state) {
    return []
  }
  return worldCupStore.state.standings[worldCupStore.selectedTeam.groupId] ?? []
})

const playNextMatch = (): void => {
  if (matchStore.nextMatch) {
    matchStore.openMatch(matchStore.nextMatch)
  }
}
</script>

<template>
  <section
    v-if="club && (gameStore.game || worldCupStore.state)"
    class="mx-auto flex max-w-[1600px] flex-col gap-5 xl:h-full xl:overflow-hidden"
  >
    <WorldCupDashboardHero
      v-if="isWorldCupMode && worldCupStore.selectedTeam"
      :club="club"
      :team-flag="worldCupStore.getTeamFlag(worldCupStore.selectedTeam.id)"
      :team-rating="teamRating"
      :division-name="tournamentStageName"
      :position="userGroupStanding?.position"
      :group-size="userGroupRows.length"
      :can-play="worldCupStore.canPlay"
      :is-finished="worldCupStore.isFinished"
      :is-user-eliminated="worldCupStore.isUserEliminated"
      :is-champion="worldCupStore.isChampion"
      @play-next-match="playNextMatch"
      @simulate-rest="worldCupStore.simulateRest()"
    />

    <div v-if="isWorldCupMode && !worldCupStore.isFinished" class="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <button type="button" class="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-500" @click="worldCupStore.simulateNextMatch()">
        Симулировать следующий матч
      </button>
      <button v-if="!worldCupStore.groupStageCompleted" type="button" class="rounded-lg bg-slate-800 px-4 py-2 text-xs font-black text-white hover:bg-slate-700" @click="worldCupStore.simulateNextGroupRound()">
        Симулировать тур
      </button>
      <button type="button" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50" @click="worldCupStore.simulateUntilNextStage()">
        Симулировать до следующей стадии
      </button>
    </div>

    <DashboardHero
      v-if="!isWorldCupMode && gameStore.game"
      :club="club"
      :team-rating="teamRating"
      :cup-progress="competitionStore.cupProgress"
      :division-name="divisionName"
      :league-rows-count="leagueRows.length"
      :position="competitionStore.selectedClubRow?.position"
      :season="gameStore.game.season"
      :season-can-finish="gameStore.seasonCanFinish"
      :is-final-season="gameStore.isFinalSeason"
      @finish-season="gameStore.finishCurrentSeason()"
    />

    <div class="grid gap-5 xl:min-h-0 xl:flex-1 xl:grid-cols-[1.05fr_0.95fr_0.95fr]">
      <DashboardWorldCupGroupPanel
        v-if="isWorldCupMode && worldCupStore.selectedTeam"
        :division-name="divisionName"
        :rows="userGroupRows"
        :selected-team-id="worldCupStore.selectedTeam.id"
        :groups-path="paths.groups"
      />
      <DashboardLeaguePanel
        v-else
        :division-name="divisionName"
        :rows="leagueRows"
        :selected-club-id="gameStore.game!.selectedClubId"
      />
      <DashboardLineupPanel :squad-path="paths.squad" />
      <DashboardMatchesColumn
        :recent-results="matchStore.recentResults"
        :upcoming-matches="matchStore.upcomingMatches"
        :calendar-path="paths.calendar"
        :match-path="paths.match"
      />
    </div>
  </section>
</template>
