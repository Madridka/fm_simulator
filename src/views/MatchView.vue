<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { createMatchTimeline, type MatchTimeline } from '@/domain/match/matchSimulator'
import {
  autoSelectLineup,
  getFormationSlots,
  validateLineup,
} from '@/domain/season/squadSelectionService'
import { useClubStore } from '@/stores/clubs/clubsStore'
import { useGameStore } from '@/stores/game/gameStore'
import type {
  Club,
  ClubLineup,
  Match,
  MatchLineups,
  MatchResult,
  PlayedLineup,
  Player,
} from '@/types/football'

import ClubBadge from '@/components/ui/ClubBadge.vue'

type MatchSnapshot = MatchTimeline['minutes'][number]

const router = useRouter()
const gameStore = useGameStore()
const clubStore = useClubStore()
const timeline = ref<MatchTimeline | null>(null)
const currentMinute = ref(0)
const timerId = ref<number | null>(null)

const match = computed((): Match | undefined => gameStore.activeMatch)

const homeClub = computed((): Club | undefined =>
  match.value ? clubStore.getClubById(match.value.homeClubId) : undefined,
)

const awayClub = computed((): Club | undefined =>
  match.value ? clubStore.getClubById(match.value.awayClubId) : undefined,
)

const hashString = (value: string): number => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) % 2_147_483_647
  }
  return hash || 1
}

const buildPlayedLineup = (club: Club, lineup: ClubLineup): PlayedLineup => {
  const starters = getFormationSlots(lineup.formation)
    .map((slot) => lineup.starters[slot.id])
    .filter((playerId): playerId is string => typeof playerId === 'string')

  if (starters.length !== 11) {
    const fallback = autoSelectLineup(club, lineup.formation, lineup.tacticalStyle)
    return buildPlayedLineup(club, fallback)
  }

  return {
    formation: lineup.formation,
    tacticalStyle: lineup.tacticalStyle,
    starters,
  }
}

const preparedLineups = computed((): MatchLineups | undefined => {
  const game = gameStore.game
  const currentMatch = match.value
  const home = homeClub.value
  const away = awayClub.value

  if (!game || !currentMatch || !home || !away) {
    return undefined
  }

  if (currentMatch.lineups) {
    return currentMatch.lineups
  }

  const homeLineup =
    currentMatch.homeClubId === game.selectedClubId
      ? game.lineups[currentMatch.homeClubId]
      : autoSelectLineup(
          home,
          game.lineups[currentMatch.homeClubId]?.formation ?? '4-4-2',
          game.lineups[currentMatch.homeClubId]?.tacticalStyle ?? 'balanced',
        )
  const awayLineup =
    currentMatch.awayClubId === game.selectedClubId
      ? game.lineups[currentMatch.awayClubId]
      : autoSelectLineup(
          away,
          game.lineups[currentMatch.awayClubId]?.formation ?? '4-4-2',
          game.lineups[currentMatch.awayClubId]?.tacticalStyle ?? 'balanced',
        )

  if (!homeLineup || !awayLineup) {
    return undefined
  }

  return {
    home: buildPlayedLineup(home, homeLineup),
    away: buildPlayedLineup(away, awayLineup),
  }
})

const userValidation = computed(() => {
  const game = gameStore.game
  const currentMatch = match.value
  if (!game || !currentMatch) {
    return { valid: false, errors: ['Матч не найден.'] }
  }

  const userClub = clubStore.getClubById(game.selectedClubId)
  const lineup = game.lineups[game.selectedClubId]
  if (!userClub || !lineup) {
    return { valid: false, errors: ['Состав не выбран.'] }
  }

  return validateLineup(userClub, lineup)
})

const isUserMatch = computed((): boolean => {
  const game = gameStore.game
  const currentMatch = match.value
  return Boolean(
    game &&
    currentMatch &&
    (currentMatch.homeClubId === game.selectedClubId ||
      currentMatch.awayClubId === game.selectedClubId),
  )
})

const isPlayableMatch = computed(
  (): boolean => match.value?.status === 'scheduled' && gameStore.nextMatch?.id === match.value.id,
)

const canSimulate = computed((): boolean =>
  Boolean(isUserMatch.value && isPlayableMatch.value && userValidation.value.valid),
)

const currentResult = computed<MatchResult | undefined>(() => {
  if (match.value?.result) {
    return match.value.result
  }
  return currentMinute.value >= 90 ? timeline.value?.finalResult : undefined
})

const emptySnapshot = (): MatchSnapshot => ({
  minute: 0,
  homeGoals: 0,
  awayGoals: 0,
  goals: [],
  stats: {
    home: { possession: 50, shots: 0, shotsOnTarget: 0, yellowCards: 0 },
    away: { possession: 50, shots: 0, shotsOnTarget: 0, yellowCards: 0 },
  },
})

const visibleSnapshot = computed<MatchSnapshot>(() => {
  if (!timeline.value || currentMinute.value === 0) {
    return emptySnapshot()
  }
  return (
    timeline.value.minutes[currentMinute.value - 1] ??
    timeline.value.minutes[timeline.value.minutes.length - 1] ??
    emptySnapshot()
  )
})

const allPlayers = computed<Player[]>(() => {
  const home = homeClub.value?.squad ?? []
  const away = awayClub.value?.squad ?? []
  return [...home, ...away]
})

const playerName = (playerId?: string): string => {
  if (!playerId) {
    return '-'
  }
  const player = allPlayers.value.find((candidate) => candidate.id === playerId)
  return player ? `${player.firstName} ${player.lastName}` : playerId
}

const ensureTimeline = (): MatchTimeline | undefined => {
  const currentMatch = match.value
  const home = homeClub.value
  const away = awayClub.value
  const lineups = preparedLineups.value
  const game = gameStore.game

  if (!currentMatch || !home || !away || !lineups || !game) {
    return undefined
  }

  if (!timeline.value) {
    timeline.value = createMatchTimeline({
      matchId: currentMatch.id,
      homeClub: home,
      awayClub: away,
      homeLineup: lineups.home,
      awayLineup: lineups.away,
      neutralVenue: currentMatch.neutralVenue,
      allowPenaltyShootout: currentMatch.type === 'cup',
      seed: hashString(currentMatch.id) + game.season * 10_000,
    })
  }

  return timeline.value
}

const clearTimer = (): void => {
  if (timerId.value !== null) {
    window.clearInterval(timerId.value)
    timerId.value = null
  }
}

const finish = (result: MatchResult): void => {
  clearTimer()
  const currentMatch = match.value
  if (currentMatch?.status === 'scheduled' && isPlayableMatch.value) {
    gameStore.completeMatch(currentMatch.id, result)
  }
}

const nextMinute = (): void => {
  const currentTimeline = ensureTimeline()
  if (!currentTimeline) {
    return
  }

  currentMinute.value = Math.min(90, currentMinute.value + 1)
  if (currentMinute.value >= 90) {
    finish(currentTimeline.finalResult)
  }
}

const startSimulation = (): void => {
  if (!canSimulate.value || timerId.value !== null || currentMinute.value >= 90) {
    return
  }

  ensureTimeline()
  timerId.value = window.setInterval(() => {
    nextMinute()
  }, 130)
}

const instantResult = (): void => {
  if (!canSimulate.value) {
    return
  }
  const currentTimeline = ensureTimeline()
  if (!currentTimeline) {
    return
  }
  currentMinute.value = 90
  finish(currentTimeline.finalResult)
}

const goBack = (): void => {
  gameStore.clearActiveMatch()
  void router.push('/dashboard')
}

watch(
  () => match.value?.id,
  () => {
    clearTimer()
    timeline.value = null
    currentMinute.value = 0
  },
)

watch(
  canSimulate,
  (ready) => {
    if (ready) {
      startSimulation()
    } else {
      clearTimer()
    }
  },
  { immediate: true },
)

onBeforeUnmount(clearTimer)
</script>

<template>
  <section v-if="match && homeClub && awayClub" class="space-y-5">
    <div
      class="rounded-lg border border-white/70 bg-[linear-gradient(135deg,rgba(236,253,245,0.96),rgba(255,255,255,0.96)),#ffffff] p-5 shadow-[0_18px_50px_rgba(20,46,38,0.1)]"
    >
      <div class="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <div class="flex items-center gap-3">
          <ClubBadge :club="homeClub" size="lg" />
          <div>
            <h1 class="text-xl font-bold text-slate-950">{{ homeClub.name }}</h1>
            <div class="text-sm text-slate-500">Хозяева</div>
          </div>
        </div>
        <div class="text-center">
          <div
            class="min-w-[156px] rounded-lg bg-[linear-gradient(135deg,#10251f,#17603d)] px-5 py-2.5 text-[2.75rem] font-black leading-none text-emerald-50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
          >
            {{ match.result?.homeGoals ?? visibleSnapshot.homeGoals }}:{{
              match.result?.awayGoals ?? visibleSnapshot.awayGoals
            }}
          </div>
          <div class="mt-1 text-sm font-semibold text-slate-500">
            {{ match.status === 'played' ? 'Матч завершен' : `${visibleSnapshot.minute}'` }}
          </div>
          <div class="mt-3 grid min-w-[220px] justify-items-center gap-2">
            <template v-if="match.status === 'scheduled' && isPlayableMatch">
              <div
                v-if="canSimulate"
                class="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-extrabold text-emerald-800"
              >
                Симуляция идет автоматически
              </div>
              <Button
                class="min-w-[220px]"
                :disabled="!canSimulate"
                severity="success"
                label="Мгновенный расчет"
                @click="instantResult"
              />
              <RouterLink v-if="!userValidation.valid" to="/squad">
                <Button class="min-w-[220px]" severity="danger" label="Исправить состав" />
              </RouterLink>
            </template>
            <template v-else-if="match.status === 'played'">
              <div class="rounded-lg bg-slate-100 px-3 py-2 text-sm font-extrabold text-slate-700">
                Матч завершен
              </div>
              <Button class="min-w-[220px]" label="Назад к обзору" @click="goBack" />
            </template>
          </div>
        </div>
        <div class="flex items-center gap-3 md:justify-end">
          <div class="text-right">
            <h1 class="text-xl font-bold text-slate-950">{{ awayClub.name }}</h1>
            <div class="text-sm text-slate-500">Гости</div>
          </div>
          <ClubBadge :club="awayClub" size="lg" />
        </div>
      </div>

      <div
        v-if="match.status === 'scheduled' && isUserMatch && !isPlayableMatch"
        class="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        Этот матч еще не доступен. Сначала сыграйте ближайший матч сезона.
      </div>

      <div
        v-if="!userValidation.valid && match.status === 'scheduled' && isUserMatch"
        class="mt-4 space-y-2"
      >
        <div
          v-for="error in userValidation.errors"
          :key="error"
          class="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          {{ error }}
        </div>
      </div>
    </div>

    <div class="grid gap-5 lg:grid-cols-2">
      <div
        class="rounded-lg border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(20,46,38,0.1)]"
      >
        <h2 class="text-lg font-semibold text-slate-950">Составы</h2>
        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <div class="mb-2 font-semibold text-slate-950">
              {{ homeClub.shortName }} · {{ preparedLineups?.home.formation }}
            </div>
            <div class="space-y-1 text-sm text-slate-700">
              <div
                v-for="playerId in preparedLineups?.home.starters"
                :key="playerId"
                class="rounded bg-slate-50 px-2 py-1"
              >
                {{ playerName(playerId) }}
              </div>
            </div>
          </div>
          <div>
            <div class="mb-2 font-semibold text-slate-950">
              {{ awayClub.shortName }} · {{ preparedLineups?.away.formation }}
            </div>
            <div class="space-y-1 text-sm text-slate-700">
              <div
                v-for="playerId in preparedLineups?.away.starters"
                :key="playerId"
                class="rounded bg-slate-50 px-2 py-1"
              >
                {{ playerName(playerId) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        class="rounded-lg border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(20,46,38,0.1)]"
      >
        <h2 class="text-lg font-semibold text-slate-950">Статистика</h2>
        <div class="mt-4 space-y-3">
          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
            <span class="text-right font-semibold"
              >{{
                match.result?.stats.home.possession ?? visibleSnapshot.stats.home.possession
              }}%</span
            >
            <span class="text-slate-500">Владение</span>
            <span class="font-semibold"
              >{{
                match.result?.stats.away.possession ?? visibleSnapshot.stats.away.possession
              }}%</span
            >
          </div>
          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
            <span class="text-right font-semibold">{{
              match.result?.stats.home.shots ?? visibleSnapshot.stats.home.shots
            }}</span>
            <span class="text-slate-500">Удары</span>
            <span class="font-semibold">{{
              match.result?.stats.away.shots ?? visibleSnapshot.stats.away.shots
            }}</span>
          </div>
          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
            <span class="text-right font-semibold">{{
              match.result?.stats.home.shotsOnTarget ?? visibleSnapshot.stats.home.shotsOnTarget
            }}</span>
            <span class="text-slate-500">В створ</span>
            <span class="font-semibold">{{
              match.result?.stats.away.shotsOnTarget ?? visibleSnapshot.stats.away.shotsOnTarget
            }}</span>
          </div>
          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
            <span class="text-right font-semibold">{{
              match.result?.stats.home.yellowCards ?? visibleSnapshot.stats.home.yellowCards
            }}</span>
            <span class="text-slate-500">Желтые</span>
            <span class="font-semibold">{{
              match.result?.stats.away.yellowCards ?? visibleSnapshot.stats.away.yellowCards
            }}</span>
          </div>
        </div>
        <div v-if="currentResult" class="mt-5 rounded-md bg-slate-50 p-3 text-sm">
          Лучший игрок:
          <span class="font-semibold text-slate-950">{{
            playerName(currentResult.bestPlayerId)
          }}</span>
        </div>
      </div>
    </div>

    <div
      class="rounded-lg border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(20,46,38,0.1)]"
    >
      <h2 class="text-lg font-semibold text-slate-950">Голы</h2>
      <div v-if="(match.result?.goals ?? visibleSnapshot.goals).length" class="mt-3 space-y-2">
        <div
          v-for="goal in match.result?.goals ?? visibleSnapshot.goals"
          :key="`${goal.minute}-${goal.playerId}`"
          class="rounded-md bg-slate-50 px-3 py-2 text-sm"
        >
          {{ goal.minute }}' · {{ goal.playerName }} ·
          {{ clubStore.getClubById(goal.clubId)?.name }}
        </div>
      </div>
      <div v-else class="mt-3 text-sm text-slate-600">Голов пока нет.</div>
      <div
        v-if="match.result?.penaltyWinnerClubId"
        class="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800"
      >
        Победитель серии пенальти:
        {{ clubStore.getClubById(match.result.penaltyWinnerClubId)?.name }}
      </div>
    </div>
  </section>
  <section
    v-else
    class="rounded-lg border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(20,46,38,0.1)]"
  >
    Матч не найден.
  </section>
</template>
