import type { Club, Match } from '@/types/football'

export const leagueRoundOrders = [1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14, 16, 17, 18, 20, 21, 22, 24]

const cupOrders = new Set([3, 7, 11, 15, 19, 23, 27])

const getLeagueRoundOrder = (roundIndex: number): number => {
  if (leagueRoundOrders[roundIndex] !== undefined) return leagueRoundOrders[roundIndex]

  let order = leagueRoundOrders.at(-1) ?? 0
  let missingIndex = roundIndex - leagueRoundOrders.length
  do {
    order += 1
    if (!cupOrders.has(order)) missingIndex -= 1
  } while (missingIndex >= 0)
  return order
}

const seasonBaseYear = 2026
const septemberMonthIndex = 8

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10)

const getFirstSaturdayOfSeptember = (season: number): Date => {
  const date = new Date(Date.UTC(seasonBaseYear + season - 1, septemberMonthIndex, 1))
  const daysUntilSaturday = (6 - date.getUTCDay() + 7) % 7
  date.setUTCDate(date.getUTCDate() + daysUntilSaturday)
  return date
}

export const getSeasonMatchDate = (season: number, order: number): string => {
  const date = getFirstSaturdayOfSeptember(season)
  date.setUTCDate(date.getUTCDate() + Math.max(0, order - 1) * 7)
  return toIsoDate(date)
}

interface Pairing {
  homeClubId: string
  awayClubId: string
}

const rotateTeams = (teams: readonly string[]): string[] => {
  const fixed = teams[0]
  if (!fixed) {
    return []
  }
  const tail = teams.slice(1)
  const last = tail[tail.length - 1]
  const middle = tail.slice(0, -1)

  return last ? [fixed, last, ...middle] : [fixed]
}

export const generateDivisionPairings = (clubIds: readonly string[]): Pairing[][] => {
  if (clubIds.length < 2 || clubIds.length % 2 !== 0) {
    throw new Error('A division must contain an even number of at least two clubs')
  }

  let teams = [...clubIds]
  const rounds: Pairing[][] = []
  const roundsCount = teams.length - 1

  for (let roundIndex = 0; roundIndex < roundsCount; roundIndex += 1) {
    const pairings: Pairing[] = []
    const half = teams.length / 2

    for (let index = 0; index < half; index += 1) {
      const left = teams[index]
      const right = teams[teams.length - 1 - index]
      if (!left || !right) {
        throw new Error('Invalid round-robin state')
      }

      const swapHome = (roundIndex + index) % 2 === 1
      pairings.push({
        homeClubId: swapHome ? right : left,
        awayClubId: swapHome ? left : right,
      })
    }

    rounds.push(pairings)
    teams = rotateTeams(teams)
  }

  const reverseRounds = rounds.map((round) =>
    round.map((pairing) => ({
      homeClubId: pairing.awayClubId,
      awayClubId: pairing.homeClubId,
    })),
  )

  return [...rounds, ...reverseRounds]
}

export const generateLeagueSchedule = (clubs: readonly Club[], season: number): Match[] => {
  const matches: Match[] = []
  const divisionIds = [...new Set(clubs.map((club) => club.divisionId))].sort(
    (left, right) => left - right,
  )

  for (const divisionId of divisionIds) {
    const divisionClubIds = clubs
      .filter((club) => club.divisionId === divisionId)
      .map((club) => club.id)
      .sort((left, right) => left.localeCompare(right))

    const rounds = generateDivisionPairings(divisionClubIds)

    rounds.forEach((round, roundIndex) => {
      round.forEach((pairing, matchIndex) => {
        matches.push({
          id: `s${season}-d${divisionId}-r${roundIndex + 1}-m${matchIndex + 1}`,
          season,
          type: 'league',
          date: getSeasonMatchDate(season, getLeagueRoundOrder(roundIndex)),
          order: getLeagueRoundOrder(roundIndex),
          round: roundIndex + 1,
          divisionId,
          homeClubId: pairing.homeClubId,
          awayClubId: pairing.awayClubId,
          neutralVenue: false,
          status: 'scheduled',
        })
      })
    })
  }

  return matches
}
