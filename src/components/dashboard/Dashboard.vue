<script setup lang="ts">
import { computed, ref } from 'vue'
import { getClubCompetitionId } from '@/domain/competition/competitionIdentity'
import { useClubStore } from '@/stores/clubs/clubsStore'
import { useCompetitionStore } from '@/stores/competitions/competitionStore'
import { useGameStore } from '@/stores/game/gameStore'
import { useMatchStore } from '@/stores/matches/matchStore'
import { calculateClubRating } from '@/domain/club/teamRating'
import type { Club, LeagueTableRow } from '@/types/football'

import DashboardHero from '@/components/dashboard/DashboardHero.vue'
import DashboardLeaguePanel from '@/components/dashboard/DashboardLeaguePanel.vue'
import DashboardLineupPanel from '@/components/dashboard/DashboardLineupPanel.vue'
import DashboardMatchesColumn from '@/components/dashboard/DashboardMatchesColumn.vue'

// ХРАНИЛИЩА, ИЗ КОТОРЫХ СОБИРАЕТСЯ СВОДКА ГЛАВНОГО ЭКРАНА
const gameStore = useGameStore()
const clubStore = useClubStore()
const competitionStore = useCompetitionStore()
const matchStore = useMatchStore()
type DashboardMobileTab = 'lineup' | 'table' | 'matches'
const activeDashboardMobileTab = ref<DashboardMobileTab>('lineup')
const dashboardMobileTabs: { id: DashboardMobileTab; label: string }[] = [
  { id: 'lineup', label: 'Состав' },
  { id: 'table', label: 'Таблица' },
  { id: 'matches', label: 'Игры' },
]

// ВОЗВРАЩАЕТ ВЫБРАННЫЙ КЛУБ
const club = computed((): Club | undefined => gameStore.selectedClub)

// РАССЧИТЫВАЕТ ТЕКУЩИЙ РЕЙТИНГ ПО СОХРАНЁННОМУ СТАРТОВОМУ СОСТАВУ
const teamRating = computed((): number => {
  const game = gameStore.game
  if (!club.value || !game) {
    return 0
  }

  return calculateClubRating(club.value, game.lineups[game.selectedClubId])
})

// ВОЗВРАЩАЕТ НАЗВАНИЕ ДИВИЗИОНА КЛУБА
const divisionName = computed((): string =>
  club.value ? clubStore.getClubCompetitionName(club.value) : '',
)

// ВОЗВРАЩАЕТ СТРОКИ ТУРНИРНОЙ ТАБЛИЦЫ
const leagueRows = computed((): LeagueTableRow[] =>
  club.value ? (competitionStore.leagueTables[getClubCompetitionId(club.value)] ?? []) : [],
)
</script>

<template>
  <!-- ОСНОВНОЕ СОДЕРЖИМОЕ ДАШБОРДА -->
  <section
    v-if="club && gameStore.game"
    class="mx-auto flex max-w-[1600px] flex-col gap-3 xl:h-full xl:overflow-hidden"
  >
    <!-- СВОДКА ПО ВЫБРАННОМУ КЛУБУ -->
    <DashboardHero
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

    <!-- ИНФОРМАЦИОННЫЕ ПАНЕЛИ КЛУБА -->
    <div
      class="grid gap-3 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,0.72fr)_minmax(0,0.96fr)]"
    >
      <div
        class="grid grid-cols-3 gap-1 rounded-lg border border-white/70 bg-white/90 p-1 shadow-[0_18px_50px_rgba(20,46,38,0.1)] xl:hidden"
        role="tablist"
        aria-label="Главная панель"
      >
        <button
          v-for="tab in dashboardMobileTabs"
          :key="tab.id"
          type="button"
          class="min-h-10 rounded-md px-2 text-center text-sm font-black transition"
          :class="
            activeDashboardMobileTab === tab.id
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-500'
          "
          role="tab"
          :aria-selected="activeDashboardMobileTab === tab.id"
          @click="activeDashboardMobileTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>
      <div
        class="dashboard-mobile-panel order-2 min-h-0 xl:order-none xl:h-full"
        :class="{ 'is-mobile-active': activeDashboardMobileTab === 'table' }"
      >
        <DashboardLeaguePanel
          :division-name="divisionName"
          :rows="leagueRows"
          :selected-club-id="gameStore.game.selectedClubId"
        />
      </div>
      <div
        class="dashboard-mobile-panel order-1 min-h-0 xl:order-none xl:h-full"
        :class="{ 'is-mobile-active': activeDashboardMobileTab === 'lineup' }"
      >
        <DashboardLineupPanel />
      </div>
      <div
        class="dashboard-mobile-panel order-3 min-h-0 xl:order-none xl:h-full"
        :class="{ 'is-mobile-active': activeDashboardMobileTab === 'matches' }"
      >
        <DashboardMatchesColumn
          :recent-results="matchStore.recentResults"
          :upcoming-matches="matchStore.upcomingMatches"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
@media (max-width: 1279px) {
  .dashboard-mobile-panel {
    display: none;
  }

  .dashboard-mobile-panel.is-mobile-active {
    display: block;
  }

  .dashboard-mobile-panel.is-mobile-active > * {
    height: clamp(420px, calc(100dvh - 260px), 560px);
    max-height: calc(100dvh - 220px);
  }
}
</style>
