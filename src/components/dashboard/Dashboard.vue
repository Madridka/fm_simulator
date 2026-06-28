<script setup lang="ts">
import { computed } from 'vue'
import { getClubCompetitionId } from '@/domain/competition/competitionIdentity'
import { useClubStore } from '@/stores/clubs/clubsStore'
import { useCompetitionStore } from '@/stores/competitions/competitionStore'
import { useGameStore } from '@/stores/game/gameStore'
import { useMatchStore } from '@/stores/matches/matchStore'
import type { Club, LeagueTableRow } from '@/types/football'

import DashboardHero from '@/components/dashboard/DashboardHero.vue'
import DashboardLeaguePanel from '@/components/dashboard/DashboardLeaguePanel.vue'
import DashboardLineupPanel from '@/components/dashboard/DashboardLineupPanel.vue'
import DashboardMatchesColumn from '@/components/dashboard/DashboardMatchesColumn.vue'

const gameStore = useGameStore()
const clubStore = useClubStore()
const competitionStore = useCompetitionStore()
const matchStore = useMatchStore()

const club = computed((): Club | undefined => gameStore.selectedClub)

const divisionName = computed((): string =>
  club.value ? clubStore.getClubCompetitionName(club.value) : '',
)

const leagueRows = computed((): LeagueTableRow[] =>
  club.value ? (competitionStore.leagueTables[getClubCompetitionId(club.value)] ?? []) : [],
)
</script>

<template>
  <section
    v-if="club && gameStore.game"
    class="mx-auto flex max-w-[1600px] flex-col gap-5 xl:h-full xl:overflow-hidden"
  >
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

    <div class="grid gap-5 xl:min-h-0 xl:flex-1 xl:grid-cols-[1.05fr_0.95fr_0.95fr]">
      <DashboardLeaguePanel
        :division-name="divisionName"
        :rows="leagueRows"
        :selected-club-id="gameStore.game.selectedClubId"
      />
      <DashboardLineupPanel />
      <DashboardMatchesColumn
        :recent-results="matchStore.recentResults"
        :upcoming-matches="matchStore.upcomingMatches"
      />
    </div>
  </section>
</template>
