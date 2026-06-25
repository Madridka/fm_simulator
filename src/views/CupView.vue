<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useClubStore } from '@/stores/clubs/clubsStore'
import { useCompetitionStore } from '@/stores/competitions/competitionStore'
import { useGameStore } from '@/stores/game/gameStore'
import type { CupRound, CupTie, Match } from '@/types/football'

const gameStore = useGameStore()
const clubStore = useClubStore()
const competitionStore = useCompetitionStore()

const activeRoundIndex = ref(0)

const cupRoundLabels: Record<string, string> = {
  preliminary: '1/128',
  round_of_128: '1/128',
  round_of_64: '1/64',
  round_of_32: '1/32',
  round_of_16: '1/16',
  quarter_final: '1/4',
  semi_final: '1/2',
  final: 'Финал',
}

const cupRounds = computed((): CupRound[] => competitionStore.cup?.rounds ?? [])
const visibleRounds = computed((): CupRound[] => cupRounds.value)

const activeRound = computed((): CupRound | undefined => visibleRounds.value[activeRoundIndex.value])
const championClub = computed(() => {
  const championClubId = competitionStore.cup?.championClubId
  return championClubId ? clubStore.getClubById(championClubId) : undefined
})

watch(
  visibleRounds,
  (rounds) => {
    if (rounds.length === 0) {
      activeRoundIndex.value = 0
      return
    }

    if (activeRoundIndex.value >= rounds.length) {
      activeRoundIndex.value = rounds.length - 1
      return
    }

    const scheduledRoundIndex = rounds.findIndex((round) => round.status === 'scheduled')
    if (scheduledRoundIndex >= 0) {
      activeRoundIndex.value = scheduledRoundIndex
    }
  },
  { immediate: true },
)

const canMoveBack = computed((): boolean => activeRoundIndex.value > 0)
const canMoveForward = computed((): boolean => activeRoundIndex.value < visibleRounds.value.length - 1)

const moveRound = (direction: -1 | 1): void => {
  const nextIndex = activeRoundIndex.value + direction
  if (nextIndex < 0 || nextIndex >= visibleRounds.value.length) {
    return
  }
  activeRoundIndex.value = nextIndex
}

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

const clubShortName = (clubId?: string): string => {
  if (!clubId) {
    return '---'
  }
  return clubStore.getClubById(clubId)?.shortName ?? clubId
}

const clubBadgeStyle = (clubId?: string): Record<string, string> => {
  const club = clubId ? clubStore.getClubById(clubId) : undefined

  return {
    backgroundColor: club?.primaryColor ?? '#f1f5f9',
    borderColor: club?.secondaryColor ?? '#cbd5e1',
    color: club?.secondaryColor ?? '#475569',
  }
}

const roundLabel = (round?: CupRound): string => (round ? cupRoundLabels[round.id] ?? round.name : '')

const roundStatusLabel = (round?: CupRound): string => {
  if (!round) {
    return ''
  }
  return round.status === 'completed' ? 'Сыграно' : 'Ожидает матчей'
}

const roundStatusClass = (round?: CupRound): string =>
  round?.status === 'completed'
    ? 'bg-emerald-100 text-emerald-800'
    : 'bg-slate-100 text-slate-600'

const tieWinnerClubId = (tie: CupTie): string | undefined => {
  const matchResult = tie.matchId ? matchById(tie.matchId)?.result : undefined
  return tie.winnerClubId ?? matchResult?.winnerClubId ?? matchResult?.penaltyWinnerClubId
}

const isTieWinner = (tie: CupTie, clubId?: string): boolean =>
  Boolean(clubId && tieWinnerClubId(tie) === clubId)

const isSelectedClub = (clubId?: string): boolean => clubId === gameStore.game?.selectedClubId

const teamRowClass = (tie: CupTie, clubId?: string): string[] => [
  'grid grid-cols-[38px_minmax(0,1fr)_42px] items-center gap-3 rounded-md border px-3 py-2 text-sm transition',
  isTieWinner(tie, clubId)
    ? 'border-emerald-300 bg-emerald-50 text-emerald-950 shadow-sm'
    : isSelectedClub(clubId)
      ? 'border-amber-300 bg-amber-50 text-amber-950'
      : 'border-slate-200 bg-white text-slate-700',
]

const teamScore = (tie: CupTie, team: 'home' | 'away'): string => {
  const result = tie.matchId ? matchById(tie.matchId)?.result : undefined
  if (!result) {
    return '-'
  }
  return String(team === 'home' ? result.homeGoals : result.awayGoals)
}

const penaltyWinnerName = (tie: CupTie): string | undefined => {
  const penaltyWinnerClubId = tie.matchId
    ? matchById(tie.matchId)?.result?.penaltyWinnerClubId
    : undefined
  return penaltyWinnerClubId ? clubName(penaltyWinnerClubId) : undefined
}

const tieDate = (tie: CupTie): string => {
  const match = tie.matchId ? matchById(tie.matchId) : undefined
  return match?.date ?? 'Дата будет назначена'
}

const tieStatusLabel = (tie: CupTie): string => {
  const match = tie.matchId ? matchById(tie.matchId) : undefined
  return match?.status === 'played' ? 'Сыгран' : 'Запланирован'
}
</script>

<template>
  <section v-if="gameStore.game" class="mx-auto flex h-full max-w-7xl flex-col gap-4 overflow-hidden">
    <header class="flex shrink-0 flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <div class="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600">
          Кубок: {{ gameStore.championship?.name }}
        </div>
        <h1 class="mt-1 text-2xl font-black tracking-tight text-slate-950">Расписание кубка</h1>
        <p class="mt-1 text-sm text-slate-600">
          Стадии открываются по порядку от ранних раундов к финалу.
        </p>
      </div>

      <div
        v-if="championClub"
        class="rounded-lg bg-emerald-950 px-3 py-2 text-xs font-black text-emerald-50"
      >
        Победитель: {{ championClub.name }}
      </div>
    </header>

    <article
      class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(20,46,38,0.08)]"
    >
      <div
        class="flex shrink-0 flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between"
      >
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-xl font-black text-slate-950">{{ roundLabel(activeRound) }}</h2>
            <span
              v-if="activeRound"
              class="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide"
              :class="roundStatusClass(activeRound)"
            >
              {{ roundStatusLabel(activeRound) }}
            </span>
          </div>
          <p class="mt-1 text-xs font-semibold text-slate-400">
            Стадия {{ visibleRounds.length ? activeRoundIndex + 1 : 0 }} из {{ visibleRounds.length }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-lg font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="!canMoveBack"
            aria-label="Предыдущая стадия"
            @click="moveRound(-1)"
          >
            ‹
          </button>
          <button
            type="button"
            class="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-lg font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="!canMoveForward"
            aria-label="Следующая стадия"
            @click="moveRound(1)"
          >
            ›
          </button>
        </div>
      </div>

      <div
        v-if="activeRound"
        class="grid min-h-0 flex-1 gap-4 overflow-hidden bg-slate-50/70 p-4 lg:grid-cols-[minmax(0,1fr)_300px]"
      >
        <section class="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 class="text-sm font-black text-slate-950">Пары стадии</h3>
            <span class="text-xs font-bold text-slate-400">{{ activeRound.ties.length }} матчей</span>
          </div>

          <div class="grid min-h-0 flex-1 auto-rows-min gap-3 overflow-auto p-4 md:grid-cols-2 xl:grid-cols-3">
            <div
              v-for="tie in activeRound.ties"
              :key="tie.id"
              class="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm"
            >
              <div class="mb-3 flex items-center justify-between gap-2">
                <span class="text-xs font-black uppercase tracking-wide text-slate-400">
                  {{ tieDate(tie) }}
                </span>
                <span
                  class="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500"
                >
                  {{ tieStatusLabel(tie) }}
                </span>
              </div>

              <div class="space-y-2">
                <div :class="teamRowClass(tie, tie.homeClubId)">
                  <span
                    class="grid h-8 w-8 place-items-center rounded-md border text-[10px] font-black"
                    :style="clubBadgeStyle(tie.homeClubId)"
                  >
                    {{ clubShortName(tie.homeClubId) }}
                  </span>
                  <span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-bold">
                    {{ clubName(tie.homeClubId) }}
                  </span>
                  <span class="text-right text-base font-black text-slate-950">
                    {{ teamScore(tie, 'home') }}
                  </span>
                </div>

                <div :class="teamRowClass(tie, tie.awayClubId)">
                  <span
                    class="grid h-8 w-8 place-items-center rounded-md border text-[10px] font-black"
                    :style="clubBadgeStyle(tie.awayClubId)"
                  >
                    {{ clubShortName(tie.awayClubId) }}
                  </span>
                  <span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-bold">
                    {{ clubName(tie.awayClubId) }}
                  </span>
                  <span class="text-right text-base font-black text-slate-950">
                    {{ teamScore(tie, 'away') }}
                  </span>
                </div>
              </div>

              <div
                v-if="penaltyWinnerName(tie)"
                class="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-500"
              >
                Победа по пенальти: {{ penaltyWinnerName(tie) }}
              </div>
            </div>

            <div
              v-if="activeRound.ties.length === 0"
              class="col-span-full grid min-h-[240px] place-items-center rounded-xl border border-dashed border-slate-300 bg-white text-center"
            >
              <div>
                <div class="text-sm font-black text-slate-700">Пары ещё не сформированы</div>
                <p class="mt-1 text-xs text-slate-400">
                  Они появятся после завершения предыдущей стадии.
                </p>
              </div>
            </div>
          </div>
        </section>

        <aside class="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div class="border-b border-slate-100 px-4 py-3">
            <h3 class="text-sm font-black text-slate-950">Проходят дальше</h3>
            <p class="mt-1 text-xs font-semibold text-slate-400">
              Команды, которые начинают со следующей стадии.
            </p>
          </div>

          <div class="min-h-0 flex-1 overflow-auto p-4">
            <div v-if="activeRound.byes.length" class="grid gap-2">
              <div
                v-for="clubId in activeRound.byes"
                :key="clubId"
                class="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <span
                  class="grid h-8 w-8 shrink-0 place-items-center rounded-md border text-[10px] font-black"
                  :style="clubBadgeStyle(clubId)"
                >
                  {{ clubShortName(clubId) }}
                </span>
                <span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold text-slate-700">
                  {{ clubName(clubId) }}
                </span>
              </div>
            </div>

            <div
              v-else
              class="grid min-h-[220px] place-items-center rounded-xl border border-dashed border-slate-300 text-center"
            >
              <div>
                <div class="text-sm font-black text-slate-700">Без автопроходов</div>
                <p class="mt-1 text-xs text-slate-400">
                  Все команды этой стадии играют свои матчи.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </article>
  </section>
</template>
