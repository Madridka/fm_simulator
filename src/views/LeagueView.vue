<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { championships, getChampionshipClubs, type ChampionshipId } from '@/data/clubs'
import { calculateLeagueTables } from '@/domain/competition/leagueTableService'
import { useCompetitionStore } from '@/stores/competitions/competitionStore'
import { useGameStore } from '@/stores/game/gameStore'
import type { Club, LeagueTableRow } from '@/types/football'

import LeagueTable from '@/components/ui/LeagueTable.vue'

interface LeagueOption {
  key: string
  championshipId: ChampionshipId
  divisionId: number
  label: string
}

const gameStore = useGameStore()
const competitionStore = useCompetitionStore()

const makeLeagueKey = (championshipId: ChampionshipId, divisionId: number): string =>
  `${championshipId}:${divisionId}`

const isChampionshipId = (value: string): value is ChampionshipId => value in championships

const playerDivisionId = computed((): number => gameStore.selectedClub?.divisionId ?? 1)
const playerLeagueKey = computed((): string =>
  makeLeagueKey(gameStore.game?.championshipId ?? 'russia', playerDivisionId.value),
)

const selectedLeagueKey = ref(playerLeagueKey.value)

watch(
  playerLeagueKey,
  (leagueKey) => {
    selectedLeagueKey.value = leagueKey
  },
  { immediate: true },
)

const leagueOptions = computed((): LeagueOption[] =>
  Object.values(championships).flatMap((championship) =>
    Object.entries(championship.divisionNames)
      .map(([divisionId, divisionName]) => ({
        key: makeLeagueKey(championship.id, Number(divisionId)),
        championshipId: championship.id,
        divisionId: Number(divisionId),
        label: `${championship.name} - ${divisionName}`,
      }))
      .sort((left, right) => left.divisionId - right.divisionId),
  ),
)

const selectedLeague = computed((): LeagueOption => {
  const [championshipIdCandidate = '', divisionIdCandidate = '1'] =
    selectedLeagueKey.value.split(':')
  const championshipId = isChampionshipId(championshipIdCandidate)
    ? championshipIdCandidate
    : (gameStore.game?.championshipId ?? 'russia')
  const divisionId = Number(divisionIdCandidate) || 1
  const option = leagueOptions.value.find(
    (candidate) =>
      candidate.championshipId === championshipId && candidate.divisionId === divisionId,
  )

  return option ?? leagueOptions.value[0]!
})

const selectedChampionship = computed(() => championships[selectedLeague.value.championshipId])
const isCurrentChampionship = computed(
  (): boolean => selectedLeague.value.championshipId === gameStore.game?.championshipId,
)
const isPlayerLeague = computed((): boolean => selectedLeagueKey.value === playerLeagueKey.value)

const selectedClubs = computed((): Club[] => {
  if (isCurrentChampionship.value) {
    return gameStore.game?.clubs ?? []
  }
  return getChampionshipClubs(selectedLeague.value.championshipId)
})

const staticTables = computed(() => calculateLeagueTables(selectedClubs.value, []))

const selectedRows = computed((): LeagueTableRow[] => {
  if (isCurrentChampionship.value) {
    return (
      competitionStore.leagueTables[selectedLeague.value.divisionId] ??
      staticTables.value[selectedLeague.value.divisionId] ??
      []
    )
  }

  return staticTables.value[selectedLeague.value.divisionId] ?? []
})

const selectedClubId = computed((): string | undefined =>
  isCurrentChampionship.value ? gameStore.game?.selectedClubId : undefined,
)
</script>

<template>
  <section v-if="gameStore.game" class="mx-auto flex h-full max-w-6xl flex-col gap-5 overflow-hidden">
    <header class="flex shrink-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <div class="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600">
          Чемпионаты
        </div>
        <h1 class="mt-1 text-2xl font-black tracking-tight text-slate-950">Таблица лиги</h1>
        <p class="mt-1 text-sm text-slate-600">
          Выберите страну и лигу, чтобы посмотреть таблицу любого доступного чемпионата.
        </p>
      </div>

      <label class="min-w-0 rounded-xl border border-slate-200 bg-white p-2 shadow-sm md:min-w-[360px]">
        <span class="mb-1 block px-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
          Страна - лига
        </span>
        <select
          v-model="selectedLeagueKey"
          class="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white"
        >
          <option v-for="option in leagueOptions" :key="option.key" :value="option.key">
            {{ option.label }}
          </option>
        </select>
      </label>
    </header>

    <article
      class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(20,46,38,0.08)]"
    >
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6"
      >
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-lg font-black text-slate-950">
              {{ selectedChampionship.name }} - {{ selectedChampionship.divisionNames[selectedLeague.divisionId] }}
            </h2>
            <span
              v-if="isPlayerLeague"
              class="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-800"
            >
              Ваш дивизион
            </span>
          </div>
          <p class="mt-1 text-xs font-semibold text-slate-400">
            {{ selectedRows.length }} команд · сезон {{ gameStore.game.season }}
          </p>
        </div>
        <button
          v-if="!isPlayerLeague"
          type="button"
          class="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800 transition hover:bg-emerald-100"
          @click="selectedLeagueKey = playerLeagueKey"
        >
          Вернуться к своей лиге
        </button>
      </div>

      <LeagueTable
        class="min-h-0 flex-1 overflow-auto p-3 sm:p-5"
        :rows="selectedRows"
        :clubs="selectedClubs"
        :selected-club-id="selectedClubId"
      />
    </article>
  </section>
</template>
