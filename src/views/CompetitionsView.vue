<script setup lang="ts">
import { computed, ref } from 'vue'
import LeagueTable from '@/components/LeagueTable.vue'
import { divisionNames } from '@/config/gameConfig'
import { useClubStore } from '@/stores/clubStore'
import { useCompetitionStore } from '@/stores/competitionStore'
import { useGameStore } from '@/stores/gameStore'
import type { Match } from '@/types/football'

const gameStore = useGameStore()
const clubStore = useClubStore()
const competitionStore = useCompetitionStore()
const activeTab = ref<'league' | 'cup'>('league')

const divisions = computed(() => [1, 2, 3, 4])

const matchById = (matchId?: string): Match | undefined => {
  if (!matchId) {
    return undefined
  }
  return gameStore.game?.matches.find((match) => match.id === matchId)
}

const clubName = (clubId?: string): string => {
  if (!clubId) {
    return 'Ожидается'
  }
  return clubStore.getClubById(clubId)?.name ?? clubId
}
</script>

<template>
  <section v-if="gameStore.game" class="space-y-5">
    <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-950">Турниры</h1>
        <p class="mt-1 text-sm text-slate-600">Чемпионат и национальный кубок.</p>
      </div>
      <div class="inline-flex rounded-md border border-slate-200 bg-white p-1">
        <button
          type="button"
          class="rounded px-4 py-2 text-sm font-semibold"
          :class="activeTab === 'league' ? 'bg-slate-950 text-white' : 'text-slate-600'"
          @click="activeTab = 'league'"
        >
          Чемпионат
        </button>
        <button
          type="button"
          class="rounded px-4 py-2 text-sm font-semibold"
          :class="activeTab === 'cup' ? 'bg-slate-950 text-white' : 'text-slate-600'"
          @click="activeTab = 'cup'"
        >
          Кубок
        </button>
      </div>
    </div>

    <div v-if="activeTab === 'league'" class="grid gap-5 xl:grid-cols-2">
      <article v-for="divisionId in divisions" :key="divisionId" class="rounded-lg border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(20,46,38,0.1)]">
        <h2 class="text-lg font-semibold text-slate-950">{{ divisionNames[divisionId] }}</h2>
        <LeagueTable
          class="mt-4"
          :rows="competitionStore.leagueTables[divisionId] ?? []"
          :clubs="clubStore.clubs"
          :selected-club-id="gameStore.game.selectedClubId"
        />
      </article>
    </div>

    <div v-else class="grid gap-4 xl:grid-cols-3">
      <article v-for="round in competitionStore.cup?.rounds" :key="round.id" class="rounded-lg border border-white/70 bg-white/90 p-4 shadow-[0_18px_50px_rgba(20,46,38,0.1)]">
        <div class="flex items-center justify-between gap-3">
          <h2 class="font-semibold text-slate-950">{{ round.name }}</h2>
          <span
            class="rounded-full px-2 py-1 text-xs font-semibold"
            :class="
              round.status === 'completed'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-100 text-slate-600'
            "
          >
            {{ round.status === 'completed' ? 'сыграно' : 'ожидает' }}
          </span>
        </div>

        <div
          v-if="round.byes.length"
          class="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600"
        >
          Пропуск:
          {{
            round.byes
              .map((clubId) => clubStore.getClubById(clubId)?.shortName ?? clubId)
              .join(', ')
          }}
        </div>

        <div class="mt-3 space-y-2">
          <div
            v-if="!round.ties.length"
            class="rounded-md border border-dashed border-slate-200 p-3 text-sm text-slate-500"
          >
            Пары появятся после предыдущей стадии.
          </div>
          <div
            v-for="tie in round.ties"
            :key="tie.id"
            class="rounded-md border border-slate-200 p-3"
          >
            <div class="grid grid-cols-[1fr_auto] items-center gap-2 text-sm">
              <span
                :class="
                  tie.winnerClubId === tie.homeClubId
                    ? 'font-bold text-emerald-800'
                    : 'text-slate-700'
                "
              >
                {{ clubName(tie.homeClubId) }}
              </span>
              <span class="font-semibold text-slate-950">
                {{ matchById(tie.matchId)?.result?.homeGoals ?? '-' }}
              </span>
              <span
                :class="
                  tie.winnerClubId === tie.awayClubId
                    ? 'font-bold text-emerald-800'
                    : 'text-slate-700'
                "
              >
                {{ clubName(tie.awayClubId) }}
              </span>
              <span class="font-semibold text-slate-950">
                {{ matchById(tie.matchId)?.result?.awayGoals ?? '-' }}
              </span>
            </div>
            <div
              v-if="matchById(tie.matchId)?.result?.penaltyWinnerClubId"
              class="mt-2 text-xs text-slate-500"
            >
              Пенальти: {{ clubName(matchById(tie.matchId)?.result?.penaltyWinnerClubId) }}
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
