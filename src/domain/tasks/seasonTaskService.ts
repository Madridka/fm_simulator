import seasonTaskPool from '@/data/seasonTaskPool.json'
import { getClubCompetitionId } from '@/domain/competition/competitionIdentity'
import { getFormationSlots } from '@/domain/season/squadSelectionService'
import type {
  Club,
  Formation,
  GameState,
  MatchMentality,
  Match,
  Player,
  PlayerPosition,
  SeasonTask,
  SeasonTaskCategory,
  SeasonTaskEvent,
  SeasonTaskKind,
  TacticalStyle,
} from '@/types/football'
import { createSeededRandom } from '@/utils/random'

interface SeasonTaskPoolItem {
  id: string
  kind: SeasonTaskKind
  title: string
  description: string
  targetCount?: number
  targetFormation?: Formation
  targetMentality?: MatchMentality
  targetTacticalStyle?: TacticalStyle
}

interface SeasonTaskPool {
  secondary: SeasonTaskPoolItem[]
  optional: SeasonTaskPoolItem[]
}

export interface SeasonTaskProgress {
  task: SeasonTask
  completed: boolean
  current: number
  target: number
  progress: number
  statusLabel: string
  detailLabel: string
}

const pool = seasonTaskPool as SeasonTaskPool

const secondaryTaskKinds = new Set<SeasonTaskKind>([
  'academy_promotions',
  'academy_appearances',
  'academy_purchase',
  'first_team_purchase',
  'weak_position_purchase',
])

const optionalTaskKinds = new Set<SeasonTaskKind>([
  'goals_in_match',
  'win_with_formation',
  'clean_sheet_with_formation',
  'win_with_mentality',
  'clean_sheet_with_mentality',
  'goals_with_mentality',
  'win_with_tactical_style',
])

const cupRoundNames: Record<string, string> = {
  preliminary: 'предварительного раунда',
  round_of_128: '1/128 финала',
  round_of_64: '1/64 финала',
  round_of_32: '1/32 финала',
  round_of_16: '1/8 финала',
  quarter_final: '1/4 финала',
  semi_final: '1/2 финала',
  final: 'финала',
}

const positionLabels: Record<PlayerPosition, string> = {
  GK: 'ВР',
  LB: 'ЛЗ',
  CB: 'ЦЗ',
  RB: 'ПЗ',
  CDM: 'ОП',
  CM: 'ЦП',
  CAM: 'АП',
  LW: 'ЛВ',
  RW: 'ПВ',
  ST: 'НП',
}

const hashString = (value: string): number => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) % 2_147_483_647
  }
  return hash || 1
}

const shuffle = <T>(items: readonly T[], seed: number): T[] => {
  const random = createSeededRandom(seed)
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = random.int(0, index)
    const current = result[index]
    const target = result[swapIndex]
    if (current && target) {
      result[index] = target
      result[swapIndex] = current
    }
  }
  return result
}

const selectedClub = (state: GameState): Club | undefined =>
  state.clubs.find((club) => club.id === state.selectedClubId)

const leagueRows = (state: GameState) => {
  const club = selectedClub(state)
  if (!club) return []
  return state.leagueTables[getClubCompetitionId(club)] ?? []
}

const leagueFinished = (state: GameState): boolean =>
  state.matches.every((match) => match.type !== 'league' || match.status === 'played')

const createLeagueTask = (state: GameState): SeasonTask | undefined => {
  const club = selectedClub(state)
  if (!club) return undefined

  const rows = leagueRows(state)
  const teamCount = Math.max(rows.length, 16)
  const strengthScore = club.rating + club.budget / 2_000_000 - club.divisionId * 8

  if (club.divisionId === 1) {
    if (strengthScore >= 135) {
      return {
        id: `s${state.season}-board-champion`,
        season: state.season,
        kind: 'league_position',
        category: 'important',
        title: 'Выиграть чемпионат',
        description: 'Главная задача руководства: закончить сезон на 1 месте.',
        targetPosition: 1,
      }
    }
    if (strengthScore >= 112) {
      return {
        id: `s${state.season}-board-top4`,
        season: state.season,
        kind: 'league_position',
        category: 'important',
        title: 'Финишировать в топ-4',
        description: 'Главная задача руководства: попасть в верхнюю четверку таблицы.',
        targetPosition: Math.min(4, teamCount),
      }
    }
    if (strengthScore >= 92) {
      return {
        id: `s${state.season}-board-midtable`,
        season: state.season,
        kind: 'league_position',
        category: 'important',
        title: 'Уверенная середина',
        description: 'Главная задача руководства: закончить сезон без борьбы за выживание.',
        targetPosition: Math.max(1, Math.ceil(teamCount * 0.65)),
      }
    }
    return {
      id: `s${state.season}-board-survival`,
      season: state.season,
      kind: 'league_position',
      category: 'important',
      title: 'Сохранить прописку',
      description: 'Главная задача руководства: не попасть в зону вылета.',
      targetPosition: Math.max(1, teamCount - 3),
    }
  }

  if (strengthScore >= 108) {
    return {
      id: `s${state.season}-board-promotion`,
      season: state.season,
      kind: 'league_position',
      category: 'important',
      title: 'Выйти в дивизион выше',
      description: 'Главная задача руководства: закончить сезон в зоне прямого повышения.',
      targetPosition: Math.min(2, teamCount),
    }
  }

  if (strengthScore >= 82) {
    return {
      id: `s${state.season}-board-promotion-race`,
      season: state.season,
      kind: 'league_position',
      category: 'important',
      title: 'Бороться за повышение',
      description: 'Главная задача руководства: держаться в верхней части таблицы.',
      targetPosition: Math.min(6, teamCount),
    }
  }

  return {
    id: `s${state.season}-board-stability`,
    season: state.season,
    kind: 'league_position',
    category: 'important',
    title: 'Спокойный сезон',
    description: 'Главная задача руководства: финишировать выше нижней четверти таблицы.',
    targetPosition: Math.max(1, Math.ceil(teamCount * 0.75)),
  }
}

const createCupTask = (state: GameState): SeasonTask | undefined => {
  const club = selectedClub(state)
  if (!club) return undefined

  const rounds = state.cup.rounds
  if (rounds.length === 0) return undefined

  const desiredId =
    club.rating >= 88
      ? 'final'
      : club.rating >= 80
        ? 'semi_final'
        : club.rating >= 72
          ? 'quarter_final'
          : club.rating >= 64
            ? 'round_of_16'
            : undefined
  const desiredRound =
    rounds.find((round) => round.id === desiredId) ??
    rounds[Math.min(1, rounds.length - 1)] ??
    rounds[0]
  if (!desiredRound) return undefined

  return {
    id: `s${state.season}-cup-${desiredRound.id}`,
    season: state.season,
    kind: 'cup_stage',
    category: 'important',
    title: `Дойти до ${cupRoundNames[desiredRound.id] ?? desiredRound.id}`,
    description: 'Кубковая задача рассчитана по стартовой силе команды в этом сезоне.',
    targetCupRoundId: desiredRound.id,
  }
}

const weakPositionTask = (
  state: GameState,
  source: SeasonTaskPoolItem,
  category: SeasonTaskCategory,
): SeasonTask | undefined => {
  const club = selectedClub(state)
  const lineup = state.lineups[state.selectedClubId]
  if (!club || !lineup) return undefined

  const playersById = new Map(club.squad.map((player) => [player.id, player]))
  const starterRatings = Object.entries(lineup.starters)
    .map(([slotId, playerId]) => {
      const slot = getFormationSlots(lineup.formation).find((item) => item.id === slotId)
      const player = playerId ? playersById.get(playerId) : undefined
      return slot && player ? { position: slot.position, rating: player.rating } : undefined
    })
    .filter((item): item is { position: PlayerPosition; rating: number } => Boolean(item))
  if (!starterRatings.length) return undefined

  const average = starterRatings.reduce((sum, item) => sum + item.rating, 0) / starterRatings.length
  const weakest =
    starterRatings
      .filter((item) => item.rating <= average - 3)
      .sort((left, right) => left.rating - right.rating)[0] ??
    [...starterRatings].sort((left, right) => left.rating - right.rating)[0]
  if (!weakest) return undefined

  const minimumRating = Math.max(weakest.rating + 1, Math.ceil(average))
  return {
    ...source,
    id: `s${state.season}-${source.id}-${weakest.position}`,
    season: state.season,
    category,
    weakPosition: weakest.position,
    minimumRating,
    description: `Купи игрока на позицию ${positionLabels[weakest.position]} с рейтингом ${minimumRating}+.`,
  }
}

export const createSeasonTasks = (state: GameState): SeasonTask[] => {
  const fixedTasks = [createLeagueTask(state), createCupTask(state)].filter(
    (task): task is SeasonTask => Boolean(task),
  )
  const seed = state.careerSeed + state.season * 9_973
  const createTask =
    (category: SeasonTaskCategory) =>
    (task: SeasonTaskPoolItem): SeasonTask | undefined =>
      task.kind === 'weak_position_purchase'
        ? weakPositionTask(state, task, category)
        : { ...task, id: `s${state.season}-${task.id}`, season: state.season, category }
  const secondaryTasks = shuffle(pool.secondary, seed + 31)
    .map(createTask('secondary'))
    .filter((task): task is SeasonTask => Boolean(task))
    .slice(0, 3)
  const optionalTasks = shuffle(pool.optional, seed + 79)
    .map(createTask('optional'))
    .filter((task): task is SeasonTask => Boolean(task))
    .slice(0, 3)

  return [...fixedTasks, ...secondaryTasks, ...optionalTasks]
}

export const ensureSeasonTasks = (state: GameState): GameState => {
  const existingTasks = state.seasonTasks?.filter((task) => task.season === state.season) ?? []
  const hasExpectedStructure =
    existingTasks.filter((task) => task.category === 'important').length >= 2 &&
    existingTasks.filter((task) => task.category === 'secondary').length >= 3 &&
    existingTasks.filter((task) => task.category === 'optional').length >= 3 &&
    existingTasks
      .filter((task) => task.category === 'secondary')
      .every((task) => secondaryTaskKinds.has(task.kind)) &&
    existingTasks
      .filter((task) => task.category === 'optional')
      .every((task) => optionalTaskKinds.has(task.kind))
  const tasks = hasExpectedStructure ? existingTasks : createSeasonTasks(state)
  return {
    ...state,
    seasonTasks: tasks,
    seasonTaskEvents:
      state.seasonTaskEvents?.filter((event) => event.season === state.season) ?? [],
  }
}

export const addSeasonTaskEvent = (
  state: GameState,
  event: Omit<SeasonTaskEvent, 'season'>,
): GameState => ({
  ...state,
  seasonTaskEvents: [...(state.seasonTaskEvents ?? []), { ...event, season: state.season }],
})

const currentLeaguePosition = (state: GameState): number => {
  const row = leagueRows(state).find((item) => item.clubId === state.selectedClubId)
  return row?.position ?? leagueRows(state).length
}

const cupRoundOrder = (state: GameState, roundId: string | undefined): number => {
  const round = state.cup.rounds.find((item) => item.id === roundId)
  return round?.order ?? 0
}

const userCupRoundOrder = (state: GameState): number => {
  if (state.cup.championClubId === state.selectedClubId) {
    return state.cup.rounds.length + 1
  }

  return state.cup.rounds.reduce((maxOrder, round) => {
    const participates =
      round.byes.includes(state.selectedClubId) ||
      round.ties.some(
        (tie) =>
          tie.homeClubId === state.selectedClubId ||
          tie.awayClubId === state.selectedClubId ||
          tie.winnerClubId === state.selectedClubId,
      )
    return participates ? Math.max(maxOrder, round.order) : maxOrder
  }, 0)
}

const userSide = (state: GameState, match: Match): 'home' | 'away' | undefined => {
  if (match.homeClubId === state.selectedClubId) return 'home'
  if (match.awayClubId === state.selectedClubId) return 'away'
  return undefined
}

const userGoals = (state: GameState, match: Match): number => {
  const side = userSide(state, match)
  if (!side || !match.result) return 0
  return side === 'home' ? match.result.homeGoals : match.result.awayGoals
}

const opponentGoals = (state: GameState, match: Match): number => {
  const side = userSide(state, match)
  if (!side || !match.result) return 0
  return side === 'home' ? match.result.awayGoals : match.result.homeGoals
}

const userWon = (state: GameState, match: Match): boolean =>
  match.result?.winnerClubId === state.selectedClubId ||
  match.result?.penaltyWinnerClubId === state.selectedClubId

const userFormation = (state: GameState, match: Match): Formation | undefined => {
  const side = userSide(state, match)
  return side ? match.lineups?.[side].formation : undefined
}

const userMentality = (state: GameState, match: Match): MatchMentality | undefined => {
  const side = userSide(state, match)
  return side ? match.lineups?.[side].tactics?.mentality : undefined
}

const userTacticalStyle = (state: GameState, match: Match): TacticalStyle | undefined => {
  const side = userSide(state, match)
  return side ? match.lineups?.[side].tacticalStyle : undefined
}

const seasonEvents = (state: GameState, type: SeasonTaskEvent['type']): SeasonTaskEvent[] =>
  (state.seasonTaskEvents ?? []).filter(
    (event) => event.season === state.season && event.type === type,
  )

const academyPlayers = (state: GameState): Player[] =>
  selectedClub(state)?.squad.filter((player) => player.academyClubId === state.selectedClubId) ?? []

const academyAppearances = (state: GameState): number =>
  academyPlayers(state).reduce(
    (sum, player) => sum + (state.playerStats[player.id]?.appearances ?? 0),
    0,
  )

const matchingWeakPurchases = (state: GameState, task: SeasonTask): number =>
  seasonEvents(state, 'first-team-purchase').filter(
    (event) =>
      event.position === task.weakPosition && (event.rating ?? 0) >= (task.minimumRating ?? 0),
  ).length

const countTaskProgress = (state: GameState, task: SeasonTask): number => {
  const playedUserMatches = state.matches.filter(
    (match) => match.status === 'played' && Boolean(userSide(state, match)),
  )

  if (task.kind === 'academy_promotions') return seasonEvents(state, 'academy-promotion').length
  if (task.kind === 'academy_purchase') return seasonEvents(state, 'academy-purchase').length
  if (task.kind === 'first_team_purchase') return seasonEvents(state, 'first-team-purchase').length
  if (task.kind === 'academy_appearances') return academyAppearances(state)
  if (task.kind === 'weak_position_purchase') return matchingWeakPurchases(state, task)
  if (task.kind === 'goals_in_match') {
    return Math.max(0, ...playedUserMatches.map((match) => userGoals(state, match)))
  }
  if (task.kind === 'win_with_formation') {
    return playedUserMatches.some(
      (match) => userFormation(state, match) === task.targetFormation && userWon(state, match),
    )
      ? 1
      : 0
  }
  if (task.kind === 'clean_sheet_with_formation') {
    return playedUserMatches.some(
      (match) =>
        userFormation(state, match) === task.targetFormation && opponentGoals(state, match) === 0,
    )
      ? 1
      : 0
  }
  if (task.kind === 'win_with_mentality') {
    return playedUserMatches.some(
      (match) => userMentality(state, match) === task.targetMentality && userWon(state, match),
    )
      ? 1
      : 0
  }
  if (task.kind === 'clean_sheet_with_mentality') {
    return playedUserMatches.some(
      (match) =>
        userMentality(state, match) === task.targetMentality && opponentGoals(state, match) === 0,
    )
      ? 1
      : 0
  }
  if (task.kind === 'goals_with_mentality') {
    return Math.max(
      0,
      ...playedUserMatches
        .filter((match) => userMentality(state, match) === task.targetMentality)
        .map((match) => userGoals(state, match)),
    )
  }
  if (task.kind === 'win_with_tactical_style') {
    return playedUserMatches.some(
      (match) =>
        userTacticalStyle(state, match) === task.targetTacticalStyle && userWon(state, match),
    )
      ? 1
      : 0
  }
  return 0
}

export const getSeasonTaskProgress = (state: GameState, task: SeasonTask): SeasonTaskProgress => {
  if (task.kind === 'league_position') {
    const current = currentLeaguePosition(state)
    const target = task.targetPosition ?? 1
    const completed = leagueFinished(state) && current <= target
    return {
      task,
      completed,
      current: Math.max(0, target - current + 1),
      target,
      progress: completed ? 1 : Math.max(0, Math.min(0.95, (target - current + 1) / target)),
      statusLabel: completed ? 'Выполнено' : leagueFinished(state) ? 'Провалено' : 'В процессе',
      detailLabel: `Сейчас: ${current} место, цель: ${target} место`,
    }
  }

  if (task.kind === 'cup_stage') {
    const current = userCupRoundOrder(state)
    const target = cupRoundOrder(state, task.targetCupRoundId)
    const completed = current >= target
    return {
      task,
      completed,
      current,
      target,
      progress: target > 0 ? Math.min(1, current / target) : 0,
      statusLabel: completed ? 'Выполнено' : 'В процессе',
      detailLabel: `Цель: ${cupRoundNames[task.targetCupRoundId ?? ''] ?? task.targetCupRoundId}`,
    }
  }

  const current = countTaskProgress(state, task)
  const target = task.targetCount ?? 1
  const completed = current >= target
  return {
    task,
    completed,
    current,
    target,
    progress: Math.min(1, current / target),
    statusLabel: completed ? 'Выполнено' : 'В процессе',
    detailLabel:
      task.kind === 'weak_position_purchase' && task.weakPosition
        ? `${positionLabels[task.weakPosition]}, нужно ${task.minimumRating}+`
        : `${current}/${target}`,
  }
}

export const getSeasonTaskProgressList = (state: GameState): SeasonTaskProgress[] =>
  (state.seasonTasks?.length ? state.seasonTasks : createSeasonTasks(state)).map((task) =>
    getSeasonTaskProgress(state, task),
  )
