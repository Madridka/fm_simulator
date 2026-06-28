<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useClubStore } from '@/stores/clubs/clubsStore'
import { useCompetitionStore } from '@/stores/competitions/competitionStore'
import { useGameStore } from '@/stores/game/gameStore'
import type { CupRound, CupTie, Match } from '@/types/football'
import { useI18n } from 'vue-i18n'

const gameStore = useGameStore()
const clubStore = useClubStore()
const competitionStore = useCompetitionStore()
const { t } = useI18n()

const activeRoundIndex = ref(0)

// ВОЗВРАЩАЕТ ВСЕ РАУНДЫ КУБКА
const cupRounds = computed((): CupRound[] => competitionStore.cup?.rounds ?? [])

// ВОЗВРАЩАЕТ ДОСТУПНЫЕ ДЛЯ ПРОСМОТРА РАУНДЫ
const visibleRounds = computed((): CupRound[] => cupRounds.value)

// ВОЗВРАЩАЕТ АКТИВНЫЙ РАУНД КУБКА
const activeRound = computed(
  (): CupRound | undefined => visibleRounds.value[activeRoundIndex.value],
)
// ПРОВЕРЯЕТ НАЛИЧИЕ КЛУБОВ БЕЗ МАТЧА В РАУНДЕ
const hasRoundByes = computed((): boolean => Boolean(activeRound.value?.byes.length))

// ВОЗВРАЩАЕТ ПОБЕДИТЕЛЯ КУБКА
const championClub = computed(() => {
  const championClubId = competitionStore.cup?.championClubId
  return championClubId ? clubStore.getClubById(championClubId) : undefined
})

// СИНХРОНИЗИРУЕТ АКТИВНЫЙ РАУНД С ТЕКУЩЕЙ СТАДИЕЙ
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

// ПРОВЕРЯЕТ ДОСТУПНОСТЬ ПРЕДЫДУЩЕГО РАУНДА
const canMoveBack = computed((): boolean => activeRoundIndex.value > 0)

// ПРОВЕРЯЕТ ДОСТУПНОСТЬ СЛЕДУЮЩЕГО РАУНДА
const canMoveForward = computed(
  (): boolean => activeRoundIndex.value < visibleRounds.value.length - 1,
)

// ПЕРЕКЛЮЧАЕТ АКТИВНЫЙ РАУНД
const moveRound = (direction: -1 | 1): void => {
  const nextIndex = activeRoundIndex.value + direction
  if (nextIndex < 0 || nextIndex >= visibleRounds.value.length) {
    return
  }
  activeRoundIndex.value = nextIndex
}

// ВОЗВРАЩАЕТ МАТЧ ПО ИДЕНТИФИКАТОРУ
const matchById = (matchId?: string): Match | undefined => {
  if (!matchId) {
    return undefined
  }
  return gameStore.game?.matches.find((match) => match.id === matchId)
}

// ВОЗВРАЩАЕТ ПОЛНОЕ НАЗВАНИЕ КЛУБА
const clubName = (clubId?: string): string => {
  if (!clubId) {
    return t('cup.awaitingClub')
  }
  return clubStore.getClubById(clubId)?.name ?? clubId
}

// ВОЗВРАЩАЕТ КОРОТКОЕ НАЗВАНИЕ КЛУБА
const clubShortName = (clubId?: string): string => {
  if (!clubId) {
    return '---'
  }
  return clubStore.getClubById(clubId)?.shortName ?? clubId
}

// ФОРМИРУЕТ ЦВЕТА ЭМБЛЕМЫ КЛУБА
const clubBadgeStyle = (clubId?: string): Record<string, string> => {
  const club = clubId ? clubStore.getClubById(clubId) : undefined

  return {
    backgroundColor: club?.primaryColor ?? '#f1f5f9',
    borderColor: club?.secondaryColor ?? '#cbd5e1',
    color: club?.secondaryColor ?? '#475569',
  }
}

// ВОЗВРАЩАЕТ НАЗВАНИЕ РАУНДА
const roundLabel = (round?: CupRound): string => {
  if (!round) {
    return ''
  }

  const key = `cup.roundLabels.${round.id}`
  const label = t(key)
  return label === key ? round.name : label
}

// ВОЗВРАЩАЕТ ТЕКСТОВЫЙ СТАТУС РАУНДА
const roundStatusLabel = (round?: CupRound): string => {
  if (!round) {
    return ''
  }
  return round.status === 'completed' ? t('cup.roundCompleted') : t('cup.roundPending')
}

// ВОЗВРАЩАЕТ КЛАСС ОФОРМЛЕНИЯ СТАТУСА РАУНДА
const roundStatusClass = (round?: CupRound): string =>
  round?.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'

// ОПРЕДЕЛЯЕТ ПОБЕДИТЕЛЯ ПАРЫ
const tieWinnerClubId = (tie: CupTie): string | undefined => {
  const matchResult = tie.matchId ? matchById(tie.matchId)?.result : undefined
  return tie.winnerClubId ?? matchResult?.winnerClubId ?? matchResult?.penaltyWinnerClubId
}

// ПРОВЕРЯЕТ, ЯВЛЯЕТСЯ ЛИ КЛУБ ПОБЕДИТЕЛЕМ ПАРЫ
const isTieWinner = (tie: CupTie, clubId?: string): boolean =>
  Boolean(clubId && tieWinnerClubId(tie) === clubId)

// ПРОВЕРЯЕТ, ЯВЛЯЕТСЯ ЛИ КЛУБ ВЫБРАННЫМ
const isSelectedClub = (clubId?: string): boolean => clubId === gameStore.game?.selectedClubId

// ПРОВЕРЯЕТ УЧАСТИЕ ВЫБРАННОГО КЛУБА В ПАРЕ
const isSelectedTie = (tie: CupTie): boolean =>
  isSelectedClub(tie.homeClubId) || isSelectedClub(tie.awayClubId)

// ФОРМИРУЕТ КЛАССЫ НАЗВАНИЯ КОМАНДЫ
const teamNameClass = (tie: CupTie, clubId?: string): string[] => [
  'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold',
  isTieWinner(tie, clubId)
    ? 'text-emerald-700'
    : isSelectedClub(clubId)
      ? 'text-amber-700'
      : 'text-slate-700',
]

// ВОЗВРАЩАЕТ СЧЁТ КОМАНДЫ В ПАРЕ
const teamScore = (tie: CupTie, team: 'home' | 'away'): string => {
  const result = tie.matchId ? matchById(tie.matchId)?.result : undefined
  if (!result) {
    return '-'
  }
  return String(team === 'home' ? result.homeGoals : result.awayGoals)
}

// ВОЗВРАЩАЕТ ПОБЕДИТЕЛЯ СЕРИИ ПЕНАЛЬТИ
const penaltyWinnerName = (tie: CupTie): string | undefined => {
  const penaltyWinnerClubId = tie.matchId
    ? matchById(tie.matchId)?.result?.penaltyWinnerClubId
    : undefined
  return penaltyWinnerClubId ? clubName(penaltyWinnerClubId) : undefined
}

// ВОЗВРАЩАЕТ ДАТУ МАТЧА ПАРЫ
const tieDate = (tie: CupTie): string => {
  const match = tie.matchId ? matchById(tie.matchId) : undefined
  return match?.date ?? t('cup.dateTbd')
}

// ВОЗВРАЩАЕТ СТАТУС МАТЧА ПАРЫ
const tieStatusLabel = (tie: CupTie): string => {
  const match = tie.matchId ? matchById(tie.matchId) : undefined
  return match?.status === 'played' ? t('cup.tiePlayed') : t('cup.tieScheduled')
}
</script>

<template>
  <!-- СТРАНИЦА КУБКОВОГО ТУРНИРА -->
  <section
    v-if="gameStore.game"
    class="mx-auto flex h-full max-w-7xl flex-col gap-4 overflow-hidden"
  >
    <!-- ЗАГОЛОВОК И ИНФОРМАЦИЯ О ЧЕМПИОНЕ -->
    <header class="flex shrink-0 flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <div class="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600">
          {{ t('cup.heading', { name: gameStore.championship?.name ?? '' }) }}
        </div>
        <h1 class="mt-1 text-2xl font-black tracking-tight text-slate-950">{{ t('cup.title') }}</h1>
        <p class="mt-1 text-sm text-slate-600">
          {{ t('cup.description') }}
        </p>
      </div>

      <!-- ЗАГОЛОВОК И НАВИГАЦИЯ ПО РАУНДАМ -->
      <div
        v-if="championClub"
        class="rounded-lg bg-emerald-950 px-3 py-2 text-xs font-black text-emerald-50"
      >
        {{ t('cup.champion', { club: championClub.name }) }}
      </div>
    </header>

    <!-- СЕТКА АКТИВНОГО РАУНДА -->
    <article
      class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(20,46,38,0.08)]"
    >
      <!-- СОДЕРЖИМОЕ АКТИВНОГО РАУНДА -->
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
            {{
              t('cup.stageProgress', {
                current: visibleRounds.length ? activeRoundIndex + 1 : 0,
                total: visibleRounds.length,
              })
            }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-lg font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="!canMoveBack"
            :aria-label="t('cup.previousRound')"
            @click="moveRound(-1)"
          >
            ‹
          </button>
          <button
            type="button"
            class="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-lg font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="!canMoveForward"
            :aria-label="t('cup.nextRound')"
            @click="moveRound(1)"
          >
            ›
          </button>
        </div>
      </div>

      <div
        v-if="activeRound"
        class="grid min-h-0 flex-1 gap-4 overflow-hidden bg-slate-50/70 p-4"
        :class="hasRoundByes ? 'lg:grid-cols-[minmax(0,1fr)_300px]' : 'lg:grid-cols-1'"
      >
        <!-- СПИСОК КУБКОВЫХ ПАР -->
        <section
          class="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white"
        >
          <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 class="text-sm font-black text-slate-950">{{ t('cup.tiesTitle') }}</h3>
            <span class="text-xs font-bold text-slate-400">
              {{ t('cup.matchesCount', { count: activeRound.ties.length }) }}
            </span>
          </div>

          <div class="min-h-0 flex-1 overflow-auto px-4 py-2">
            <div
              v-for="tie in activeRound.ties"
              :key="tie.id"
              class="grid min-h-[86px] grid-cols-[minmax(0,1fr)_104px_minmax(0,1fr)] items-center gap-3 border-b border-slate-100 px-2 py-3 transition last:border-b-0 sm:grid-cols-[minmax(0,1fr)_136px_minmax(0,1fr)] sm:px-4"
              :class="
                isSelectedTie(tie)
                  ? 'rounded-xl border border-amber-300 bg-amber-50/90 shadow-[0_10px_28px_rgba(245,158,11,0.16)]'
                  : 'hover:bg-slate-50'
              "
            >
              <div class="flex min-w-0 items-center justify-end gap-3">
                <span
                  class="hidden min-w-0 text-right sm:block"
                  :class="teamNameClass(tie, tie.homeClubId)"
                >
                  {{ clubName(tie.homeClubId) }}
                </span>
                <span
                  class="grid h-10 w-10 shrink-0 place-items-center rounded-md border text-[10px] font-black shadow-sm sm:h-12 sm:w-12"
                  :style="clubBadgeStyle(tie.homeClubId)"
                >
                  {{ clubShortName(tie.homeClubId) }}
                </span>
              </div>

              <div class="grid justify-items-center gap-1 text-center">
                <div
                  class="flex items-center justify-center gap-2 text-2xl font-black leading-none text-slate-950 sm:text-3xl"
                >
                  <span>{{ teamScore(tie, 'home') }}</span>
                  <span class="text-slate-300">-</span>
                  <span>{{ teamScore(tie, 'away') }}</span>
                </div>
                <div
                  class="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-black uppercase tracking-wide text-cyan-600"
                >
                  {{ tieStatusLabel(tie) }} · {{ tieDate(tie) }}
                </div>
                <div
                  v-if="penaltyWinnerName(tie)"
                  class="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-bold text-amber-700"
                >
                  {{ t('cup.penalties', { club: penaltyWinnerName(tie) ?? '' }) }}
                </div>
              </div>

              <div class="flex min-w-0 items-center gap-3">
                <span
                  class="grid h-10 w-10 shrink-0 place-items-center rounded-md border text-[10px] font-black shadow-sm sm:h-12 sm:w-12"
                  :style="clubBadgeStyle(tie.awayClubId)"
                >
                  {{ clubShortName(tie.awayClubId) }}
                </span>
                <span class="hidden min-w-0 sm:block" :class="teamNameClass(tie, tie.awayClubId)">
                  {{ clubName(tie.awayClubId) }}
                </span>
              </div>
            </div>

            <div
              v-if="activeRound.ties.length === 0"
              class="grid min-h-[240px] place-items-center rounded-xl border border-dashed border-slate-300 bg-white text-center"
            >
              <div>
                <div class="text-sm font-black text-slate-700">{{ t('cup.emptyTiesTitle') }}</div>
                <p class="mt-1 text-xs text-slate-400">
                  {{ t('cup.emptyTiesHint') }}
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- КЛУБЫ БЕЗ МАТЧА В ТЕКУЩЕМ РАУНДЕ -->
        <aside
          v-if="hasRoundByes"
          class="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white"
        >
          <div class="border-b border-slate-100 px-4 py-3">
            <h3 class="text-sm font-black text-slate-950">{{ t('cup.byesTitle') }}</h3>
            <p class="mt-1 text-xs font-semibold text-slate-400">
              {{ t('cup.byesHint') }}
            </p>
          </div>

          <div class="min-h-0 flex-1 overflow-auto p-4">
            <div class="grid gap-2">
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
                <span
                  class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold text-slate-700"
                >
                  {{ clubName(clubId) }}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </article>
  </section>
</template>
