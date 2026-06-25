import { cupRoundNames, cupRoundOrders } from '@/config/gameConfig'
import { getSeasonMatchDate } from '@/domain/season/scheduleGenerator'
import type { Club, CupRound, CupState, CupTie, Match } from '@/types/football'
import { createSeededRandom } from '@/utils/random'

export const cupRoundIds = [
  'round_of_128',
  'round_of_64',
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'final',
] as const

const highestPowerOfTwoAtMost = (value: number): number => {
  let power = 1
  while (power * 2 <= value) {
    power *= 2
  }
  return power
}

const getRoundIdForBracketSize = (bracketSize: number): string => {
  if (bracketSize >= 128) {
    return 'round_of_128'
  }
  if (bracketSize >= 64) {
    return 'round_of_64'
  }
  if (bracketSize >= 32) {
    return 'round_of_32'
  }
  if (bracketSize >= 16) {
    return 'round_of_16'
  }
  if (bracketSize >= 8) {
    return 'quarter_final'
  }
  if (bracketSize >= 4) {
    return 'semi_final'
  }
  return 'final'
}

const getRoundIdForPlayInSize = (bracketSizeAfterRound: number): string => {
  const playInSize = bracketSizeAfterRound * 2
  return getRoundIdForBracketSize(playInSize)
}

const getActiveRoundIdsFrom = (firstRoundId: string): string[] => {
  const firstRoundIndex = cupRoundIds.indexOf(firstRoundId as (typeof cupRoundIds)[number])
  return firstRoundIndex >= 0 ? [...cupRoundIds.slice(firstRoundIndex)] : [...cupRoundIds]
}

const shuffle = <T>(items: readonly T[], seed: number): T[] => {
  const random = createSeededRandom(seed)
  const result = [...items]

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = random.int(0, index)
    const current = result[index]
    const target = result[swapIndex]
    if (current !== undefined && target !== undefined) {
      result[index] = target
      result[swapIndex] = current
    }
  }

  return result
}

const createTie = (
  season: number,
  roundId: string,
  tieIndex: number,
  homeClubId: string,
  awayClubId: string,
): CupTie => ({
  id: `s${season}-cup-${roundId}-t${tieIndex + 1}`,
  matchId: `s${season}-cup-${roundId}-m${tieIndex + 1}`,
  homeClubId,
  awayClubId,
})

const createMatchFromTie = (season: number, roundId: string, round: number, tie: CupTie): Match => {
  if (!tie.matchId || !tie.homeClubId || !tie.awayClubId) {
    throw new Error('Cannot create a cup match without both clubs')
  }

  return {
    id: tie.matchId,
    season,
    type: 'cup',
    date: getSeasonMatchDate(season, cupRoundOrders[roundId] ?? round),
    order: cupRoundOrders[roundId] ?? round,
    round,
    cupRoundId: roundId,
    homeClubId: tie.homeClubId,
    awayClubId: tie.awayClubId,
    neutralVenue: roundId === 'final',
    status: 'scheduled',
  }
}

const createRound = (
  id: string,
  season: number,
  participants: readonly string[],
  round: number,
): { round: CupRound; matches: Match[] } => {
  const ties: CupTie[] = []
  const matches: Match[] = []

  for (let index = 0; index < participants.length; index += 2) {
    const homeClubId = participants[index]
    const awayClubId = participants[index + 1]
    if (!homeClubId || !awayClubId) {
      throw new Error('Cup round requires an even number of participants')
    }

    const tie = createTie(season, id, index / 2, homeClubId, awayClubId)
    ties.push(tie)
    matches.push(createMatchFromTie(season, id, round, tie))
  }

  return {
    round: {
      id,
      name: cupRoundNames[id] ?? id,
      order: cupRoundOrders[id] ?? round,
      status: 'scheduled',
      byes: [],
      ties,
    },
    matches,
  }
}

const createEmptyRound = (id: string): CupRound => ({
  id,
  name: cupRoundNames[id] ?? id,
  order: cupRoundOrders[id] ?? 0,
  status: 'scheduled',
  byes: [],
  ties: [],
})

export const initializeCup = (
  clubs: readonly Club[],
  season: number,
): { cup: CupState; matches: Match[] } => {
  const bracketSize = highestPowerOfTwoAtMost(clubs.length)
  const playInTeamsCount = (clubs.length - bracketSize) * 2
  const sortedClubs = [...clubs].sort((left, right) => {
    if (right.divisionId !== left.divisionId) {
      return right.divisionId - left.divisionId
    }
    return left.rating - right.rating
  })

  const initialRoundId =
    playInTeamsCount > 0
      ? getRoundIdForPlayInSize(bracketSize)
      : getRoundIdForBracketSize(bracketSize)
  const initialClubIds =
    playInTeamsCount > 0
      ? sortedClubs.slice(0, playInTeamsCount).map((club) => club.id)
      : sortedClubs.map((club) => club.id)
  const byes =
    playInTeamsCount > 0 ? sortedClubs.slice(playInTeamsCount).map((club) => club.id) : []
  const initialParticipants = shuffle(initialClubIds, season * 101 + 7)
  const initial = createRound(initialRoundId, season, initialParticipants, 1)

  const activeRoundIds = getActiveRoundIdsFrom(initialRoundId)
  const rounds: CupRound[] = activeRoundIds.map((roundId) => createEmptyRound(roundId))
  rounds[0] = {
    ...initial.round,
    byes,
  }

  return {
    cup: {
      season,
      rounds,
    },
    matches: initial.matches,
  }
}

const getCupMatchWinner = (match: Match): string | undefined => {
  if (!match.result) {
    return undefined
  }
  return match.result.winnerClubId ?? match.result.penaltyWinnerClubId
}

const isRoundCompleted = (round: CupRound, matches: readonly Match[]): boolean => {
  if (round.ties.length === 0) {
    return false
  }

  return round.ties.every((tie) => {
    if (tie.winnerClubId) {
      return true
    }
    if (!tie.matchId) {
      return false
    }
    const match = matches.find((candidate) => candidate.id === tie.matchId)
    return Boolean(match && match.status === 'played' && getCupMatchWinner(match))
  })
}

export const advanceCupIfPossible = (
  cup: CupState,
  matches: readonly Match[],
): { cup: CupState; newMatches: Match[]; completedRoundId?: string } => {
  const rounds = cup.rounds.map((round) => ({
    ...round,
    byes: [...round.byes],
    ties: round.ties.map((tie) => ({ ...tie })),
  }))

  const currentRoundIndex = rounds.findIndex(
    (round) => round.status === 'scheduled' && round.ties.length > 0,
  )
  if (currentRoundIndex === -1) {
    return { cup: { ...cup, rounds }, newMatches: [] }
  }

  const currentRound = rounds[currentRoundIndex]
  if (!currentRound || !isRoundCompleted(currentRound, matches)) {
    return { cup: { ...cup, rounds }, newMatches: [] }
  }

  const winners = currentRound.ties.map((tie) => {
    if (tie.matchId) {
      const match = matches.find((candidate) => candidate.id === tie.matchId)
      const winner = match ? getCupMatchWinner(match) : undefined
      if (winner) {
        tie.winnerClubId = winner
        return winner
      }
    }
    if (!tie.winnerClubId) {
      throw new Error('Completed cup tie has no winner')
    }
    return tie.winnerClubId
  })

  currentRound.status = 'completed'

  if (currentRound.id === 'final') {
    return {
      cup: {
        ...cup,
        championClubId: winners[0],
        rounds,
      },
      newMatches: [],
      completedRoundId: currentRound.id,
    }
  }

  const nextRoundIndex = currentRoundIndex + 1
  const nextRound = rounds[nextRoundIndex]
  if (!nextRound) {
    return { cup: { ...cup, rounds }, newMatches: [], completedRoundId: currentRound.id }
  }

  const participants = shuffle(
    [...winners, ...currentRound.byes],
    cup.season * 313 + nextRoundIndex * 19,
  )
  const created = createRound(nextRound.id, cup.season, participants, nextRoundIndex + 1)
  rounds[nextRoundIndex] = created.round

  return {
    cup: {
      ...cup,
      rounds,
    },
    newMatches: created.matches,
    completedRoundId: currentRound.id,
  }
}

export const getCupRoundForMatch = (cup: CupState, matchId: string): CupRound | undefined => {
  return cup.rounds.find((round) => round.ties.some((tie) => tie.matchId === matchId))
}

export const getClubCupProgress = (cup: CupState, clubId: string): string => {
  if (cup.championClubId === clubId) {
    return 'Победитель кубка'
  }

  const latestRound = [...cup.rounds].reverse().find((round) => {
    return (
      round.byes.includes(clubId) ||
      round.ties.some(
        (tie) =>
          tie.homeClubId === clubId || tie.awayClubId === clubId || tie.winnerClubId === clubId,
      )
    )
  })

  if (!latestRound) {
    return 'Не стартовал'
  }

  const tie = latestRound.ties.find(
    (candidate) => candidate.homeClubId === clubId || candidate.awayClubId === clubId,
  )
  if (tie?.winnerClubId && tie.winnerClubId !== clubId) {
    return `Выбыл: ${latestRound.name}`
  }

  return latestRound.status === 'completed' ? `Прошел: ${latestRound.name}` : latestRound.name
}
