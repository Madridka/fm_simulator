import { getCountryCompetitionConfig } from '@/data/gameConfig'
import type { CountryId } from '@/data/gameConfig/types'
import { getClubCompetitionId } from '@/domain/competition/competitionIdentity'
import {
  assignLeagueRoundDates,
  getSeasonOrderFromDate,
  spreadRoundAcrossMatchDays,
} from '@/domain/schedule/calendarSlotResolver'
import type { Club, Match } from '@/types/football'

export interface LeaguePairing {
  homeClubId: string
  awayClubId: string
}

const rotateTeams = (teams: readonly string[]): string[] => {
  const fixed = teams[0]
  if (!fixed) return []
  const tail = teams.slice(1)
  const last = tail.at(-1)
  return last ? [fixed, last, ...tail.slice(0, -1)] : [fixed]
}

export const generateLeagueRoundPairings = (
  clubIds: readonly string[],
  rounds = 2,
): LeaguePairing[][] => {
  if (clubIds.length < 2) throw new Error('A competition must contain at least two clubs')
  const bye = '__bye__'
  let teams = clubIds.length % 2 === 0 ? [...clubIds] : [...clubIds, bye]
  const firstLeg: LeaguePairing[][] = []

  for (let roundIndex = 0; roundIndex < teams.length - 1; roundIndex += 1) {
    const pairings: LeaguePairing[] = []
    for (let index = 0; index < teams.length / 2; index += 1) {
      const left = teams[index]
      const right = teams[teams.length - 1 - index]
      if (!left || !right) throw new Error('Invalid round-robin state')
      if (left !== bye && right !== bye) {
        const swapHome = (roundIndex + index) % 2 === 1
        pairings.push({ homeClubId: swapHome ? right : left, awayClubId: swapHome ? left : right })
      }
    }
    firstLeg.push(pairings)
    teams = rotateTeams(teams)
  }

  const result: LeaguePairing[][] = []
  for (let cycle = 0; cycle < rounds; cycle += 1) {
    result.push(...firstLeg.map((round) => round.map((pairing) => cycle % 2 === 0
      ? { ...pairing }
      : { homeClubId: pairing.awayClubId, awayClubId: pairing.homeClubId },
    )))
  }
  return result
}

export const generateLeagueSchedule = (
  clubs: readonly Club[],
  season: number,
  countryId: CountryId,
): Match[] => {
  const country = getCountryCompetitionConfig(countryId)
  const clubsByCompetition = clubs.reduce<Record<string, Club[]>>((result, club) => {
    const competitionId = getClubCompetitionId(club)
    result[competitionId] = [...(result[competitionId] ?? []), club]
    return result
  }, {})
  const matches: Match[] = []

  for (const competitionId of Object.keys(clubsByCompetition).sort()) {
    const competition = country.competitions[competitionId]
    if (!competition) throw new Error(`No ${countryId} config for competition ${competitionId}`)
    const participants = (clubsByCompetition[competitionId] ?? []).map((club) => club.id).sort()
    const rounds = generateLeagueRoundPairings(participants, competition.format.rounds)
    const roundDates = assignLeagueRoundDates(rounds.length, season, country.calendar)

    rounds.forEach((round, roundIndex) => {
      const anchor = roundDates[roundIndex]
      if (!anchor) throw new Error(`No date for round ${roundIndex + 1} of ${competitionId}`)
      const dates = spreadRoundAcrossMatchDays(anchor, round.length, season, country.calendar)
      round.forEach((pairing, matchIndex) => {
        const date = dates[matchIndex] ?? anchor
        matches.push({
          id: `s${season}-${competitionId}-r${roundIndex + 1}-m${matchIndex + 1}`,
          championshipId: countryId,
          season,
          type: 'league',
          date,
          kickoffTime: matchIndex % 3 === 0 ? '15:00' : matchIndex % 3 === 1 ? '17:30' : '20:00',
          order: getSeasonOrderFromDate(season, date, country.calendar),
          round: roundIndex + 1,
          roundNumber: roundIndex + 1,
          divisionId: competition.level,
          competitionId,
          homeClubId: pairing.homeClubId,
          awayClubId: pairing.awayClubId,
          neutralVenue: false,
          status: 'scheduled',
        })
      })
    })
  }
  return matches.sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id))
}
