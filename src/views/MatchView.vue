<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter } from 'vue-router'
import { createLiveMatch, type LiveMatchController } from '@/domain/match/liveMatchEngine'
import {
  LIVE_MATCH_REAL_MS_PER_GAME_MINUTE,
  LIVE_MATCH_SPEED_MULTIPLIERS,
  type LiveMatchSpeedMultiplier,
} from '@/config/matchSimulationConfig'
import {
  autoSelectLineup,
  getFormationSlots,
  validateLineup,
} from '@/domain/season/squadSelectionService'
import { isPlayerUnavailable } from '@/domain/season/playerAvailability'
import { useClubStore } from '@/stores/clubs/clubsStore'
import { useGameStore } from '@/stores/game/gameStore'
import type {
  Club,
  ClubLineup,
  Match,
  MatchLineups,
  MatchResult,
  MatchTactics,
  PlayedLineup,
  Player,
} from '@/types/football'

import Select from 'primevue/select'
import FloatLabel from 'primevue/floatlabel'

import ClubBadge from '@/components/ui/ClubBadge.vue'

interface MatchSnapshot {
  minute: number
  homeGoals: number
  awayGoals: number
  goals: MatchResult['goals']
  stats: MatchResult['stats']
}

// ЗАВИСИМОСТИ ЭКРАНА И ИСТОЧНИКИ ДАННЫХ АКТИВНОГО МАТЧА
const router = useRouter()
const gameStore = useGameStore()
const clubStore = useClubStore()
const { t } = useI18n()
// ИЗМЕНЯЕМОЕ СОСТОЯНИЕ ПОМИНУТНОЙ СИМУЛЯЦИИ И ФОНОВОГО ЗАВЕРШЕНИЯ
const liveMatch = ref<LiveMatchController | null>(null)
const currentMinute = ref(0)
const revision = ref(0)
const timerId = ref<number | null>(null)
const isPaused = ref(false)
const simulationSpeed = ref<LiveMatchSpeedMultiplier>(1)
const isCalculating = ref(false)
const calculationError = ref('')
const selectedPlayerOutId = ref('')
const selectedPlayerInId = ref('')
let matchCompletionPromise: Promise<void> | null = null

// ВОЗВРАЩАЕТ АКТИВНЫЙ МАТЧ
const match = computed((): Match | undefined => gameStore.activeMatch)

const preparedContext = computed(() =>
  gameStore.preparedMatchContext?.matchId === match.value?.id
    ? gameStore.preparedMatchContext
    : undefined,
)

// ВОЗВРАЩАЕТ ДОМАШНИЙ КЛУБ
const homeClub = computed(
  (): Club | undefined =>
    preparedContext.value?.homeClub ??
    (match.value ? clubStore.getClubById(match.value.homeClubId) : undefined),
)

// ВОЗВРАЩАЕТ ГОСТЕВОЙ КЛУБ
const awayClub = computed(
  (): Club | undefined =>
    preparedContext.value?.awayClub ??
    (match.value ? clubStore.getClubById(match.value.awayClubId) : undefined),
)

// СОЗДАЁТ ЧИСЛОВОЙ ХЕШ ИЗ СТРОКИ
const hashString = (value: string): number => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) % 2_147_483_647
  }
  return hash || 1
}

// ФОРМИРУЕТ СОСТАВ КЛУБА ДЛЯ СИМУЛЯЦИИ
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
    substitutes: [...new Set(lineup.substitutes)].filter(
      (playerId) => !starters.includes(playerId),
    ),
  }
}

// ПОДГОТАВЛИВАЕТ СОСТАВЫ ОБЕИХ КОМАНД
const preparedLineups = computed((): MatchLineups | undefined => {
  void revision.value
  const game = gameStore.game
  const currentMatch = match.value
  const home = homeClub.value
  const away = awayClub.value

  if (!game || !currentMatch || !home || !away) {
    return undefined
  }

  if (liveMatch.value) {
    const state = liveMatch.value.state
    const original = preparedContext.value?.lineups ?? currentMatch.lineups
    if (original) {
      return {
        home: {
          ...original.home,
          starters: [...state.homeLineupPlayerIds],
          substitutes: [...state.homeBenchPlayerIds],
        },
        away: {
          ...original.away,
          starters: [...state.awayLineupPlayerIds],
          substitutes: [...state.awayBenchPlayerIds],
        },
      }
    }
  }

  if (preparedContext.value) {
    return preparedContext.value.lineups
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

// ПРОВЕРЯЕТ КОРРЕКТНОСТЬ СОСТАВА ИГРОКА
const userValidation = computed(() => {
  const game = gameStore.game
  const currentMatch = match.value
  if (!game || !currentMatch) {
    return { valid: false, errors: [t('match.notFound')] }
  }

  const userClub = clubStore.getClubById(game.selectedClubId)
  const lineup = game.lineups[game.selectedClubId]
  if (!userClub || !lineup) {
    return { valid: false, errors: [t('match.lineupNotSelected')] }
  }

  return validateLineup(userClub, lineup)
})

// ПРОВЕРЯЕТ УЧАСТИЕ КЛУБА ИГРОКА В МАТЧЕ
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

// ПРОВЕРЯЕТ ДОСТУПНОСТЬ МАТЧА ДЛЯ ИГРЫ
const isPlayableMatch = computed(
  (): boolean => match.value?.status === 'scheduled' && gameStore.nextMatch?.id === match.value.id,
)

// ПРОВЕРЯЕТ ВОЗМОЖНОСТЬ ЗАПУСКА СИМУЛЯЦИИ
const canSimulate = computed((): boolean =>
  Boolean(
    isUserMatch.value &&
    isPlayableMatch.value &&
    userValidation.value.valid &&
    preparedContext.value,
  ),
)

// ВОЗВРАЩАЕТ ТЕКУЩИЙ ИЛИ ИТОГОВЫЙ РЕЗУЛЬТАТ
const currentResult = computed<MatchResult | undefined>(() => {
  if (match.value?.result) {
    return match.value.result
  }
  return currentMinute.value >= 90 ? liveMatch.value?.result() : undefined
})

// СОЗДАЁТ ПУСТОЙ СНИМОК СОСТОЯНИЯ МАТЧА
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

const mentalityOptions = [
  { label: 'Оборона', value: 'defensive' },
  { label: 'Баланс', value: 'balanced' },
  { label: 'Атака', value: 'attacking' },
  { label: 'Навал', value: 'allOutAttack' },
]

const pressingOptions = [
  { label: 'Низкий', value: 'low' },
  { label: 'Баланс', value: 'balanced' },
  { label: 'Высокий', value: 'high' },
]

const tempoOptions = [
  { label: 'Медленный', value: 'slow' },
  { label: 'Баланс', value: 'balanced' },
  { label: 'Быстрый', value: 'fast' },
]

const widthOptions = [
  { label: 'Узко', value: 'narrow' },
  { label: 'Баланс', value: 'balanced' },
  { label: 'Широко', value: 'wide' },
]

const defensiveLineOptions = [
  { label: 'Низкая', value: 'low' },
  { label: 'Средняя', value: 'medium' },
  { label: 'Высокая', value: 'high' },
]

const playerOutOptions = computed(() =>
  userLineupIds.value.map((id) => ({
    label: `${playerPosition(id)} · ${playerName(id)}`,
    value: id,
  })),
)

const playerInOptions = computed(() =>
  userBenchIds.value.map((id) => ({
    label: `${playerPosition(id)} · ${playerName(id)}`,
    value: id,
  })),
)

// ВОЗВРАЩАЕТ СОСТОЯНИЕ МАТЧА НА ТЕКУЩЕЙ МИНУТЕ
const visibleSnapshot = computed<MatchSnapshot>(() => {
  void revision.value
  if (!liveMatch.value) {
    return emptySnapshot()
  }
  const result = liveMatch.value.result()
  return {
    minute: liveMatch.value.state.minute,
    homeGoals: liveMatch.value.state.homeScore,
    awayGoals: liveMatch.value.state.awayScore,
    goals: result.goals,
    stats: result.stats,
  }
})

// ВОЗВРАЩАЕТ ВИДИМЫЕ СОБЫТИЯ С ГОЛАМИ
const visibleGoals = computed(() => match.value?.result?.goals ?? visibleSnapshot.value.goals)

// ВОЗВРАЩАЕТ ДЕТАЛИ ПОЛНОЙ СИМУЛЯЦИИ
const detailedResult = computed<MatchResult | undefined>(() => {
  void revision.value
  return match.value?.result ?? liveMatch.value?.result()
})

// ВОЗВРАЩАЕТ ДОСТУПНУЮ ТЕКСТОВУЮ ТРАНСЛЯЦИЮ
const visibleCommentary = computed(() =>
  (detailedResult.value?.commentary ?? []).filter(
    (event) => match.value?.status === 'played' || event.minute <= currentMinute.value,
  ),
)

// РЕВЕРС КОММЕНТАРИЕВ
const reversedVisibleCommentary = computed(() => {
  return [...visibleCommentary.value].reverse()
})

interface PlayerEventMarker {
  key: string
  label: string
  title: string
  className: string
}

// ПРОВЕРЯЕТ, НАСТУПИЛА ЛИ МИНУТА СОБЫТИЯ В ТЕКУЩЕЙ ТРАНСЛЯЦИИ
const isMatchEventVisible = (minute?: number): boolean =>
  match.value?.status === 'played' || (minute ?? 0) <= currentMinute.value

// СОБИРАЕТ ВИДИМЫЕ ГОЛЫ, КАРТОЧКИ, ТРАВМЫ И ЗАМЕНЫ ОДНОГО ИГРОКА
const playerEventMarkers = (clubId: string, playerId: string): PlayerEventMarker[] => {
  const result = detailedResult.value
  if (!result) {
    return []
  }

  const markers: PlayerEventMarker[] = []

  result.goals
    .filter(
      (goal) =>
        goal.clubId === clubId && goal.playerId === playerId && isMatchEventVisible(goal.minute),
    )
    .forEach((goal, index) =>
      markers.push({
        key: `goal-${goal.minute}-${index}`,
        label: '⚽',
        title: t('match.markers.goal', { minute: goal.minute }),
        className: 'bg-emerald-100 text-emerald-800',
      }),
    )
  ;(result.cards ?? [])
    .filter(
      (card) =>
        card.clubId === clubId && card.playerId === playerId && isMatchEventVisible(card.minute),
    )
    .forEach((card, index) =>
      markers.push({
        key: `${card.card}-${card.minute ?? 0}-${index}`,
        label:
          card.dismissalReason === 'second-yellow' ? '🟨🟥' : card.card === 'red' ? '🟥' : '🟨',
        title: t(
          card.dismissalReason === 'second-yellow'
            ? 'match.markers.secondYellow'
            : card.card === 'red'
              ? 'match.markers.redCard'
              : 'match.markers.yellowCard',
          {
            minute: card.minute ? t('match.markers.minuteSuffix', { minute: card.minute }) : '',
          },
        ),
        className:
          card.card === 'red' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800',
      }),
    )
  ;(result.injuries ?? [])
    .filter(
      (injury) =>
        injury.clubId === clubId &&
        injury.playerId === playerId &&
        isMatchEventVisible(injury.minute),
    )
    .forEach((injury, index) =>
      markers.push({
        key: `injury-${injury.minute ?? 0}-${index}`,
        label: '✚',
        title: t('match.markers.injury', {
          minute: injury.minute ? t('match.markers.minuteSuffix', { minute: injury.minute }) : '',
        }),
        className: 'bg-orange-100 text-orange-800',
      }),
    )
  ;(result.substitutions ?? [])
    .filter(
      (substitution) => substitution.clubId === clubId && isMatchEventVisible(substitution.minute),
    )
    .forEach((substitution, index) => {
      if (substitution.playerOutId === playerId) {
        markers.push({
          key: `sub-out-${substitution.minute}-${index}`,
          label: `${substitution.minute}' ↓`,
          title: t('match.markers.substituted', { minute: substitution.minute }),
          className: 'bg-rose-100 text-rose-700',
        })
      }
      if (substitution.playerInId === playerId) {
        markers.push({
          key: `sub-in-${substitution.minute}-${index}`,
          label: `${substitution.minute}' ↑`,
          title: t('match.markers.cameOn', { minute: substitution.minute }),
          className: 'bg-sky-100 text-sky-700',
        })
      }
    })

  return markers
}

// ВОЗВРАЩАЕТ ДОСТУПНЫХ ЗАПАСНЫХ, НЕ ВХОДЯЩИХ В СТАРТОВЫЙ СОСТАВ
const benchPlayers = (club: Club, substitutes: readonly string[] = []): Player[] => {
  const playersById = new Map(club.squad.map((player) => [player.id, player]))
  return substitutes
    .map((playerId) => playersById.get(playerId))
    .filter((player): player is Player => player !== undefined && !isPlayerUnavailable(player))
}

// ОБЪЕДИНЯЕТ ИГРОКОВ ОБЕИХ КОМАНД
const allPlayers = computed<Player[]>(() => {
  const home = homeClub.value?.squad ?? []
  const away = awayClub.value?.squad ?? []
  return [...home, ...away]
})

// ВОЗВРАЩАЕТ РОДНУЮ ПОЗИЦИЮ ИГРОКА ДЛЯ СТРОКИ СОСТАВА
const playerPosition = (playerId: string): string =>
  allPlayers.value.find((player) => player.id === playerId)?.position ?? '—'

// ВОЗВРАЩАЕТ ИМЯ ИГРОКА ПО ИДЕНТИФИКАТОРУ
const playerName = (playerId?: string): string => {
  if (!playerId) {
    return t('common.dash')
  }
  const player = allPlayers.value.find((candidate) => candidate.id === playerId)
  return player ? `${player.firstName} ${player.lastName}` : playerId
}

// СОЗДАЁТ ИЛИ ВОЗВРАЩАЕТ УПРАВЛЯЕМОЕ СОСТОЯНИЕ МАТЧА
const ensureLiveMatch = (): LiveMatchController | undefined => {
  const currentMatch = match.value
  const home = homeClub.value
  const away = awayClub.value
  const lineups = preparedLineups.value
  const game = gameStore.game

  if (!currentMatch || !home || !away || !lineups || !game) {
    return undefined
  }

  if (!liveMatch.value) {
    const playoffTie = currentMatch.playoffId
      ? game.playoffs
          ?.find((playoff) => playoff.id === currentMatch.playoffId)
          ?.stages.flatMap((stage) => stage.ties)
          .find((tie) => tie.id === currentMatch.playoffTieId)
      : undefined
    liveMatch.value = createLiveMatch({
      matchId: currentMatch.id,
      homeClub: home,
      awayClub: away,
      homeLineup: lineups.home,
      awayLineup: lineups.away,
      neutralVenue: currentMatch.neutralVenue,
      allowPenaltyShootout:
        currentMatch.type === 'cup' || playoffTie?.matchIds.at(-1) === currentMatch.id,
      seed: hashString(currentMatch.id) + game.season * 10_000,
      controlledTeamId: game.selectedClubId,
    })
  }

  return liveMatch.value
}

// ЗАВЕРШАЕТ МАТЧ И СОХРАНЯЕТ РЕЗУЛЬТАТ
const finish = async (result: MatchResult): Promise<void> => {
  stopSimulationTimer()
  const currentMatch = match.value
  if (
    !currentMatch ||
    currentMatch.status !== 'scheduled' ||
    !isPlayableMatch.value ||
    isCalculating.value
  ) {
    return
  }

  isCalculating.value = true
  calculationError.value = ''
  const completion = gameStore.completeMatchAsync(currentMatch.id, result)
  matchCompletionPromise = completion
  try {
    await completion
  } catch (error) {
    calculationError.value = error instanceof Error ? error.message : t('match.errors.calculateDay')
  } finally {
    if (matchCompletionPromise === completion) {
      matchCompletionPromise = null
    }
    isCalculating.value = false
  }
}

// ОСТАНАВЛИВАЕТ АВТОМАТИЧЕСКИЙ ХОД МАТЧА
function stopSimulationTimer(): void {
  if (timerId.value === null) return
  window.clearInterval(timerId.value)
  timerId.value = null
}

// ПРОСЧИТЫВАЕТ ОДНУ ИГРОВУЮ МИНУТУ
const advanceOneMinute = (): void => {
  if (!canSimulate.value || isCalculating.value) return
  const controller = ensureLiveMatch()
  if (!controller) return
  controller.advance(1)
  currentMinute.value = controller.state.minute
  revision.value += 1
  if (currentMinute.value >= 90) void finish(controller.result())
}

// ЗАПУСКАЕТ МАТЧ В БАЗОВОЙ СКОРОСТИ x1
const startSimulationTimer = (): void => {
  if (!canSimulate.value || isPaused.value || timerId.value !== null || currentMinute.value >= 90)
    return
  ensureLiveMatch()
  timerId.value = window.setInterval(
    advanceOneMinute,
    LIVE_MATCH_REAL_MS_PER_GAME_MINUTE / simulationSpeed.value,
  )
}

// МЕНЯЕТ МНОЖИТЕЛЬ СКОРОСТИ И СРАЗУ ПЕРЕЗАПУСКАЕТ ИДУЩИЙ МАТЧ
const setSimulationSpeed = (speed: LiveMatchSpeedMultiplier): void => {
  if (simulationSpeed.value === speed) return
  simulationSpeed.value = speed
  if (!isPaused.value) {
    stopSimulationTimer()
    startSimulationTimer()
  }
}

// СТАВИТ МАТЧ НА ПАУЗУ ИЛИ ПРОДОЛЖАЕТ ЕГО
const togglePause = (): void => {
  isPaused.value = !isPaused.value
  if (isPaused.value) stopSimulationTimer()
  else startSimulationTimer()
}

const userTeamId = computed(() => gameStore.game?.selectedClubId ?? '')
const userTactics = computed<MatchTactics>(() => {
  void revision.value
  const state = liveMatch.value?.state
  if (!state)
    return {
      mentality: 'balanced',
      pressing: 'balanced',
      tempo: 'balanced',
      width: 'balanced',
      defensiveLine: 'medium',
    }
  return userTeamId.value === state.homeTeamId ? state.homeTactics : state.awayTactics
})
const substitutionsRemaining = computed(() => {
  void revision.value
  const state = liveMatch.value?.state
  if (!state) return 5
  const used =
    userTeamId.value === state.homeTeamId
      ? state.homeSubstitutionsUsed
      : state.awaySubstitutionsUsed
  return state.maxSubstitutions - used
})
const userLineupIds = computed(() => {
  void revision.value
  const state = liveMatch.value?.state
  if (!state) return []
  return userTeamId.value === state.homeTeamId
    ? state.homeLineupPlayerIds
    : state.awayLineupPlayerIds
})
const userBenchIds = computed(() => {
  void revision.value
  const state = liveMatch.value?.state
  if (!state) return []
  return userTeamId.value === state.homeTeamId ? state.homeBenchPlayerIds : state.awayBenchPlayerIds
})
const updateTactic = <K extends keyof MatchTactics>(key: K, value: MatchTactics[K]): void => {
  const controller = ensureLiveMatch()
  if (!controller || currentMinute.value >= 90) return
  controller.changeTactics(userTeamId.value, { [key]: value })
  revision.value += 1
}
const onTacticChange = <K extends keyof MatchTactics>(key: K, value: MatchTactics[K]): void => {
  updateTactic(key, value)
}
const makeSubstitution = (): void => {
  const controller = ensureLiveMatch()
  if (!controller || !selectedPlayerOutId.value || !selectedPlayerInId.value) return
  try {
    controller.substitute(userTeamId.value, selectedPlayerOutId.value, selectedPlayerInId.value)
    selectedPlayerOutId.value = ''
    selectedPlayerInId.value = ''
    calculationError.value = ''
    revision.value += 1
  } catch (error) {
    calculationError.value = error instanceof Error ? error.message : 'Замена недоступна'
  }
}

// ВОЗВРАЩАЕТ ПОЛЬЗОВАТЕЛЯ НА ГЛАВНУЮ СТРАНИЦУ
const goBack = async (): Promise<void> => {
  try {
    await matchCompletionPromise
  } catch {
    return
  }
  gameStore.clearActiveMatch()
  await router.push('/dashboard')
}

// СБРАСЫВАЕТ СИМУЛЯЦИЮ ПРИ СМЕНЕ МАТЧА
watch(
  () => match.value?.id,
  () => {
    stopSimulationTimer()
    liveMatch.value = null
    currentMinute.value = 0
    isPaused.value = false
    simulationSpeed.value = 1
    revision.value += 1
    isCalculating.value = false
    calculationError.value = ''
    matchCompletionPromise = null
    const currentMatch = match.value
    if (currentMatch?.status === 'scheduled') {
      void gameStore.prepareMatchDay(currentMatch.id).catch((error: unknown) => {
        calculationError.value =
          error instanceof Error ? error.message : t('match.errors.prepareDay')
      })
    }
  },
  { immediate: true },
)

// ИНИЦИАЛИЗИРУЕТ LIVE-СОСТОЯНИЕ ПОСЛЕ ПОДГОТОВКИ ИГРОВОГО ДНЯ
watch(
  canSimulate,
  (ready) => {
    if (ready) {
      ensureLiveMatch()
      startSimulationTimer()
    } else {
      stopSimulationTimer()
    }
  },
  { immediate: true },
)

onBeforeUnmount(stopSimulationTimer)
</script>

<template>
  <!-- СТРАНИЦА МАТЧА -->
  <section
    v-if="match && homeClub && awayClub"
    class="space-y-5 xl:flex xl:h-full xl:min-h-0 xl:flex-col xl:gap-3 xl:space-y-0"
  >
    <!-- ТАБЛО И УПРАВЛЕНИЕ СИМУЛЯЦИЕЙ -->
    <div
      class="shrink-0 rounded-lg border border-white/70 bg-[linear-gradient(135deg,rgba(236,253,245,0.96),rgba(255,255,255,0.96)),#ffffff] p-3 shadow-[0_18px_50px_rgba(20,46,38,0.1)] sm:p-5 xl:p-3"
    >
      <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
        <div class="flex min-w-0 items-center gap-1.5 sm:gap-3">
          <ClubBadge
            :club="homeClub"
            size="lg"
            class="!h-10 !w-10 !text-xs sm:!h-16 sm:!w-16 sm:!text-lg"
          />
          <div class="min-w-0">
            <h1 class="truncate text-sm font-bold text-slate-950 sm:text-xl">
              {{ homeClub.name }}
            </h1>
            <div class="hidden text-sm text-slate-500 sm:block">{{ t('match.homeTeam') }}</div>
          </div>
        </div>
        <div class="text-center">
          <div
            class="min-w-[72px] rounded-lg bg-[linear-gradient(135deg,#10251f,#17603d)] px-2 py-2 text-[1.75rem] font-black leading-none text-emerald-50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] sm:min-w-[156px] sm:px-5 sm:py-2.5 sm:text-[2.75rem]"
          >
            {{ match.result?.homeGoals ?? visibleSnapshot.homeGoals }}:{{
              match.result?.awayGoals ?? visibleSnapshot.awayGoals
            }}
          </div>
          <div class="mt-1 text-[10px] font-semibold text-slate-500 sm:text-sm">
            {{
              match.status === 'played' || currentMinute >= 90
                ? t('match.finished')
                : `${visibleSnapshot.minute}'`
            }}
          </div>
        </div>
        <div class="flex min-w-0 items-center justify-end gap-1.5 sm:gap-3">
          <div class="min-w-0 text-right">
            <h1 class="truncate text-sm font-bold text-slate-950 sm:text-xl">
              {{ awayClub.name }}
            </h1>
            <div class="hidden text-sm text-slate-500 sm:block">{{ t('match.awayTeam') }}</div>
          </div>
          <ClubBadge
            :club="awayClub"
            size="lg"
            class="!h-10 !w-10 !text-xs sm:!h-16 sm:!w-16 sm:!text-lg"
          />
        </div>
      </div>

      <!-- УПРАВЛЕНИЕ МАТЧЕМ -->
      <div class="mt-2 grid justify-items-center gap-1.5 sm:mt-3 sm:gap-2">
        <template v-if="match.status === 'scheduled' && isPlayableMatch && currentMinute < 90">
          <div v-if="canSimulate" class="grid w-full max-w-[220px] gap-2">
            <div class="grid grid-cols-4 gap-1.5">
              <Button
                v-for="speed in LIVE_MATCH_SPEED_MULTIPLIERS"
                :key="speed"
                size="small"
                class="w-full"
                :severity="simulationSpeed === speed ? 'success' : 'secondary'"
                :outlined="simulationSpeed !== speed"
                :label="`x${speed}`"
                @click="setSimulationSpeed(speed)"
              />
            </div>
            <Button
              class="w-full"
              :severity="isPaused ? 'success' : 'secondary'"
              :icon="isPaused ? 'pi pi-play' : 'pi pi-pause'"
              :label="isPaused ? 'Продолжить матч' : 'Пауза'"
              @click="togglePause"
            />
          </div>
          <RouterLink v-if="!userValidation.valid" to="/squad" class="w-full text-center">
            <Button
              class="w-full max-w-[180px] sm:min-w-[220px]"
              severity="danger"
              :label="t('match.fixLineup')"
            />
          </RouterLink>
        </template>
        <template v-else-if="match.status === 'played' || currentMinute >= 90">
          <Button
            class="w-full max-w-[180px] sm:min-w-[220px]"
            :label="t('match.backToOverview')"
            @click="goBack"
          />
        </template>
      </div>

      <!-- ТАКТИКА И ЗАМЕНЫ -->
      <div
        v-if="canSimulate && currentMinute < 90"
        class="mt-3 grid gap-3 border-t border-emerald-100 pt-3 lg:grid-cols-[1.4fr_1fr]"
      >
        <div>
          <div
            class="mb-4 flex items-center justify-between text-xs font-black uppercase tracking-wide text-slate-600"
          >
            <span>Тактика команды</span>
          </div>

          <div class="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <FloatLabel variant="on" class="w-full">
              <Select
                input-id="match-mentality"
                :model-value="userTactics.mentality"
                :options="mentalityOptions"
                option-label="label"
                option-value="value"
                size="small"
                fluid
                class="h-9 match-control-select"
                @update:model-value="onTacticChange('mentality', $event)"
              />
              <label for="match-mentality">Менталитет</label>
            </FloatLabel>

            <FloatLabel variant="on" class="w-full">
              <Select
                input-id="match-pressing"
                :model-value="userTactics.pressing"
                :options="pressingOptions"
                option-label="label"
                option-value="value"
                size="small"
                fluid
                class="h-9 match-control-select"
                @update:model-value="onTacticChange('pressing', $event)"
              />
              <label for="match-pressing">Прессинг</label>
            </FloatLabel>

            <FloatLabel variant="on" class="w-full">
              <Select
                input-id="match-tempo"
                :model-value="userTactics.tempo"
                :options="tempoOptions"
                option-label="label"
                option-value="value"
                size="small"
                fluid
                class="h-9 match-control-select"
                @update:model-value="onTacticChange('tempo', $event)"
              />
              <label for="match-tempo">Темп</label>
            </FloatLabel>

            <FloatLabel variant="on" class="w-full">
              <Select
                input-id="match-width"
                :model-value="userTactics.width"
                :options="widthOptions"
                option-label="label"
                option-value="value"
                size="small"
                fluid
                class="h-9 match-control-select"
                @update:model-value="onTacticChange('width', $event)"
              />
              <label for="match-width">Ширина</label>
            </FloatLabel>

            <FloatLabel variant="on" class="w-full">
              <Select
                input-id="match-defensive-line"
                :model-value="userTactics.defensiveLine"
                :options="defensiveLineOptions"
                option-label="label"
                option-value="value"
                size="small"
                fluid
                class="h-9 match-control-select"
                @update:model-value="onTacticChange('defensiveLine', $event)"
              />
              <label for="match-defensive-line">Линия</label>
            </FloatLabel>
          </div>
        </div>

        <div>
          <div class="mb-4 text-xs font-black uppercase tracking-wide text-slate-600">
            Замены: {{ substitutionsRemaining }} осталось
          </div>

          <div class="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
            <FloatLabel variant="on" class="w-full">
              <Select
                input-id="match-player-out"
                v-model="selectedPlayerOutId"
                :options="playerOutOptions"
                option-label="label"
                option-value="value"
                size="small"
                fluid
                class="h-9 match-control-select"
                aria-label="Игрок с поля"
              />
              <label for="match-player-out">С поля</label>
            </FloatLabel>

            <FloatLabel variant="on" class="w-full">
              <Select
                input-id="match-player-in"
                v-model="selectedPlayerInId"
                :options="playerInOptions"
                option-label="label"
                option-value="value"
                size="small"
                fluid
                class="h-9 match-control-select"
                aria-label="Игрок со скамейки"
              />
              <label for="match-player-in">На поле</label>
            </FloatLabel>

            <Button
              size="small"
              label="Заменить"
              class="h-9 match-control-button"
              :disabled="!selectedPlayerOutId || !selectedPlayerInId || substitutionsRemaining <= 0"
              @click="makeSubstitution"
            />
          </div>
        </div>
      </div>

      <div
        v-if="calculationError"
        class="mt-2 rounded-md bg-rose-50 px-3 py-2 text-center text-xs font-semibold text-rose-800"
      >
        {{ calculationError }}
      </div>

      <div
        v-if="match.status === 'scheduled' && isUserMatch && !isPlayableMatch"
        class="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        {{ t('match.notAvailable') }}
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

    <!-- СОСТАВЫ СТАТИСТИКА И ТРАНСЛЯЦИЯ -->
    <div class="grid gap-5 xl:min-h-0 xl:flex-1 xl:grid-cols-[0.8fr_1.2fr_1fr] xl:gap-3">
      <!-- СОСТАВЫ КОМАНД -->
      <div
        class="rounded-lg border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(20,46,38,0.1)] xl:min-h-0 xl:overflow-auto xl:p-3"
      >
        <h2 class="text-lg text-center font-semibold text-slate-950 xl:text-base">
          {{ t('match.lineups') }}
        </h2>
        <!-- ЛЕГЕНДА СОБЫТИЙ, КОТОРЫЕ ПОЯВЛЯЮТСЯ У ИГРОКОВ ПО ХОДУ МАТЧА -->
        <div class="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[10px] font-semibold text-slate-500">
          <span>{{ t('match.legend.goal') }}</span>
          <span>{{ t('match.legend.yellowCard') }}</span>
          <span>{{ t('match.legend.redCard') }}</span>
          <span>{{ t('match.legend.secondYellow') }}</span>
          <span>{{ t('match.legend.injury') }}</span>
          <span
            ><b class="text-sky-700">↑</b>/<b class="text-rose-700">↓</b>
            {{ t('match.legend.substitution') }}</span
          >
        </div>
        <!-- ОСНОВА И СКАМЕЙКА ХОЗЯЕВ И ГОСТЕЙ -->
        <div class="mt-4 grid gap-4 md:grid-cols-2 xl:mt-3 xl:gap-3">
          <!-- СОСТАВ ХОЗЯЕВ С СИНХРОНИЗИРОВАННЫМИ СОБЫТИЯМИ -->
          <div>
            <div class="mb-2 font-semibold text-slate-950 xl:mb-1.5 xl:text-sm">
              {{ homeClub.shortName }} · {{ preparedLineups?.home.formation }}
            </div>
            <div class="space-y-1 text-sm text-slate-700 xl:space-y-0.5 xl:text-xs">
              <div
                v-for="playerId in preparedLineups?.home.starters"
                :key="playerId"
                class="flex h-7 min-w-0 items-center gap-1 overflow-hidden rounded bg-slate-50 px-2"
              >
                <span class="w-7 shrink-0 text-[9px] font-black text-slate-400">
                  {{ playerPosition(playerId) }}
                </span>
                <span class="min-w-0 flex-1 truncate">{{ playerName(playerId) }}</span>
                <span
                  v-for="marker in playerEventMarkers(homeClub.id, playerId)"
                  :key="marker.key"
                  :title="marker.title"
                  :aria-label="marker.title"
                  class="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded px-1 text-[11px] font-black leading-none"
                  :class="marker.className"
                >
                  {{ marker.label }}
                </span>
              </div>
            </div>
            <!-- ПОЛНЫЙ СПИСОК ДОСТУПНЫХ ЗАПАСНЫХ ХОЗЯЕВ -->
            <div
              v-if="benchPlayers(homeClub, preparedLineups?.home.substitutes).length"
              class="mt-3 border-t border-slate-200 pt-2"
            >
              <div class="mb-1.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
                {{ t('match.substitutes') }}
              </div>
              <div class="space-y-1 text-xs text-slate-700">
                <div
                  v-for="player in benchPlayers(homeClub, preparedLineups?.home.substitutes)"
                  :key="player.id"
                  class="flex h-7 min-w-0 items-center gap-1 overflow-hidden rounded bg-slate-50 px-2"
                >
                  <span class="w-7 shrink-0 text-[9px] font-black text-slate-400">
                    {{ player.position }}
                  </span>
                  <span class="min-w-0 flex-1 truncate">{{ playerName(player.id) }}</span>
                  <span
                    v-for="marker in playerEventMarkers(homeClub.id, player.id)"
                    :key="marker.key"
                    :title="marker.title"
                    :aria-label="marker.title"
                    class="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded px-1 text-[11px] font-black leading-none"
                    :class="marker.className"
                    >{{ marker.label }}</span
                  >
                </div>
              </div>
            </div>
          </div>
          <!-- СОСТАВ ГОСТЕЙ С СИНХРОНИЗИРОВАННЫМИ СОБЫТИЯМИ -->
          <div>
            <div class="mb-2 font-semibold text-slate-950 xl:mb-1.5 xl:text-sm">
              {{ awayClub.shortName }} · {{ preparedLineups?.away.formation }}
            </div>
            <div class="space-y-1 text-sm text-slate-700 xl:space-y-0.5 xl:text-xs">
              <div
                v-for="playerId in preparedLineups?.away.starters"
                :key="playerId"
                class="flex h-7 min-w-0 items-center gap-1 overflow-hidden rounded bg-slate-50 px-2"
              >
                <span class="w-7 shrink-0 text-[9px] font-black text-slate-400">
                  {{ playerPosition(playerId) }}
                </span>
                <span class="min-w-0 flex-1 truncate">{{ playerName(playerId) }}</span>
                <span
                  v-for="marker in playerEventMarkers(awayClub.id, playerId)"
                  :key="marker.key"
                  :title="marker.title"
                  :aria-label="marker.title"
                  class="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded px-1 text-[11px] font-black leading-none"
                  :class="marker.className"
                >
                  {{ marker.label }}
                </span>
              </div>
            </div>
            <!-- ПОЛНЫЙ СПИСОК ДОСТУПНЫХ ЗАПАСНЫХ ГОСТЕЙ -->
            <div
              v-if="benchPlayers(awayClub, preparedLineups?.away.substitutes).length"
              class="mt-3 border-t border-slate-200 pt-2"
            >
              <div class="mb-1.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
                {{ t('match.substitutes') }}
              </div>
              <div class="space-y-1 text-xs text-slate-700">
                <div
                  v-for="player in benchPlayers(awayClub, preparedLineups?.away.substitutes)"
                  :key="player.id"
                  class="flex h-7 min-w-0 items-center gap-1 overflow-hidden rounded bg-slate-50 px-2"
                >
                  <span class="w-7 shrink-0 text-[9px] font-black text-slate-400">
                    {{ player.position }}
                  </span>
                  <span class="min-w-0 flex-1 truncate">{{ playerName(player.id) }}</span>
                  <span
                    v-for="marker in playerEventMarkers(awayClub.id, player.id)"
                    :key="marker.key"
                    :title="marker.title"
                    :aria-label="marker.title"
                    class="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded px-1 text-[11px] font-black leading-none"
                    :class="marker.className"
                    >{{ marker.label }}</span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- СТАТИСТИКА И СОБЫТИЯ МАТЧА -->
      <div
        class="rounded-lg border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(20,46,38,0.1)] xl:min-h-0 xl:overflow-auto xl:p-3"
      >
        <h2 class="text-lg text-center font-semibold text-slate-950 xl:text-base">
          {{ t('match.statistics') }}
        </h2>
        <!-- СРАВНЕНИЕ КЛЮЧЕВЫХ МАТЧЕВЫХ ПОКАЗАТЕЛЕЙ ОБЕИХ КОМАНД -->
        <div class="mt-4 space-y-3 xl:mt-3 xl:space-y-2">
          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
            <span class="text-right font-semibold"
              >{{
                match.result?.stats.home.possession ?? visibleSnapshot.stats.home.possession
              }}%</span
            >
            <span class="text-slate-500">{{ t('match.possession') }}</span>
            <span class="font-semibold"
              >{{
                match.result?.stats.away.possession ?? visibleSnapshot.stats.away.possession
              }}%</span
            >
          </div>
          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
            <span class="text-right font-semibold">
              {{ match.result?.stats.home.xG ?? visibleSnapshot.stats.home.xG ?? 0 }}
            </span>
            <span class="text-slate-500">{{ t('match.expectedGoals') }}</span>
            <span class="font-semibold">
              {{ match.result?.stats.away.xG ?? visibleSnapshot.stats.away.xG ?? 0 }}
            </span>
          </div>
          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
            <span class="text-right font-semibold">{{
              match.result?.stats.home.shots ?? visibleSnapshot.stats.home.shots
            }}</span>
            <span class="text-slate-500">{{ t('match.shots') }}</span>
            <span class="font-semibold">{{
              match.result?.stats.away.shots ?? visibleSnapshot.stats.away.shots
            }}</span>
          </div>
          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
            <span class="text-right font-semibold">{{
              match.result?.stats.home.shotsOnTarget ?? visibleSnapshot.stats.home.shotsOnTarget
            }}</span>
            <span class="text-slate-500">{{ t('match.shotsOnTarget') }}</span>
            <span class="font-semibold">{{
              match.result?.stats.away.shotsOnTarget ?? visibleSnapshot.stats.away.shotsOnTarget
            }}</span>
          </div>
          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
            <span class="text-right font-semibold">{{
              match.result?.stats.home.yellowCards ?? visibleSnapshot.stats.home.yellowCards
            }}</span>
            <span class="text-slate-500">{{ t('match.yellowCards') }}</span>
            <span class="font-semibold">{{
              match.result?.stats.away.yellowCards ?? visibleSnapshot.stats.away.yellowCards
            }}</span>
          </div>
          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
            <span class="text-right font-semibold">{{
              match.result?.stats.home.redCards ?? visibleSnapshot.stats.home.redCards ?? 0
            }}</span>
            <span class="text-slate-500">{{ t('match.redCards') }}</span>
            <span class="font-semibold">{{
              match.result?.stats.away.redCards ?? visibleSnapshot.stats.away.redCards ?? 0
            }}</span>
          </div>
        </div>
        <!-- ЛУЧШИЙ ИГРОК ПО ИТОГАМ НАКОПЛЕННЫХ МАТЧЕВЫХ ОЦЕНОК -->
        <div
          v-if="currentResult"
          class="mt-5 rounded-md bg-slate-50 p-3 text-sm xl:mt-3 xl:p-2 xl:text-xs"
        >
          {{ t('match.bestPlayer') }}
          <span class="font-semibold text-slate-950">{{
            playerName(currentResult.bestPlayerId)
          }}</span>
        </div>

        <!-- ХРОНОЛОГИЯ ГОЛОВ С РАЗДЕЛЕНИЕМ ХОЗЯЕВ И ГОСТЕЙ ПО СТОРОНАМ -->
        <div class="mt-5 border-t border-slate-100 pt-4 xl:mt-3 xl:pt-3">
          <h3 class="text-sm font-black text-center uppercase tracking-wide text-slate-700">
            {{ t('match.goals') }}
          </h3>
          <div v-if="visibleGoals.length" class="mt-3 xl:mt-2">
            <div class="space-y-2 xl:space-y-1">
              <div
                v-for="goal in visibleGoals"
                :key="`${goal.minute}-${goal.playerId}`"
                class="grid grid-cols-2 gap-2"
              >
                <div
                  v-if="goal.clubId === homeClub.id"
                  class="flex min-w-0 items-center gap-1 rounded-md bg-slate-50 px-3 py-2 text-sm xl:px-2 xl:py-1.5 xl:text-xs"
                >
                  <span class="shrink-0 font-black text-emerald-700">{{ goal.minute }}'</span>
                  <span class="min-w-0 truncate">{{ goal.playerName }}</span>
                </div>
                <div
                  v-else
                  class="col-start-2 flex min-w-0 items-center justify-end gap-1 rounded-md bg-slate-50 px-3 py-2 text-right text-sm xl:px-2 xl:py-1.5 xl:text-xs"
                >
                  <span class="min-w-0 truncate">{{ goal.playerName }}</span>
                  <span class="shrink-0 font-black text-emerald-700">{{ goal.minute }}'</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="mt-3 text-sm text-slate-600">{{ t('match.noGoals') }}</div>
        </div>

        <!-- РЕЗУЛЬТАТ СЕРИИ ПЕНАЛЬТИ ДЛЯ КУБКОВОГО МАТЧА -->
        <div
          v-if="match.result?.penaltyWinnerClubId"
          class="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800"
        >
          {{ t('match.penaltyWinner') }}
          {{ clubStore.getClubById(match.result.penaltyWinnerClubId)?.name }}
        </div>
      </div>

      <!-- ТЕКСТОВАЯ ТРАНСЛЯЦИЯ -->
      <div
        class="flex min-h-[320px] flex-col rounded-lg border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(20,46,38,0.1)] xl:min-h-0 xl:p-3"
      >
        <h2 class="text-lg text-center font-semibold text-slate-950 xl:text-base">
          {{ t('match.commentaryTitle') }}
        </h2>
        <!-- ПОМИНУТНЫЙ ПОТОК УЖЕ НАСТУПИВШИХ СОБЫТИЙ МАТЧА -->
        <div
          v-if="visibleCommentary.length"
          class="mt-4 min-h-0 flex-1 space-y-1.5 overflow-auto pr-1 xl:mt-3"
        >
          <div
            v-for="(event, index) in reversedVisibleCommentary"
            :key="`${event.minute}-${event.text}-${index}`"
            class="flex gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm xl:px-2 xl:py-1.5 xl:text-xs"
          >
            <span class="w-7 shrink-0 font-black text-emerald-700">{{ event.minute }}'</span>
            <span
              v-if="event.kind === 'substitution'"
              class="flex min-w-0 flex-wrap items-center gap-1"
            >
              <span class="font-semibold">
                {{
                  t('match.substitution', {
                    club: clubStore.getClubById(event.clubId ?? '')?.shortName ?? '',
                  })
                }}
              </span>
              <span>{{ playerName(event.playerOutId) }}</span>
              <span
                class="inline-flex shrink-0 flex-col items-center text-xs font-black leading-[0.55]"
                :aria-label="t('match.substitutedFor')"
              >
                <span class="text-rose-600">→</span>
                <span class="text-emerald-600">←</span>
              </span>
              <span>{{ playerName(event.playerInId) }}</span>
            </span>
            <span v-else>{{ event.text }}</span>
          </div>
        </div>
        <div v-else class="mt-4 text-sm text-slate-500 xl:mt-3 xl:text-xs">
          {{ t('match.noEvents') }}
        </div>
      </div>
    </div>
  </section>
  <!-- СОСТОЯНИЕ БЕЗ ВЫБРАННОГО МАТЧА -->
  <section
    v-else
    class="rounded-lg border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(20,46,38,0.1)]"
  >
    {{ t('match.notFound') }}
  </section>
</template>
