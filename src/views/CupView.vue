<script setup lang="ts">
import { computed, ref } from 'vue'
import { useClubStore } from '@/stores/clubStore'
import { useCompetitionStore } from '@/stores/competitionStore'
import { useGameStore } from '@/stores/gameStore'
import type { CupRound, CupTie, Match } from '@/types/football'

const gameStore = useGameStore()
const clubStore = useClubStore()
const competitionStore = useCompetitionStore()
const activeCupTab = ref<'main' | 'preliminary'>('main')
type BracketSide = 'left' | 'right'
const mainBracketRoundIds = ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final'] as const
type MainBracketRoundId = (typeof mainBracketRoundIds)[number]

interface BracketColumn {
  key: string
  round: CupRound
  side: BracketSide
  ties: CupTie[]
  expectedTieSlots: number
}

const mainBracketSideSlots = 8
const expectedSideTieSlots: Record<MainBracketRoundId, number> = {
  round_of_32: 8,
  round_of_16: 4,
  quarter_final: 2,
  semi_final: 1,
}

const cupRoundLabels: Record<string, string> = {
  preliminary: 'Отбор',
  round_of_32: '1/16',
  round_of_16: '1/8',
  quarter_final: '1/4',
  semi_final: '1/2',
  final: 'Финал',
}

const cupRounds = computed(() => competitionStore.cup?.rounds ?? [])
const mainBracketRounds = computed(() =>
  cupRounds.value.filter((round) => mainBracketRoundIds.includes(round.id as MainBracketRoundId)),
)
const preliminaryRound = computed(() => cupRounds.value.find((round) => round.id === 'preliminary'))
const finalRound = computed(() => cupRounds.value.find((round) => round.id === 'final'))
const finalTie = computed(() => finalRound.value?.ties[0])
const championClub = computed(() => {
  const championClubId = competitionStore.cup?.championClubId
  return championClubId ? clubStore.getClubById(championClubId) : undefined
})

const createBracketColumn = (
  round: CupRound,
  side: BracketSide,
  expectedTieSlots: number,
): BracketColumn => {
  const pivot = Math.ceil(round.ties.length / 2)

  return {
    key: `${side}-${round.id}`,
    round,
    side,
    ties: side === 'left' ? round.ties.slice(0, pivot) : round.ties.slice(pivot),
    expectedTieSlots,
  }
}

const leftBracketColumns = computed<BracketColumn[]>(() =>
  mainBracketRounds.value.map((round) =>
    createBracketColumn(round, 'left', expectedSideTieSlots[round.id as MainBracketRoundId] ?? 1),
  ),
)

const rightBracketColumns = computed<BracketColumn[]>(() =>
  [...mainBracketRounds.value]
    .reverse()
    .map((round) =>
      createBracketColumn(
        round,
        'right',
        expectedSideTieSlots[round.id as MainBracketRoundId] ?? 1,
      ),
    ),
)

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

const roundLabel = (round: CupRound): string => cupRoundLabels[round.id] ?? round.name

const roundStatusLabel = (round: CupRound): string =>
  round.status === 'completed' ? 'сыграно' : 'ожидает'

const roundStatusClass = (round: CupRound): string =>
  round.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'

const tieWinnerClubId = (tie: CupTie): string | undefined => {
  const matchResult = tie.matchId ? matchById(tie.matchId)?.result : undefined
  return tie.winnerClubId ?? matchResult?.winnerClubId ?? matchResult?.penaltyWinnerClubId
}

const isTieWinner = (tie: CupTie, clubId?: string): boolean =>
  Boolean(clubId && tieWinnerClubId(tie) === clubId)

const isSelectedClub = (clubId?: string): boolean => clubId === gameStore.game?.selectedClubId

const teamRowClass = (tie: CupTie, clubId?: string): string[] => [
  'grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-0.5 rounded border px-1 py-0 text-[0.6rem] leading-tight transition',
  isTieWinner(tie, clubId)
    ? 'border-emerald-300 bg-emerald-50 text-emerald-950 shadow-sm'
    : isSelectedClub(clubId)
      ? 'border-amber-300 bg-amber-50 text-amber-950'
      : 'border-slate-200 bg-white/90 text-slate-700',
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

const bracketGridStyle = (): Record<string, string> => ({
  gridTemplateRows: `repeat(${mainBracketSideSlots}, minmax(0, 1fr))`,
})

const tieSlotStyle = (column: BracketColumn, index: number): Record<string, string> => {
  const rowSpan = Math.max(1, mainBracketSideSlots / column.expectedTieSlots)
  return {
    gridRow: `${Math.floor(index * rowSpan) + 1} / span ${rowSpan}`,
  }
}

const emptyColumnStyle = (): Record<string, string> => ({
  gridRow: '1 / -1',
})
</script>

<template>
  <section v-if="gameStore.game" class="space-y-3">
    <div class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 class="text-xl font-bold text-slate-950">Кубок России</h1>
        <p class="mt-0.5 text-sm text-slate-600">Все стадии национального кубка.</p>
      </div>
    </div>

    <article
      class="overflow-hidden rounded-lg border border-white/70 bg-white/90 shadow-[0_18px_50px_rgba(20,46,38,0.1)]"
    >
      <div
        class="flex flex-col gap-2 border-b border-slate-200/80 px-4 py-3 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <h2 class="text-base font-semibold text-slate-950">
            {{ activeCupTab === 'main' ? 'Кубковая сетка' : 'Предварительный раунд' }}
          </h2>
          <p class="mt-0.5 text-xs text-slate-600">
            {{
              activeCupTab === 'main'
                ? 'Основная стадия идет от 1/16 к центральному финалу.'
                : 'Пары отбора и команды, которые проходят в 1/16 автоматически.'
            }}
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="inline-flex rounded-md border border-slate-200 bg-white p-1">
            <button
              type="button"
              class="rounded px-3 py-1.5 text-xs font-semibold"
              :class="activeCupTab === 'preliminary' ? 'bg-slate-950 text-white' : 'text-slate-600'"
              @click="activeCupTab = 'preliminary'"
            >
              Предварительный раунд
            </button>
            <button
              type="button"
              class="rounded px-3 py-1.5 text-xs font-semibold"
              :class="activeCupTab === 'main' ? 'bg-slate-950 text-white' : 'text-slate-600'"
              @click="activeCupTab = 'main'"
            >
              Кубок
            </button>
          </div>
          <div
            v-if="championClub"
            class="rounded-md bg-emerald-950 px-2.5 py-1.5 text-xs font-semibold text-emerald-50"
          >
            Победитель: {{ championClub.name }}
          </div>
        </div>
      </div>

      <div
        v-if="activeCupTab === 'main'"
        class="overflow-hidden bg-[linear-gradient(90deg,#14313b,#53657f_18%,#93a4a8_50%,#53657f_82%,#14313b)] p-2"
      >
        <div
          class="grid h-[calc(100dvh-315px)] min-h-[430px] max-h-[540px] grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,0.92fr)_minmax(0,0.86fr)_minmax(118px,1.05fr)_minmax(0,0.86fr)_minmax(0,0.92fr)_minmax(0,1fr)_minmax(0,1.15fr)] gap-1.5"
        >
          <section
            v-for="column in leftBracketColumns"
            :key="column.key"
            class="relative grid min-h-0 grid-rows-[28px_minmax(0,1fr)]"
          >
            <div
              class="flex min-h-[28px] items-center justify-between gap-1 rounded bg-white/20 px-1.5 py-1 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
            >
              <span class="text-xs font-black uppercase">{{ roundLabel(column.round) }}</span>
              <span
                class="rounded-full px-1.5 py-0.5 text-[0.55rem] font-bold leading-none"
                :class="roundStatusClass(column.round)"
              >
                {{ roundStatusLabel(column.round) }}
              </span>
            </div>

            <div
              class="pointer-events-none absolute bottom-3 right-[-0.25rem] top-10 border-r border-white/25"
            ></div>
            <div class="grid min-h-0 gap-1 pt-1" :style="bracketGridStyle()">
              <div v-if="!column.ties.length" class="flex items-center" :style="emptyColumnStyle()">
                <div
                  class="rounded border border-dashed border-white/40 bg-white/20 p-1.5 text-[0.62rem] font-semibold text-white/75"
                >
                  Пары появятся после предыдущей стадии.
                </div>
              </div>

              <div
                v-for="(tie, tieIndex) in column.ties"
                :key="tie.id"
                class="flex items-center"
                :style="tieSlotStyle(column, tieIndex)"
              >
                <div
                  class="w-full rounded border border-slate-300 bg-slate-50/95 p-0.5 shadow-[0_8px_16px_rgba(15,23,42,0.18)]"
                >
                  <div class="space-y-0.5 text-[0.6rem]">
                    <div :class="teamRowClass(tie, tie.homeClubId)">
                      <span
                        class="grid h-4 w-4 place-items-center rounded border text-[0.38rem] font-black"
                        :style="clubBadgeStyle(tie.homeClubId)"
                      >
                        {{ clubShortName(tie.homeClubId) }}
                      </span>
                      <span
                        class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-semibold"
                      >
                        {{ clubShortName(tie.homeClubId) }}
                      </span>
                      <span class="text-[0.68rem] font-black text-slate-950">{{
                        teamScore(tie, 'home')
                      }}</span>
                    </div>
                    <div :class="teamRowClass(tie, tie.awayClubId)">
                      <span
                        class="grid h-4 w-4 place-items-center rounded border text-[0.38rem] font-black"
                        :style="clubBadgeStyle(tie.awayClubId)"
                      >
                        {{ clubShortName(tie.awayClubId) }}
                      </span>
                      <span
                        class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-semibold"
                      >
                        {{ clubShortName(tie.awayClubId) }}
                      </span>
                      <span class="text-[0.68rem] font-black text-slate-950">{{
                        teamScore(tie, 'away')
                      }}</span>
                    </div>
                  </div>
                  <div
                    v-if="penaltyWinnerName(tie)"
                    class="mt-0.5 truncate text-[0.55rem] font-semibold leading-tight text-slate-500"
                  >
                    Пенальти: {{ penaltyWinnerName(tie) }}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section
            class="relative grid min-h-0 grid-rows-[28px_minmax(0,1fr)] rounded-md border border-white/25 bg-white/20 p-1.5 text-center text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
          >
            <div class="mx-auto rounded-full bg-white/20 px-2.5 py-1 text-xs font-black uppercase">
              {{ finalRound ? roundLabel(finalRound) : 'Финал' }}
            </div>

            <div class="flex min-h-0 flex-col items-center justify-center">
              <div class="relative h-20 w-20">
                <div
                  class="absolute left-1/2 top-1 h-10 w-14 -translate-x-1/2 rounded-b-[1.4rem] rounded-t border-[3px] border-slate-100 bg-[linear-gradient(135deg,#f8fafc,#94a3b8)] shadow-[0_10px_22px_rgba(15,23,42,0.24)]"
                ></div>
                <div
                  class="absolute left-0 top-5 h-7 w-7 rounded-l-full border-[3px] border-r-0 border-slate-100"
                ></div>
                <div
                  class="absolute right-0 top-5 h-7 w-7 rounded-r-full border-[3px] border-l-0 border-slate-100"
                ></div>
                <div
                  class="absolute left-1/2 top-[46px] h-5 w-4 -translate-x-1/2 bg-[linear-gradient(135deg,#e2e8f0,#94a3b8)]"
                ></div>
                <div
                  class="absolute bottom-3 left-1/2 h-3 w-11 -translate-x-1/2 rounded-t bg-[linear-gradient(135deg,#f8fafc,#94a3b8)]"
                ></div>
                <div
                  class="absolute bottom-0 left-1/2 h-3 w-16 -translate-x-1/2 rounded bg-slate-100 shadow-[0_8px_18px_rgba(15,23,42,0.2)]"
                ></div>
              </div>

              <div
                class="mt-3 w-full rounded-md border border-white/40 bg-white/95 p-2 text-left text-slate-900 shadow-[0_12px_24px_rgba(15,23,42,0.16)]"
              >
                <div class="mb-1 text-center text-[0.62rem] font-black uppercase text-slate-500">
                  Финалисты
                </div>
                <div v-if="finalTie" class="space-y-1.5">
                  <div :class="teamRowClass(finalTie, finalTie.homeClubId)">
                    <span
                      class="grid h-5 w-5 place-items-center rounded border text-[0.45rem] font-black"
                      :style="clubBadgeStyle(finalTie.homeClubId)"
                    >
                      {{ clubShortName(finalTie.homeClubId) }}
                    </span>
                    <span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-bold">
                      {{ clubName(finalTie.homeClubId) }}
                    </span>
                    <span class="text-sm font-black text-slate-950">{{
                      teamScore(finalTie, 'home')
                    }}</span>
                  </div>
                  <div :class="teamRowClass(finalTie, finalTie.awayClubId)">
                    <span
                      class="grid h-5 w-5 place-items-center rounded border text-[0.45rem] font-black"
                      :style="clubBadgeStyle(finalTie.awayClubId)"
                    >
                      {{ clubShortName(finalTie.awayClubId) }}
                    </span>
                    <span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-bold">
                      {{ clubName(finalTie.awayClubId) }}
                    </span>
                    <span class="text-sm font-black text-slate-950">{{
                      teamScore(finalTie, 'away')
                    }}</span>
                  </div>
                  <div
                    v-if="penaltyWinnerName(finalTie)"
                    class="truncate text-center text-[0.58rem] font-semibold text-slate-500"
                  >
                    Пенальти: {{ penaltyWinnerName(finalTie) }}
                  </div>
                </div>
                <div
                  v-else
                  class="rounded border border-dashed border-slate-300 p-2 text-center text-xs font-semibold text-slate-500"
                >
                  Финалисты определятся после полуфиналов.
                </div>
              </div>
            </div>
          </section>

          <section
            v-for="column in rightBracketColumns"
            :key="column.key"
            class="relative grid min-h-0 grid-rows-[28px_minmax(0,1fr)]"
          >
            <div
              class="flex min-h-[28px] items-center justify-between gap-1 rounded bg-white/20 px-1.5 py-1 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
            >
              <span class="text-xs font-black uppercase">{{ roundLabel(column.round) }}</span>
              <span
                class="rounded-full px-1.5 py-0.5 text-[0.55rem] font-bold leading-none"
                :class="roundStatusClass(column.round)"
              >
                {{ roundStatusLabel(column.round) }}
              </span>
            </div>

            <div
              class="pointer-events-none absolute bottom-3 left-[-0.25rem] top-10 border-l border-white/25"
            ></div>
            <div class="grid min-h-0 gap-1 pt-1" :style="bracketGridStyle()">
              <div v-if="!column.ties.length" class="flex items-center" :style="emptyColumnStyle()">
                <div
                  class="rounded border border-dashed border-white/40 bg-white/20 p-1.5 text-[0.62rem] font-semibold text-white/75"
                >
                  Пары появятся после предыдущей стадии.
                </div>
              </div>

              <div
                v-for="(tie, tieIndex) in column.ties"
                :key="tie.id"
                class="flex items-center"
                :style="tieSlotStyle(column, tieIndex)"
              >
                <div
                  class="w-full rounded border border-slate-300 bg-slate-50/95 p-0.5 shadow-[0_8px_16px_rgba(15,23,42,0.18)]"
                >
                  <div class="space-y-0.5 text-[0.6rem]">
                    <div :class="teamRowClass(tie, tie.homeClubId)">
                      <span
                        class="grid h-4 w-4 place-items-center rounded border text-[0.38rem] font-black"
                        :style="clubBadgeStyle(tie.homeClubId)"
                      >
                        {{ clubShortName(tie.homeClubId) }}
                      </span>
                      <span
                        class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-semibold"
                      >
                        {{ clubShortName(tie.homeClubId) }}
                      </span>
                      <span class="text-[0.68rem] font-black text-slate-950">{{
                        teamScore(tie, 'home')
                      }}</span>
                    </div>
                    <div :class="teamRowClass(tie, tie.awayClubId)">
                      <span
                        class="grid h-4 w-4 place-items-center rounded border text-[0.38rem] font-black"
                        :style="clubBadgeStyle(tie.awayClubId)"
                      >
                        {{ clubShortName(tie.awayClubId) }}
                      </span>
                      <span
                        class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-semibold"
                      >
                        {{ clubShortName(tie.awayClubId) }}
                      </span>
                      <span class="text-[0.68rem] font-black text-slate-950">{{
                        teamScore(tie, 'away')
                      }}</span>
                    </div>
                  </div>
                  <div
                    v-if="penaltyWinnerName(tie)"
                    class="mt-0.5 truncate text-[0.55rem] font-semibold leading-tight text-slate-500"
                  >
                    Пенальти: {{ penaltyWinnerName(tie) }}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div
        v-else
        class="grid h-[calc(100dvh-315px)] min-h-[430px] max-h-[540px] gap-3 overflow-hidden bg-[linear-gradient(135deg,#17323d,#53657f_58%,#8fa2a7)] p-3 lg:grid-cols-[minmax(0,1fr)_260px]"
      >
        <section class="min-h-0 rounded-md border border-white/25 bg-white/15 p-3">
          <div class="flex items-center justify-between gap-2 text-white">
            <h3 class="text-sm font-black uppercase">
              {{ preliminaryRound ? roundLabel(preliminaryRound) : 'Отбор' }}
            </h3>
            <span
              v-if="preliminaryRound"
              class="rounded-full px-2 py-1 text-[0.65rem] font-bold leading-none"
              :class="roundStatusClass(preliminaryRound)"
            >
              {{ roundStatusLabel(preliminaryRound) }}
            </span>
          </div>

          <div class="mt-3 grid h-[calc(100%-36px)] auto-rows-fr grid-cols-2 gap-2 lg:grid-cols-4">
            <div
              v-for="tie in preliminaryRound?.ties ?? []"
              :key="tie.id"
              class="flex items-center"
            >
              <div
                class="w-full rounded border border-slate-300 bg-slate-50/95 p-1.5 shadow-[0_8px_16px_rgba(15,23,42,0.18)]"
              >
                <div class="space-y-1 text-xs">
                  <div :class="teamRowClass(tie, tie.homeClubId)">
                    <span
                      class="grid h-5 w-5 place-items-center rounded border text-[0.45rem] font-black"
                      :style="clubBadgeStyle(tie.homeClubId)"
                    >
                      {{ clubShortName(tie.homeClubId) }}
                    </span>
                    <span
                      class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-semibold"
                    >
                      {{ clubName(tie.homeClubId) }}
                    </span>
                    <span class="text-sm font-black text-slate-950">{{
                      teamScore(tie, 'home')
                    }}</span>
                  </div>
                  <div :class="teamRowClass(tie, tie.awayClubId)">
                    <span
                      class="grid h-5 w-5 place-items-center rounded border text-[0.45rem] font-black"
                      :style="clubBadgeStyle(tie.awayClubId)"
                    >
                      {{ clubShortName(tie.awayClubId) }}
                    </span>
                    <span
                      class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-semibold"
                    >
                      {{ clubName(tie.awayClubId) }}
                    </span>
                    <span class="text-sm font-black text-slate-950">{{
                      teamScore(tie, 'away')
                    }}</span>
                  </div>
                </div>
                <div
                  v-if="penaltyWinnerName(tie)"
                  class="mt-1 truncate text-[0.62rem] font-semibold text-slate-500"
                >
                  Пенальти: {{ penaltyWinnerName(tie) }}
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside class="min-h-0 rounded-md border border-white/25 bg-white/15 p-3 text-white">
          <h3 class="text-sm font-black uppercase">Автопроход в 1/16</h3>
          <p class="mt-1 text-xs text-white/75">
            {{ preliminaryRound?.byes.length ?? 0 }} команд проходят без матча.
          </p>
          <div class="mt-3 grid grid-cols-2 gap-1.5">
            <span
              v-for="clubId in preliminaryRound?.byes ?? []"
              :key="clubId"
              class="truncate rounded bg-white/90 px-2 py-1 text-[0.68rem] font-black text-slate-800"
            >
              {{ clubShortName(clubId) }}
            </span>
          </div>
        </aside>
      </div>
    </article>
  </section>
</template>
