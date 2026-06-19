import { gameConfig } from '@/config/gameConfig'
import { getChampionshipClubs } from '@/data/clubs'
import { advanceCupIfPossible, initializeCup } from '@/domain/competition/cupService'
import { calculateLeagueTables } from '@/domain/competition/leagueTableService'
import { simulateMatch } from '@/domain/match/matchSimulator'
import { generateLeagueSchedule } from '@/domain/season/scheduleGenerator'
import {
  autoSelectLineup,
  getFormationSlots,
  getStarterIds,
} from '@/domain/season/squadSelectionService'
import type {
  ChampionshipId,
  Club,
  ClubLineup,
  GameState,
  Match,
  MatchLineups,
  MatchResult,
  PlayedLineup,
  Player,
  PlayerStats,
} from '@/types/football'
import { clamp, createSeededRandom } from '@/utils/random'

const clonePlayer = (player: Player): Player => ({ ...player })

const cloneClub = (club: Club): Club => ({
  ...club,
  squad: club.squad.map(clonePlayer),
})

const cloneLineup = (lineup: ClubLineup): ClubLineup => ({
  formation: lineup.formation,
  tacticalStyle: lineup.tacticalStyle,
  starters: { ...lineup.starters },
  substitutes: [...lineup.substitutes],
})

const hashString = (value: string): number => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) % 2_147_483_647
  }
  return hash || 1
}

const createEmptyPlayerStats = (): PlayerStats => ({
  appearances: 0,
  goals: 0,
  yellowCards: 0,
  averageRating: 0,
  matchesRated: 0,
})

export const createInitialPlayerStats = (clubs: readonly Club[]): Record<string, PlayerStats> => {
  return clubs.reduce<Record<string, PlayerStats>>((result, club) => {
    for (const player of club.squad) {
      result[player.id] = createEmptyPlayerStats()
    }
    return result
  }, {})
}

export const createDefaultLineups = (
  clubs: readonly Club[],
  existingLineups: Record<string, ClubLineup> = {},
): Record<string, ClubLineup> => {
  return clubs.reduce<Record<string, ClubLineup>>((result, club) => {
    const existing = existingLineups[club.id]
    result[club.id] = autoSelectLineup(
      club,
      existing?.formation ?? '4-4-2',
      existing?.tacticalStyle ?? 'balanced',
    )
    return result
  }, {})
}

export const createInitialGameState = (
  championshipId: ChampionshipId,
  selectedClubId: string,
): GameState => {
  const clubs = getChampionshipClubs(championshipId).map(cloneClub)
  if (!clubs.some((club) => club.id === selectedClubId)) {
    throw new Error(`Club ${selectedClubId} does not belong to ${championshipId}`)
  }
  const leagueMatches = generateLeagueSchedule(clubs, 1)
  const cup = initializeCup(clubs, 1)
  const matches = [...leagueMatches, ...cup.matches].sort(
    (left, right) => left.order - right.order || left.id.localeCompare(right.id),
  )

  return {
    championshipId,
    selectedClubId,
    season: 1,
    clubs,
    matches,
    leagueTables: calculateLeagueTables(clubs, matches),
    cup: cup.cup,
    lineups: createDefaultLineups(clubs),
    playerStats: createInitialPlayerStats(clubs),
    lastCompletedOrder: 0,
  }
}

const getClub = (clubs: readonly Club[], clubId: string): Club => {
  const club = clubs.find((candidate) => candidate.id === clubId)
  if (!club) {
    throw new Error(`Club not found: ${clubId}`)
  }
  return club
}

const getPlayedLineup = (club: Club, stateLineup: ClubLineup | undefined): PlayedLineup => {
  const lineup = stateLineup ?? autoSelectLineup(club)
  const starters = getFormationSlots(lineup.formation)
    .map((slot) => lineup.starters[slot.id])
    .filter((playerId): playerId is string => typeof playerId === 'string')

  if (starters.length !== 11) {
    const auto = autoSelectLineup(club, lineup.formation, lineup.tacticalStyle)
    return getPlayedLineup(club, auto)
  }

  return {
    formation: lineup.formation,
    tacticalStyle: lineup.tacticalStyle,
    starters,
  }
}

const getLineupsForMatch = (state: GameState, match: Match): MatchLineups => {
  const homeClub = getClub(state.clubs, match.homeClubId)
  const awayClub = getClub(state.clubs, match.awayClubId)
  const homeLineup =
    match.homeClubId === state.selectedClubId
      ? state.lineups[match.homeClubId]
      : autoSelectLineup(
          homeClub,
          state.lineups[match.homeClubId]?.formation ?? '4-4-2',
          state.lineups[match.homeClubId]?.tacticalStyle ?? 'balanced',
        )
  const awayLineup =
    match.awayClubId === state.selectedClubId
      ? state.lineups[match.awayClubId]
      : autoSelectLineup(
          awayClub,
          state.lineups[match.awayClubId]?.formation ?? '4-4-2',
          state.lineups[match.awayClubId]?.tacticalStyle ?? 'balanced',
        )

  return {
    home: getPlayedLineup(homeClub, homeLineup),
    away: getPlayedLineup(awayClub, awayLineup),
  }
}

const updatePlayerById = (
  clubs: Club[],
  playerId: string,
  update: (player: Player) => Player,
): void => {
  for (const club of clubs) {
    const playerIndex = club.squad.findIndex((player) => player.id === playerId)
    if (playerIndex !== -1) {
      const player = club.squad[playerIndex]
      if (player) {
        club.squad[playerIndex] = update(player)
      }
      return
    }
  }
}

const updatePlayerStats = (
  stats: Record<string, PlayerStats>,
  playerId: string,
  goals: number,
  yellowCards: number,
  rating: number,
): void => {
  const current = stats[playerId] ?? createEmptyPlayerStats()
  const ratedMatches = current.matchesRated + 1
  stats[playerId] = {
    appearances: current.appearances + 1,
    goals: current.goals + goals,
    yellowCards: current.yellowCards + yellowCards,
    matchesRated: ratedMatches,
    averageRating: Number(
      ((current.averageRating * current.matchesRated + rating) / ratedMatches).toFixed(2),
    ),
  }
}

const applyMatchEffects = (
  state: GameState,
  match: Match,
  result: MatchResult,
  lineups: MatchLineups,
): GameState => {
  const clubs = state.clubs.map(cloneClub)
  const playerStats = { ...state.playerStats }
  const random = createSeededRandom(hashString(match.id) + state.season * 1_000)
  const allStarterIds = [...lineups.home.starters, ...lineups.away.starters]
  const goalCounts = result.goals.reduce<Record<string, number>>((counts, goal) => {
    counts[goal.playerId] = (counts[goal.playerId] ?? 0) + 1
    return counts
  }, {})
  const bookingCounts: Record<string, number> = {}

  for (let index = 0; index < result.stats.home.yellowCards; index += 1) {
    const bookedPlayerId = lineups.home.starters[random.int(0, lineups.home.starters.length - 1)]
    if (bookedPlayerId) {
      bookingCounts[bookedPlayerId] = (bookingCounts[bookedPlayerId] ?? 0) + 1
    }
  }

  for (let index = 0; index < result.stats.away.yellowCards; index += 1) {
    const bookedPlayerId = lineups.away.starters[random.int(0, lineups.away.starters.length - 1)]
    if (bookedPlayerId) {
      bookingCounts[bookedPlayerId] = (bookingCounts[bookedPlayerId] ?? 0) + 1
    }
  }

  const homeWon = result.homeGoals > result.awayGoals || result.winnerClubId === match.homeClubId
  const awayWon = result.awayGoals > result.homeGoals || result.winnerClubId === match.awayClubId

  for (const playerId of allStarterIds) {
    const isHomePlayer = lineups.home.starters.includes(playerId)
    const teamWon = isHomePlayer ? homeWon : awayWon
    const teamLost = isHomePlayer
      ? awayWon && result.homeGoals !== result.awayGoals
      : homeWon && result.homeGoals !== result.awayGoals
    const goals = goalCounts[playerId] ?? 0
    const yellowCards = bookingCounts[playerId] ?? 0
    const matchRating = clamp(
      6 +
        goals * 0.8 +
        (teamWon ? 0.5 : 0) -
        (teamLost ? 0.35 : 0) -
        yellowCards * 0.25 +
        random.int(-4, 5) / 10,
      3,
      10,
    )

    updatePlayerById(clubs, playerId, (player) => ({
      ...player,
      fitness: clamp(player.fitness - random.int(6, 14), 1, 100),
      form: clamp(
        player.form +
          goals * 3 -
          yellowCards +
          (teamWon ? random.int(1, 4) : teamLost ? random.int(-4, 0) : random.int(-1, 2)),
        1,
        100,
      ),
    }))

    updatePlayerStats(playerStats, playerId, goals, yellowCards, matchRating)
  }

  return {
    ...state,
    clubs,
    playerStats,
  }
}

const completeMatch = (
  state: GameState,
  match: Match,
  result: MatchResult,
  lineups: MatchLineups,
): GameState => {
  const updatedMatches = state.matches.map((candidate) => {
    if (candidate.id !== match.id) {
      return candidate
    }

    return {
      ...candidate,
      status: 'played' as const,
      result,
      lineups,
    }
  })

  return applyMatchEffects(
    {
      ...state,
      matches: updatedMatches,
      lastCompletedOrder: Math.max(state.lastCompletedOrder, match.order),
    },
    match,
    result,
    lineups,
  )
}

const simulateScheduledMatch = (
  state: GameState,
  match: Match,
): { result: MatchResult; lineups: MatchLineups } => {
  const homeClub = getClub(state.clubs, match.homeClubId)
  const awayClub = getClub(state.clubs, match.awayClubId)
  const lineups = getLineupsForMatch(state, match)

  return {
    lineups,
    result: simulateMatch({
      matchId: match.id,
      homeClub,
      awayClub,
      homeLineup: lineups.home,
      awayLineup: lineups.away,
      neutralVenue: match.neutralVenue,
      allowPenaltyShootout: match.type === 'cup',
      seed: hashString(match.id) + state.season * 10_000,
    }),
  }
}

const applyCupRoundRewards = (state: GameState, completedRoundId: string): GameState => {
  const reward = gameConfig.cupRoundRewards[completedRoundId] ?? 0
  if (reward <= 0) {
    return state
  }

  const completedRound = state.cup.rounds.find((round) => round.id === completedRoundId)
  if (!completedRound) {
    return state
  }

  const winnerIds = new Set(
    completedRound.ties
      .map((tie) => tie.winnerClubId)
      .filter((clubId): clubId is string => typeof clubId === 'string'),
  )

  const extraWinnerReward = completedRoundId === 'final' ? gameConfig.cupWinnerReward : 0

  return {
    ...state,
    clubs: state.clubs.map((club) => {
      const cloned = cloneClub(club)
      return winnerIds.has(club.id)
        ? { ...cloned, budget: cloned.budget + reward + extraWinnerReward }
        : cloned
    }),
  }
}

const advanceCupAndRefreshTables = (state: GameState): GameState => {
  const advanced = advanceCupIfPossible(state.cup, state.matches)
  const matches = [...state.matches, ...advanced.newMatches].sort(
    (left, right) => left.order - right.order || left.id.localeCompare(right.id),
  )
  let nextState: GameState = {
    ...state,
    cup: advanced.cup,
    matches,
    leagueTables: calculateLeagueTables(state.clubs, matches),
  }

  if (advanced.completedRoundId) {
    nextState = applyCupRoundRewards(nextState, advanced.completedRoundId)
  }

  return {
    ...nextState,
    leagueTables: calculateLeagueTables(nextState.clubs, nextState.matches),
  }
}

const simulateOrder = (
  state: GameState,
  order: number,
  userResult?: { matchId: string; result: MatchResult },
): GameState => {
  let nextState = state
  const matchesForOrder = nextState.matches.filter(
    (match) => match.order === order && match.status === 'scheduled',
  )

  for (const match of matchesForOrder) {
    const lineups = getLineupsForMatch(nextState, match)
    if (userResult && match.id === userResult.matchId) {
      nextState = completeMatch(nextState, match, userResult.result, lineups)
    } else {
      const simulated = simulateScheduledMatch(nextState, match)
      nextState = completeMatch(nextState, match, simulated.result, simulated.lineups)
    }
  }

  return advanceCupAndRefreshTables(nextState)
}

export const settleAiOnlyDaysUntilNextUserMatch = (state: GameState): GameState => {
  let nextState = state
  let safety = 0

  while (safety < 32) {
    safety += 1
    const nextUserMatch = getNextUserMatch(nextState)
    const nextUserOrder = nextUserMatch?.order ?? Number.POSITIVE_INFINITY
    const aiOnlyOrder = nextState.matches
      .filter((match) => match.status === 'scheduled' && match.order < nextUserOrder)
      .filter(
        (match) =>
          match.homeClubId !== nextState.selectedClubId &&
          match.awayClubId !== nextState.selectedClubId,
      )
      .map((match) => match.order)
      .sort((left, right) => left - right)[0]

    if (aiOnlyOrder === undefined) {
      return nextState
    }

    nextState = simulateOrder(nextState, aiOnlyOrder)
  }

  return nextState
}

export const completeUserMatchDay = (
  state: GameState,
  matchId: string,
  result: MatchResult,
): GameState => {
  const match = state.matches.find((candidate) => candidate.id === matchId)
  if (!match) {
    throw new Error(`Match not found: ${matchId}`)
  }

  const afterOrder = simulateOrder(state, match.order, { matchId, result })
  return settleAiOnlyDaysUntilNextUserMatch(afterOrder)
}

export const getNextUserMatch = (state: GameState): Match | undefined => {
  return state.matches
    .filter(
      (match) =>
        match.status === 'scheduled' &&
        (match.homeClubId === state.selectedClubId || match.awayClubId === state.selectedClubId),
    )
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))[0]
}

export const isSeasonReadyToFinish = (state: GameState): boolean => {
  const leagueFinished = state.matches.every(
    (match) => match.type !== 'league' || match.status === 'played',
  )
  const cupFinished = Boolean(state.cup.championClubId)
  return leagueFinished && cupFinished
}

const progressPlayersForNewSeason = (club: Club, season: number): Club => {
  const random = createSeededRandom(hashString(club.id) + season * 501)

  return {
    ...club,
    squad: club.squad.map((player) => {
      let rating = player.rating
      if (player.age < 24) {
        rating = clamp(rating + random.int(0, 2), 1, player.potential)
      } else if (player.age > 31) {
        rating = clamp(rating - random.int(0, 2), 1, player.potential)
      }

      return {
        ...player,
        age: player.age + 1,
        rating,
        fitness: clamp(player.fitness + 24, 1, 100),
        form: clamp(player.form + random.int(-6, 8), 1, 100),
        isInjured: false,
      }
    }),
  }
}

export const getNextDivisionId = (
  divisionId: number,
  position: number,
  clubsInDivision = gameConfig.clubsPerDivision,
  divisionsCount = gameConfig.divisionsCount,
): number => {
  if (position <= gameConfig.promotedClubsCount && divisionId > 1) {
    return divisionId - 1
  }

  if (
    position > clubsInDivision - gameConfig.relegatedClubsCount &&
    divisionId < divisionsCount
  ) {
    return divisionId + 1
  }

  return divisionId
}

const applySeasonRewardsAndMovement = (state: GameState): Club[] => {
  const tableRows = Object.values(state.leagueTables).flat()
  const rowByClubId = new Map(tableRows.map((row) => [row.clubId, row]))
  const divisionSizes = state.clubs.reduce<Record<number, number>>((sizes, club) => {
    sizes[club.divisionId] = (sizes[club.divisionId] ?? 0) + 1
    return sizes
  }, {})
  const divisionsCount = Math.max(...Object.keys(divisionSizes).map(Number))

  return state.clubs.map((club) => {
    const row = rowByClubId.get(club.id)
    if (!row) {
      return cloneClub(club)
    }

    const reward = gameConfig.seasonRewards[club.divisionId]?.[row.position - 1] ?? 0
    const divisionId = getNextDivisionId(
      club.divisionId,
      row.position,
      divisionSizes[club.divisionId],
      divisionsCount,
    )
    const promoted = divisionId < club.divisionId

    return {
      ...cloneClub(club),
      divisionId,
      budget: club.budget + reward + (promoted ? gameConfig.promotionReward : 0),
    }
  })
}

export const finishSeason = (state: GameState): GameState => {
  const rewardedAndMoved = applySeasonRewardsAndMovement({
    ...state,
    leagueTables: calculateLeagueTables(state.clubs, state.matches),
  })
  const nextSeason = state.season + 1
  const progressedClubs = rewardedAndMoved.map((club) =>
    progressPlayersForNewSeason(club, nextSeason),
  )
  const leagueMatches = generateLeagueSchedule(progressedClubs, nextSeason)
  const cup = initializeCup(progressedClubs, nextSeason)
  const matches = [...leagueMatches, ...cup.matches].sort(
    (left, right) => left.order - right.order || left.id.localeCompare(right.id),
  )

  return {
    championshipId: state.championshipId,
    selectedClubId: state.selectedClubId,
    season: nextSeason,
    clubs: progressedClubs,
    matches,
    cup: cup.cup,
    lineups: createDefaultLineups(progressedClubs, state.lineups),
    leagueTables: calculateLeagueTables(progressedClubs, matches),
    playerStats: createInitialPlayerStats(progressedClubs),
    lastCompletedOrder: 0,
  }
}

export const refreshLineupsAfterSquadChange = (state: GameState): Record<string, ClubLineup> => {
  return state.clubs.reduce<Record<string, ClubLineup>>((result, club) => {
    const existing = state.lineups[club.id]
    if (!existing) {
      result[club.id] = autoSelectLineup(club)
      return result
    }

    const availableIds = new Set(club.squad.map((player) => player.id))
    const starters = Object.fromEntries(
      Object.entries(existing.starters).map(([slotId, playerId]) => [
        slotId,
        playerId && availableIds.has(playerId) ? playerId : null,
      ]),
    ) as Record<string, string | null>
    const selectedIds = new Set(
      Object.values(starters).filter(
        (playerId): playerId is string => typeof playerId === 'string',
      ),
    )
    const substitutes = existing.substitutes
      .filter((playerId) => availableIds.has(playerId) && !selectedIds.has(playerId))
      .slice(0, 7)

    result[club.id] = {
      formation: existing.formation,
      tacticalStyle: existing.tacticalStyle,
      starters,
      substitutes,
    }
    return result
  }, {})
}

export const getUserStarterIds = (state: GameState): string[] => {
  const lineup = state.lineups[state.selectedClubId]
  return lineup ? getStarterIds(lineup) : []
}
