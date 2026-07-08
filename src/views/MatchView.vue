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
  defaultTeamTactics,
  formations,
  getPositionFit,
  getFormationSlots,
  validateLineup,
} from '@/domain/season/squadSelectionService'
import { isPlayerUnavailable } from '@/domain/season/playerAvailability'
import { useClubStore } from '@/stores/clubs/clubsStore'
import { useGameStore } from '@/stores/game/gameStore'
import type {
  Club,
  ClubLineup,
  CommentaryEvent,
  Formation,
  Match,
  MatchLineups,
  MatchResult,
  MatchTactics,
  PlayedLineup,
  Player,
  FormationSlot,
  TeamTacticsSettings,
} from '@/types/football'

import Select from 'primevue/select'
import FloatLabel from 'primevue/floatlabel'

import ClubBadge from '@/components/ui/ClubBadge.vue'
import TacticsPanel from '@/components/tactics/TacticsPanel.vue'

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
const selectedBenchPlayerId = ref('')
const selectedLineupSlotId = ref('')
const matchSlotPlayerIds = ref<Record<string, Record<string, string | null>>>({})
const activeLineupView = ref<'user' | 'opponent'>('user')
const lastCoachActionMinute = ref<number | null>(null)
const coachActionResetMinute = ref<number | null>(null)
let matchCompletionPromise: Promise<void> | null = null
const HALF_TIME_MINUTE = 45
const COACH_ACTION_COOLDOWN_MINUTES = 15

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
    const fallback = autoSelectLineup(club, lineup.formation, lineup.tacticalStyle, lineup.tactics)
    return buildPlayedLineup(club, fallback)
  }

  return {
    formation: lineup.formation,
    tacticalStyle: lineup.tacticalStyle,
    tactics: lineup.tactics,
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
          game.lineups[currentMatch.homeClubId]?.tactics,
        )
  const awayLineup =
    currentMatch.awayClubId === game.selectedClubId
      ? game.lineups[currentMatch.awayClubId]
      : autoSelectLineup(
          away,
          game.lineups[currentMatch.awayClubId]?.formation ?? '4-4-2',
          game.lineups[currentMatch.awayClubId]?.tacticalStyle ?? 'balanced',
          game.lineups[currentMatch.awayClubId]?.tactics,
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

const formationOptions = formations.map((formation) => ({
  label: formation,
  value: formation,
}))

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

const homeVisibleGoals = computed(() =>
  visibleGoals.value.filter((goal) => goal.clubId === homeClub.value?.id),
)

const awayVisibleGoals = computed(() =>
  visibleGoals.value.filter((goal) => goal.clubId === awayClub.value?.id),
)

const penaltyWinnerClubName = computed(() => {
  const winnerId = match.value?.result?.penaltyWinnerClubId
  return winnerId ? clubStore.getClubById(winnerId)?.name : ''
})

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
interface VisibleCommentaryEvent extends CommentaryEvent {
  isBestPlayer?: boolean
}

const reversedVisibleCommentary = computed<VisibleCommentaryEvent[]>(() => {
  const events: VisibleCommentaryEvent[] = [...visibleCommentary.value].reverse()
  const result = currentResult.value
  if (!result || !isMatchEventVisible(90)) {
    return events
  }
  const bestPlayerEvent: VisibleCommentaryEvent = {
    minute: 90,
    text: `${t('match.bestPlayer')} ${playerName(result.bestPlayerId)}`,
    isBestPlayer: true,
  }
  const fullTimeIndex = events.findIndex((event) => event.minute === 90)
  if (fullTimeIndex >= 0) {
    events.splice(fullTimeIndex, 0, bestPlayerEvent)
    return events
  }
  return [bestPlayerEvent, ...events]
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
  resetExpiredCoachAction()
  revision.value += 1
  if (currentMinute.value === HALF_TIME_MINUTE) {
    isPaused.value = true
    stopSimulationTimer()
    return
  }
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
  if (!state) {
    const selectedLineup =
      match.value?.homeClubId === userTeamId.value
        ? preparedLineups.value?.home
        : preparedLineups.value?.away
    const fallbackTactics = {
      ...defaultTeamTactics(selectedLineup?.tacticalStyle ?? 'balanced'),
      ...selectedLineup?.tactics,
    }
    return {
      formation:
        match.value?.homeClubId === userTeamId.value
          ? (preparedLineups.value?.home.formation ?? '4-4-2')
          : (preparedLineups.value?.away.formation ?? '4-4-2'),
      ...fallbackTactics,
    }
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

const viewedLineupClub = computed((): Club | undefined => {
  const userId = userTeamId.value
  const userClub = homeClub.value?.id === userId ? homeClub.value : awayClub.value
  const opponentClub = homeClub.value?.id === userId ? awayClub.value : homeClub.value
  return activeLineupView.value === 'user' ? userClub : opponentClub
})

const userLineupClub = computed((): Club | undefined => {
  const userId = userTeamId.value
  return homeClub.value?.id === userId ? homeClub.value : awayClub.value
})

const opponentLineupClub = computed((): Club | undefined => {
  const userId = userTeamId.value
  return homeClub.value?.id === userId ? awayClub.value : homeClub.value
})

const viewedLineupFallbackFormation = computed((): Formation => {
  const club = viewedLineupClub.value
  if (!club || !preparedLineups.value) return '4-4-2'
  return club.id === homeClub.value?.id
    ? preparedLineups.value.home.formation
    : preparedLineups.value.away.formation
})

const coachActionCooldownRemaining = computed(() => {
  const lastMinute = lastCoachActionMinute.value
  if (lastMinute === null) return 0
  return Math.max(0, COACH_ACTION_COOLDOWN_MINUTES - (currentMinute.value - lastMinute))
})

const canUseCoachAction = computed(
  () => canSimulate.value && currentMinute.value < 90 && coachActionCooldownRemaining.value === 0,
)

const resetExpiredCoachAction = (): void => {
  const controller = liveMatch.value
  if (
    controller &&
    coachActionResetMinute.value !== null &&
    currentMinute.value >= coachActionResetMinute.value
  ) {
    controller.changeTactics(userTeamId.value, { matchCommand: 'none', teamTalk: 'balanced' })
    coachActionResetMinute.value = null
    revision.value += 1
  }
}

const useCoachAction = (
  changes: Pick<Partial<TeamTacticsSettings>, 'matchCommand' | 'teamTalk'>,
): void => {
  if (!canUseCoachAction.value) return
  const controller = ensureLiveMatch()
  if (!controller) return
  controller.changeTactics(userTeamId.value, changes)
  lastCoachActionMinute.value = currentMinute.value
  coachActionResetMinute.value = Math.min(90, currentMinute.value + 1)
  calculationError.value = ''
  revision.value += 1
}

interface MatchLineupSlot extends FormationSlot {
  playerId: string | null
}

const activeLineupIds = (teamId: string): string[] => {
  void revision.value
  const state = liveMatch.value?.state
  if (state) {
    return teamId === state.homeTeamId
      ? [...state.homeLineupPlayerIds]
      : [...state.awayLineupPlayerIds]
  }

  if (teamId === homeClub.value?.id) {
    return [...(preparedLineups.value?.home.starters ?? [])]
  }
  if (teamId === awayClub.value?.id) {
    return [...(preparedLineups.value?.away.starters ?? [])]
  }
  return []
}

const activeBenchIds = (teamId: string): string[] => {
  void revision.value
  const state = liveMatch.value?.state
  if (state) {
    return teamId === state.homeTeamId
      ? [...state.homeBenchPlayerIds]
      : [...state.awayBenchPlayerIds]
  }

  if (teamId === homeClub.value?.id) {
    return [...(preparedLineups.value?.home.substitutes ?? [])]
  }
  if (teamId === awayClub.value?.id) {
    return [...(preparedLineups.value?.away.substitutes ?? [])]
  }
  return []
}

const substitutedOutEvents = (teamId: string) => {
  void revision.value
  return (detailedResult.value?.substitutions ?? []).filter(
    (substitution) => substitution.clubId === teamId && isMatchEventVisible(substitution.minute),
  )
}

const playerById = (playerId: string): Player | undefined =>
  allPlayers.value.find((player) => player.id === playerId)

const playerLastName = (playerId: string): string =>
  playerById(playerId)?.lastName ?? playerName(playerId)

const ratingClass = (rating: number): string => {
  if (rating >= 75) return 'bg-emerald-700'
  if (rating >= 64) return 'bg-amber-600'
  return 'bg-orange-700'
}

const hasSamePlayerSet = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((playerId) => right.includes(playerId))

const assignPlayersToFormation = (
  formation: Formation,
  playerIds: readonly string[],
): Record<string, string | null> =>
  Object.fromEntries(
    getFormationSlots(formation).map((slot, index) => [slot.id, playerIds[index] ?? null]),
  )

const normalizeSlotAssignments = (
  teamId: string,
  formation: Formation,
  playerIds: readonly string[],
): Record<string, string | null> => {
  const slots = getFormationSlots(formation)
  const existing = matchSlotPlayerIds.value[teamId]
  const existingIds = existing
    ? Object.values(existing).filter((playerId): playerId is string => Boolean(playerId))
    : []

  if (!existing || !hasSamePlayerSet(existingIds, playerIds)) {
    return assignPlayersToFormation(formation, playerIds)
  }

  const assignedIds = new Set<string>()
  const next: Record<string, string | null> = {}

  for (const slot of slots) {
    const playerId = existing[slot.id]
    if (playerId && playerIds.includes(playerId)) {
      next[slot.id] = playerId
      assignedIds.add(playerId)
    } else {
      next[slot.id] = null
    }
  }

  const unassignedIds = playerIds.filter((playerId) => !assignedIds.has(playerId))
  const emptySlots = slots.filter((slot) => !next[slot.id])
  for (const playerId of unassignedIds) {
    const player = playerById(playerId)
    const targetSlot =
      emptySlots
        .map((slot) => ({
          slot,
          fit: player ? getPositionFit(slot.position, player.position) : Number.MAX_SAFE_INTEGER,
        }))
        .sort((left, right) => left.fit - right.fit)[0]?.slot ?? emptySlots[0]
    if (!targetSlot) continue
    next[targetSlot.id] = playerId
    emptySlots.splice(emptySlots.indexOf(targetSlot), 1)
  }

  return next
}

const lineupSlots = (teamId: string, fallback: Formation): MatchLineupSlot[] => {
  const formation = teamFormation(teamId, fallback)
  const playerIds = activeLineupIds(teamId)
  const assignments = normalizeSlotAssignments(teamId, formation, playerIds)
  return getFormationSlots(formation).map((slot) => ({
    ...slot,
    playerId: assignments[slot.id] ?? null,
  }))
}

const fieldSlotPlayer = (slot: MatchLineupSlot): Player | undefined =>
  slot.playerId ? playerById(slot.playerId) : undefined

const canEditLineup = (teamId: string): boolean =>
  teamId === userTeamId.value && canSimulate.value && currentMinute.value < 90

const selectedLineupSlot = (): MatchLineupSlot | undefined => {
  if (!selectedLineupSlotId.value) return undefined
  return lineupSlots(userTeamId.value, viewedLineupFallbackFormation.value).find(
    (slot) => slot.id === selectedLineupSlotId.value,
  )
}

const clearLineupSelection = (): void => {
  selectedBenchPlayerId.value = ''
  selectedLineupSlotId.value = ''
}

const selectBenchPlayer = (playerId: string): void => {
  const selectedSlot = selectedLineupSlot()
  if (selectedSlot) {
    replaceSlotWithBenchPlayer(selectedSlot, playerId)
    return
  }
  selectedBenchPlayerId.value = selectedBenchPlayerId.value === playerId ? '' : playerId
  selectedLineupSlotId.value = ''
}

const replaceSlotWithBenchPlayer = (slot: MatchLineupSlot, benchPlayerId: string): void => {
  if (!slot.playerId || !benchPlayerId || substitutionsRemaining.value <= 0) return
  const controller = ensureLiveMatch()
  if (!controller || currentMinute.value >= 90) return
  const current =
    matchSlotPlayerIds.value[userTeamId.value] ??
    normalizeSlotAssignments(
      userTeamId.value,
      teamFormation(userTeamId.value, viewedLineupFallbackFormation.value),
      activeLineupIds(userTeamId.value),
    )

  try {
    controller.substitute(userTeamId.value, slot.playerId, benchPlayerId)
    matchSlotPlayerIds.value = {
      ...matchSlotPlayerIds.value,
      [userTeamId.value]: {
        ...current,
        [slot.id]: benchPlayerId,
      },
    }
    clearLineupSelection()
    calculationError.value = ''
    revision.value += 1
  } catch (error) {
    calculationError.value = error instanceof Error ? error.message : 'Замена недоступна'
  }
}

const swapLineupSlots = (sourceSlotId: string, targetSlotId: string): void => {
  const current =
    matchSlotPlayerIds.value[userTeamId.value] ??
    normalizeSlotAssignments(
      userTeamId.value,
      teamFormation(userTeamId.value, viewedLineupFallbackFormation.value),
      activeLineupIds(userTeamId.value),
    )
  matchSlotPlayerIds.value = {
    ...matchSlotPlayerIds.value,
    [userTeamId.value]: {
      ...current,
      [sourceSlotId]: current[targetSlotId] ?? null,
      [targetSlotId]: current[sourceSlotId] ?? null,
    },
  }
  calculationError.value = ''
  revision.value += 1
}

const selectLineupSlot = (slot: MatchLineupSlot): void => {
  if (!canEditLineup(userTeamId.value)) return
  if (selectedBenchPlayerId.value) {
    replaceSlotWithBenchPlayer(slot, selectedBenchPlayerId.value)
    return
  }
  if (!selectedLineupSlotId.value) {
    if (slot.playerId) selectedLineupSlotId.value = slot.id
    return
  }
  if (selectedLineupSlotId.value === slot.id) {
    selectedLineupSlotId.value = ''
    return
  }
  swapLineupSlots(selectedLineupSlotId.value, slot.id)
  selectedLineupSlotId.value = ''
}

const teamFormation = (teamId: string, fallback: Formation): Formation => {
  void revision.value
  const state = liveMatch.value?.state
  if (!state) return fallback
  return teamId === state.homeTeamId ? state.homeTactics.formation : state.awayTactics.formation
}
const updateTactic = <K extends keyof MatchTactics>(key: K, value: MatchTactics[K]): void => {
  const controller = ensureLiveMatch()
  if (!controller || currentMinute.value >= 90) return
  controller.changeTactics(userTeamId.value, { [key]: value })
  revision.value += 1
}
const updateTactics = (changes: Partial<TeamTacticsSettings>): void => {
  const controller = ensureLiveMatch()
  if (!controller || currentMinute.value >= 90) return
  controller.changeTactics(userTeamId.value, changes)
  revision.value += 1
}
const onTacticChange = <K extends keyof MatchTactics>(key: K, value: MatchTactics[K]): void => {
  updateTactic(key, value)
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
    activeLineupView.value = 'user'
    clearLineupSelection()
    lastCoachActionMinute.value = null
    coachActionResetMinute.value = null
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

watch(activeLineupView, clearLineupSelection)

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

      <!-- ГОЛЫ
      <div
        class="mt-3 grid gap-2 border-t border-emerald-100 pt-3 text-xs text-slate-700 sm:grid-cols-[1fr_auto_1fr]"
      >
        <div class="min-w-0 space-y-1">
          <div
            v-for="goal in homeVisibleGoals"
            :key="'top-home-' + goal.minute + '-' + goal.playerId"
            class="truncate rounded bg-slate-100 px-2 py-1 font-semibold text-slate-700"
          >
            {{ goal.minute }}' {{ goal.playerName }}
          </div>
        </div>
        <div
          class="self-start rounded-full bg-white px-3 py-1 text-center text-[10px] font-black uppercase tracking-wide text-slate-500"
        >
          {{ t('match.goals') }}
        </div>
        <div class="min-w-0 space-y-1">
          <div
            v-for="goal in awayVisibleGoals"
            :key="'top-away-' + goal.minute + '-' + goal.playerId"
            class="truncate rounded bg-slate-100 px-2 py-1 text-right font-semibold text-slate-700"
          >
            {{ goal.playerName }} {{ goal.minute }}'
          </div>
        </div>
      </div> -->

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
                :label="'x' + speed"
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

    <div class="grid gap-5 xl:min-h-0 xl:flex-1 xl:grid-cols-[1.35fr_1fr_0.85fr] xl:gap-3">
      <div
        class="flex flex-col rounded-lg border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(20,46,38,0.1)] xl:min-h-0 xl:overflow-auto xl:p-3"
      >
        <h2 class="text-lg text-center font-semibold text-slate-950 xl:text-base">
          {{ t('match.lineups') }}
        </h2>
        <div class="mt-3 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-xs font-black">
          <button
            type="button"
            class="rounded-md px-3 py-2"
            :class="
              activeLineupView === 'user' ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-500'
            "
            @click="activeLineupView = 'user'"
          >
            {{ userLineupClub?.shortName ?? userLineupClub?.name }}
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-2"
            :class="
              activeLineupView === 'opponent'
                ? 'bg-white text-emerald-900 shadow-sm'
                : 'text-slate-500'
            "
            @click="activeLineupView = 'opponent'"
          >
            {{ opponentLineupClub?.shortName ?? opponentLineupClub?.name }}
          </button>
        </div>
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
        <div v-if="viewedLineupClub" class="mt-4">
          <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div class="min-w-0 font-semibold text-slate-950 xl:text-sm">
              {{ viewedLineupClub.shortName }} ·
              {{ teamFormation(viewedLineupClub.id, viewedLineupFallbackFormation) }}
            </div>
            <FloatLabel
              v-if="viewedLineupClub.id === userTeamId && canSimulate && currentMinute < 90"
              variant="on"
              class="w-32"
            >
              <Select
                input-id="match-lineup-formation"
                :model-value="userTactics.formation"
                :options="formationOptions"
                option-label="label"
                option-value="value"
                size="small"
                fluid
                class="h-9 match-control-select"
                @update:model-value="onTacticChange('formation', $event)"
              />
              <label for="match-lineup-formation">Схема</label>
            </FloatLabel>
          </div>

          <div
            class="relative h-[520px] overflow-hidden rounded-lg border border-white/15 bg-[linear-gradient(115deg,rgba(255,255,255,0.06)_0_16%,transparent_16%_100%),linear-gradient(90deg,rgba(255,255,255,0.04)_50%,transparent_50%),linear-gradient(180deg,#152233,#101928)] shadow-[0_22px_60px_rgba(15,23,42,0.18)] xl:h-[520px]"
          >
            <div
              class="pointer-events-none absolute inset-[26px] rounded-lg border-2 border-white/30"
            ></div>
            <div
              class="pointer-events-none absolute inset-x-[26px] top-1/2 border-t-2 border-white/30"
            ></div>
            <div
              class="pointer-events-none absolute left-1/2 top-1/2 h-[132px] w-[132px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30"
            ></div>
            <div
              class="pointer-events-none absolute left-1/2 top-[26px] h-[104px] w-[260px] -translate-x-1/2 rounded-b-lg border-2 border-t-0 border-white/30"
            ></div>
            <div
              class="pointer-events-none absolute bottom-[26px] left-1/2 h-[104px] w-[260px] -translate-x-1/2 rounded-t-lg border-2 border-b-0 border-white/30"
            ></div>

            <button
              v-for="slot in lineupSlots(viewedLineupClub.id, viewedLineupFallbackFormation)"
              :key="viewedLineupClub.id + '-' + slot.id"
              type="button"
              class="absolute grid min-h-[72px] w-[88px] -translate-x-1/2 -translate-y-1/2 grid-rows-[auto_auto_1fr] justify-items-start gap-0.5 overflow-visible rounded-lg border border-slate-400/30 bg-slate-950/85 p-1 text-left text-slate-50 shadow-[0_10px_22px_rgba(2,6,23,0.22)] transition sm:w-[106px] xl:min-h-[74px] xl:w-[108px]"
              :class="{
                'cursor-pointer hover:-translate-y-[52%] hover:border-lime-200': canEditLineup(
                  viewedLineupClub.id,
                ),
                'border-lime-300 ring-2 ring-lime-300/40':
                  viewedLineupClub.id === userTeamId && Boolean(selectedBenchPlayerId),
                'border-cyan-300 ring-2 ring-cyan-300/50':
                  viewedLineupClub.id === userTeamId && selectedLineupSlotId === slot.id,
                'border-rose-400/80 ring-1 ring-rose-500/40':
                  Boolean(fieldSlotPlayer(slot)) && isPlayerUnavailable(fieldSlotPlayer(slot)!),
              }"
              :style="{ left: slot.x + '%', top: slot.y + '%' }"
              :disabled="viewedLineupClub.id !== userTeamId || !canSimulate || currentMinute >= 90"
              @click="selectLineupSlot(slot)"
            >
              <template v-if="fieldSlotPlayer(slot)">
                <span class="flex items-center gap-1">
                  <span
                    class="inline-grid h-[22px] min-w-[22px] place-items-center rounded-full border-2 border-slate-400/50 bg-slate-800 text-[0.55rem] font-black leading-none text-white"
                  >
                    {{ slot.label }}
                  </span>
                  <span
                    class="inline-grid h-[22px] min-w-[22px] place-items-center rounded-full border-2 border-white/80 text-[0.55rem] font-black leading-none text-white"
                    :class="ratingClass(fieldSlotPlayer(slot)?.rating ?? 0)"
                  >
                    {{ fieldSlotPlayer(slot)?.rating }}
                  </span>
                </span>
                <span
                  class="w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.62rem] font-black uppercase"
                >
                  {{ fieldSlotPlayer(slot)?.lastName }}
                </span>
                <span class="text-[0.55rem] font-bold text-slate-200/75">
                  {{ fieldSlotPlayer(slot)?.position }}
                </span>
                <span
                  v-if="playerEventMarkers(viewedLineupClub.id, slot.playerId ?? '').length"
                  class="pointer-events-none absolute -bottom-2 left-1.5 h-5"
                >
                  <span
                    v-for="(marker, markerIndex) in playerEventMarkers(
                      viewedLineupClub.id,
                      slot.playerId ?? '',
                    )"
                    :key="marker.key"
                    :title="marker.title"
                    :aria-label="marker.title"
                    class="absolute inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-slate-950/70 px-1 text-[9px] font-black leading-none shadow-[0_2px_6px_rgba(2,6,23,0.35)]"
                    :class="marker.className"
                    :style="{ left: `${markerIndex * 11}px`, zIndex: markerIndex + 1 }"
                  >
                    {{ marker.label }}
                  </span>
                </span>
              </template>
              <template v-else>
                <span
                  class="inline-grid h-[22px] min-w-[22px] place-items-center rounded-full border-2 border-slate-400/50 bg-slate-800 text-[0.55rem] font-black leading-none text-white"
                >
                  {{ slot.label }}
                </span>
                <span class="text-[0.62rem] font-black uppercase text-slate-200">Пусто</span>
              </template>
            </button>
          </div>

          <div
            v-if="
              activeBenchIds(viewedLineupClub.id).length ||
              substitutedOutEvents(viewedLineupClub.id).length
            "
            class="mt-3 border-t border-slate-200 pt-2"
          >
            <div
              class="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wide text-slate-500"
            >
              <span>{{ t('match.substitutes') }}</span>
              <span v-if="viewedLineupClub.id === userTeamId && canSimulate && currentMinute < 90">
                Замен: {{ substitutionsRemaining }}
              </span>
            </div>
            <div class="grid grid-cols-2 gap-1.5 xl:grid-cols-1">
              <button
                v-for="playerId in activeBenchIds(viewedLineupClub.id)"
                :key="playerId"
                type="button"
                class="flex min-w-0 items-center gap-1 overflow-hidden rounded bg-slate-50 px-2 py-1 text-left text-xs text-slate-700"
                :class="{
                  'cursor-pointer hover:bg-emerald-50 hover:text-emerald-900':
                    viewedLineupClub.id === userTeamId && canSimulate && currentMinute < 90,
                  'ring-2 ring-lime-300':
                    viewedLineupClub.id === userTeamId && selectedBenchPlayerId === playerId,
                }"
                :disabled="
                  viewedLineupClub.id !== userTeamId || !canSimulate || currentMinute >= 90
                "
                @click="selectBenchPlayer(playerId)"
              >
                <span class="w-7 shrink-0 text-[9px] font-black text-slate-400">
                  {{ playerPosition(playerId) }}
                </span>
                <span class="min-w-0 flex-1 truncate">{{ playerName(playerId) }}</span>
              </button>
              <div
                v-for="substitution in substitutedOutEvents(viewedLineupClub.id)"
                :key="'out-' + substitution.minute + '-' + substitution.playerOutId"
                class="flex min-w-0 items-center gap-1 overflow-hidden rounded bg-rose-50 px-2 py-1 text-left text-xs font-semibold text-slate-500"
              >
                <span class="min-w-0 flex-1 truncate">{{
                  playerLastName(substitution.playerOutId)
                }}</span>
                <span class="shrink-0 font-black text-rose-600">↓</span>
                <span class="shrink-0 text-[10px] font-black text-rose-700">
                  {{ substitution.minute }}'
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        class="flex flex-col rounded-lg border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(20,46,38,0.1)] xl:min-h-0 xl:overflow-hidden xl:p-3"
      >
        <h2 class="text-lg text-center font-semibold text-slate-950 xl:text-base">
          {{ t('match.statistics') }}
        </h2>
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
            <span class="text-right font-semibold">{{
              match.result?.stats.home.xG ?? visibleSnapshot.stats.home.xG ?? 0
            }}</span>
            <span class="text-slate-500">{{ t('match.expectedGoals') }}</span>
            <span class="font-semibold">{{
              match.result?.stats.away.xG ?? visibleSnapshot.stats.away.xG ?? 0
            }}</span>
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

        <div
          class="mt-5 flex min-h-0 flex-1 flex-col border-t border-slate-100 pt-4 xl:mt-3 xl:pt-3"
        >
          <h3 class="text-sm font-black text-center uppercase tracking-wide text-slate-700">
            {{ t('match.commentaryTitle') }}
          </h3>
          <div
            v-if="visibleCommentary.length"
            class="mt-3 min-h-0 flex-1 space-y-1.5 overflow-auto pr-1 xl:mt-2"
          >
            <div
              v-for="(event, index) in reversedVisibleCommentary"
              :key="'commentary-' + event.minute + '-' + index"
              class="flex gap-2 rounded-md px-3 py-2 text-sm xl:px-2 xl:py-1.5 xl:text-xs"
              :class="
                event.isBestPlayer ? 'bg-amber-50 font-semibold text-amber-900' : 'bg-slate-50'
              "
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
                >
                  <span class="text-rose-600">→</span>
                  <span class="text-emerald-600">←</span>
                </span>
                <span>{{ playerName(event.playerInId) }}</span>
              </span>
              <span v-else>{{ event.text }}</span>
            </div>
          </div>
          <div v-else class="mt-3 text-sm text-slate-500 xl:mt-2 xl:text-xs">
            {{ t('match.noEvents') }}
          </div>
        </div>

        <div
          v-if="penaltyWinnerClubName"
          class="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800"
        >
          {{ t('match.penaltyWinner') }} {{ penaltyWinnerClubName }}
        </div>
      </div>

      <div
        class="flex min-h-[320px] flex-col rounded-lg border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(20,46,38,0.1)] xl:min-h-0 xl:overflow-auto xl:p-3"
      >
        <h2 class="text-lg text-center font-semibold text-slate-950 xl:text-base">Тактика</h2>
        <div class="mt-4 xl:mt-3">
          <TacticsPanel
            :model-value="userTactics"
            compact
            :exclude-keys="['matchCommand', 'teamTalk']"
            @change="updateTactics"
          />
        </div>
        <div class="mt-5 border-t border-slate-100 pt-4 xl:mt-3 xl:pt-3">
          <h3 class="text-xs font-black uppercase tracking-wide text-slate-600">
            Тренерская реакция
          </h3>
          <div class="mt-2 grid grid-cols-2 gap-2">
            <Button
              size="small"
              label="Успокоить"
              :disabled="!canUseCoachAction"
              @click="useCoachAction({ matchCommand: 'calm' })"
            />
            <Button
              size="small"
              label="Поднять темп"
              :disabled="!canUseCoachAction"
              @click="useCoachAction({ matchCommand: 'raiseTempo' })"
            />
            <Button
              size="small"
              label="Удержать"
              :disabled="!canUseCoachAction"
              @click="useCoachAction({ matchCommand: 'holdLead' })"
            />
            <Button
              size="small"
              label="Навал"
              :disabled="!canUseCoachAction"
              @click="useCoachAction({ matchCommand: 'loadBox' })"
            />
            <Button
              size="small"
              label="Похвалить"
              :disabled="!canUseCoachAction"
              @click="useCoachAction({ teamTalk: 'praise' })"
            />
            <Button
              size="small"
              label="Потребовать"
              :disabled="!canUseCoachAction"
              @click="useCoachAction({ teamTalk: 'demandMore' })"
            />
          </div>
          <div class="mt-2 text-xs font-semibold text-slate-500">
            <template v-if="coachActionCooldownRemaining">
              Доступно через {{ coachActionCooldownRemaining }} мин.
            </template>
            <template v-else> Эффект короткий, повтор раз в 15 минут. </template>
          </div>
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
