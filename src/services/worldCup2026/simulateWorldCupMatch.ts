import { simulateMatch } from '@/domain/match/matchSimulator'
import { autoSelectLineup } from '@/domain/season/squadSelectionService'
import type { NationalTeam } from '@/data/nationalTeams/worldCup2026/teams'
import type { PlayedLineup } from '@/types/football'
import {
  matchTeamToClub,
  nationalTeamToMatchTeam,
  toMatchSimulationInput,
  type UniversalMatchSimulationInput,
} from '@/types/matchTeam'
import type { WorldCupMatchResult } from '@/stores/worldCup2026/types'
import { createSeededRandom, type RandomGenerator } from '@/utils/random'

const clubLineupToPlayed = (lineup: ReturnType<typeof autoSelectLineup>): PlayedLineup => ({
  formation: lineup.formation,
  tacticalStyle: lineup.tacticalStyle,
  starters: Object.values(lineup.starters).filter((id): id is string => Boolean(id)),
  substitutes: lineup.substitutes,
})

const simulatePenaltyShootout = (
  homeTeamId: string,
  awayTeamId: string,
  random: RandomGenerator,
): { homeScore: number; awayScore: number; winnerTeamId: string } => {
  let homeScore = 0
  let awayScore = 0

  for (let round = 0; round < 5; round += 1) {
    if (random.chance(0.78)) homeScore += 1
    if (random.chance(0.78)) awayScore += 1
  }

  while (homeScore === awayScore) {
    const homeScores = random.chance(0.78)
    const awayScores = random.chance(0.78)
    if (homeScores) homeScore += 1
    if (awayScores) awayScore += 1
    if (homeScores !== awayScores) break
  }

  return {
    homeScore,
    awayScore,
    winnerTeamId: homeScore > awayScore ? homeTeamId : awayTeamId,
  }
}

export const simulateWorldCupMatch = (
  homeTeam: NationalTeam,
  awayTeam: NationalTeam,
  matchId: string,
  isKnockout: boolean,
  random: RandomGenerator,
  detail: 'fast' | 'medium' = 'fast',
): WorldCupMatchResult => {
  const homeClub = matchTeamToClub(nationalTeamToMatchTeam(homeTeam))
  const awayClub = matchTeamToClub(nationalTeamToMatchTeam(awayTeam))
  const homeLineup = clubLineupToPlayed(autoSelectLineup(homeClub))
  const awayLineup = clubLineupToPlayed(autoSelectLineup(awayClub))

  const input: UniversalMatchSimulationInput = {
    matchId,
    homeTeam: nationalTeamToMatchTeam(homeTeam),
    awayTeam: nationalTeamToMatchTeam(awayTeam),
    homeLineup,
    awayLineup,
    neutralVenue: true,
    allowPenaltyShootout: false,
    seed: random.int(1, 2_000_000_000),
  }

  const regular = simulateMatch(toMatchSimulationInput(input), detail)

  if (!isKnockout || regular.homeGoals !== regular.awayGoals) {
    return {
      homeScore: regular.homeGoals,
      awayScore: regular.awayGoals,
      winnerTeamId:
        regular.homeGoals > regular.awayGoals
          ? homeTeam.id
          : regular.awayGoals > regular.homeGoals
            ? awayTeam.id
            : undefined,
      decidedBy: 'regular-time',
    }
  }

  const extraInput: UniversalMatchSimulationInput = {
    ...input,
    matchId: `${matchId}-et`,
    seed: random.int(1, 2_000_000_000),
  }
  const extra = simulateMatch(toMatchSimulationInput(extraInput), 'fast')
  const extraHome = Math.max(0, extra.homeGoals - 1)
  const extraAway = Math.max(0, extra.awayGoals - 1)
  const totalHome = regular.homeGoals + extraHome
  const totalAway = regular.awayGoals + extraAway

  if (totalHome !== totalAway) {
    return {
      homeScore: regular.homeGoals,
      awayScore: regular.awayGoals,
      extraTimeHomeScore: totalHome,
      extraTimeAwayScore: totalAway,
      winnerTeamId: totalHome > totalAway ? homeTeam.id : awayTeam.id,
      decidedBy: 'extra-time',
    }
  }

  const penalties = simulatePenaltyShootout(homeTeam.id, awayTeam.id, random)
  return {
    homeScore: regular.homeGoals,
    awayScore: regular.awayGoals,
    extraTimeHomeScore: totalHome,
    extraTimeAwayScore: totalAway,
    penaltyHomeScore: penalties.homeScore,
    penaltyAwayScore: penalties.awayScore,
    winnerTeamId: penalties.winnerTeamId,
    decidedBy: 'penalties',
  }
}
