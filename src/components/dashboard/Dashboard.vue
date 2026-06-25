<script setup lang="ts">
import { computed } from 'vue'
import { useClubStore } from '@/stores/clubs/clubsStore'
import { useCompetitionStore } from '@/stores/competitions/competitionStore'
import { useGameStore } from '@/stores/game/gameStore'
import { useMatchStore } from '@/stores/matches/matchStore'
import { Club, LeagueTableRow } from '@/types/football'

import DashboardHero from '@/components/dashboard/DashboardHero.vue'
import DashboardLeaguePanel from '@/components/dashboard/DashboardLeaguePanel.vue'
import DashboardResultsPanel from '@/components/dashboard/DashboardResultsPanel.vue'
import DashboardSchedulePanel from '@/components/dashboard/DashboardSchedulePanel.vue'

const gameStore = useGameStore()
const clubStore = useClubStore()
const competitionStore = useCompetitionStore()
const matchStore = useMatchStore()

const club = computed((): Club | undefined => gameStore.selectedClub)

const divisionName = computed((): string =>
  club.value ? clubStore.getDivisionName(club.value.divisionId) : '',
)

const leagueRows = computed((): LeagueTableRow[] =>
  club.value ? (competitionStore.leagueTables[club.value.divisionId] ?? []) : [],
)
</script>

<template>
  <section v-if="club && gameStore.game" class="mx-auto max-w-[1600px] space-y-5">
    <DashboardHero
      :club="club"
      :cup-progress="competitionStore.cupProgress"
      :division-name="divisionName"
      :league-rows-count="leagueRows.length"
      :position="competitionStore.selectedClubRow?.position"
      :season="gameStore.game.season"
      :season-can-finish="gameStore.seasonCanFinish"
      @finish-season="gameStore.finishCurrentSeason()"
    />

    <div class="grid gap-5 xl:grid-cols-[1.08fr_0.92fr_0.92fr]">
      <DashboardLeaguePanel
        :division-name="divisionName"
        :rows="leagueRows"
        :selected-club-id="gameStore.game.selectedClubId"
      />
      <DashboardSchedulePanel :matches="matchStore.upcomingMatches" />
      <DashboardResultsPanel :matches="matchStore.recentResults" />
    </div>
  </section>
</template>
