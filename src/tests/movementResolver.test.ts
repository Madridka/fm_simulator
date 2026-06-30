import { describe, expect, it } from 'vitest'
import { CompetitionIds as C, getCountryCompetitionConfig } from '@/data/gameConfig'
import type { CountryCompetitionConfig, PlayoffState } from '@/data/gameConfig/types'
import { resolveCompetitionMovements } from '@/domain/competitions/movementResolver'
import type { Club, LeagueTableRow } from '@/types/football'

const buildLeague = (
  config: CountryCompetitionConfig,
  competitionId: string,
  count: number,
): { clubs: Club[]; rows: LeagueTableRow[] } => {
  const competition = config.competitions[competitionId]!
  const clubs = Array.from({ length: count }, (_, index): Club => ({
    id: `${competitionId}-${index + 1}`,
    name: `${competitionId}-${index + 1}`,
    shortName: `C${index + 1}`,
    city: 'Test',
    divisionId: competition.level,
    competitionId,
    leagueId: competition.legacyLeagueId,
    groupId: competition.legacyGroupId,
    rating: 50,
    attackRating: 50,
    midfieldRating: 50,
    defenseRating: 50,
    budget: 0,
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    squad: [],
  }))
  const rows = clubs.map((club, index): LeagueTableRow => ({
    clubId: club.id,
    divisionId: competition.level,
    competitionId,
    played: count - 1,
    wins: count - index,
    draws: 0,
    losses: index,
    goalsFor: count - index,
    goalsAgainst: index,
    goalDifference: count - index * 2,
    points: count * 3 - index * 3,
    position: index + 1,
  }))
  return { clubs, rows }
}

const completedPlayoff = (
  ruleId: string,
  stageId: string,
  pairs: readonly [winnerClubId: string, loserClubId: string][],
): PlayoffState => ({
  id: ruleId,
  ruleId,
  status: 'completed',
  stages: [{
    id: stageId,
    status: 'completed',
    ties: pairs.map(([winnerClubId, loserClubId], index) => ({
      id: `${ruleId}-${index}`,
      stageId,
      tieIndex: index,
      status: 'completed',
      homeClubId: winnerClubId,
      awayClubId: loserClubId,
      matchIds: [],
      winnerClubId,
      loserClubId,
    })),
  }],
})

const setup = (
  config: CountryCompetitionConfig,
  counts: Readonly<Record<string, number>>,
): { clubs: Club[]; tables: Record<string, LeagueTableRow[]> } => {
  const leagues = Object.entries(counts).map(([competitionId, count]) => [competitionId, buildLeague(config, competitionId, count)] as const)
  return {
    clubs: leagues.flatMap(([, league]) => league.clubs),
    tables: Object.fromEntries(leagues.map(([competitionId, league]) => [competitionId, league.rows])),
  }
}

describe('movementResolver', () => {
  it('applies all four English levels including playoff winners', () => {
    const config = getCountryCompetitionConfig('england')
    const state = setup(config, {
      [C.englandPremierLeague]: 20,
      [C.englandChampionship]: 24,
      [C.englandLeagueOne]: 24,
      [C.englandLeagueTwo]: 24,
    })
    const playoffs = [
      completedPlayoff('england-championship-promotion-playoff', 'final', [[`${C.englandChampionship}-3`, `${C.englandChampionship}-4`]]),
      completedPlayoff('england-league-one-promotion-playoff', 'final', [[`${C.englandLeagueOne}-3`, `${C.englandLeagueOne}-4`]]),
      completedPlayoff('england-league-two-promotion-playoff', 'final', [[`${C.englandLeagueTwo}-4`, `${C.englandLeagueTwo}-5`]]),
    ]
    const next = resolveCompetitionMovements(state.clubs, state.tables, config, playoffs)
    const competitionOf = (clubId: string) => next.find((club) => club.id === clubId)?.competitionId

    expect([1, 2, 3].map((position) => competitionOf(`${C.englandChampionship}-${position}`))).toEqual(Array(3).fill(C.englandPremierLeague))
    expect([21, 22, 23, 24].map((position) => competitionOf(`${C.englandLeagueOne}-${position}`))).toEqual(Array(4).fill(C.englandLeagueTwo))
    expect([1, 2, 3, 4].map((position) => competitionOf(`${C.englandLeagueTwo}-${position}`))).toEqual(Array(4).fill(C.englandLeagueOne))
  })

  it('puts the German two-leg winner in Bundesliga', () => {
    const config = getCountryCompetitionConfig('germany')
    const state = setup(config, { [C.germanyBundesliga]: 18, [C.germanyBundesliga2]: 18 })
    const challenger = `${C.germanyBundesliga2}-3`
    const incumbent = `${C.germanyBundesliga}-16`
    const next = resolveCompetitionMovements(state.clubs, state.tables, config, [
      completedPlayoff('germany-bundesliga-relegation-playoff', 'final', [[challenger, incumbent]]),
    ])
    expect(next.find((club) => club.id === challenger)?.competitionId).toBe(C.germanyBundesliga)
    expect(next.find((club) => club.id === incumbent)?.competitionId).toBe(C.germanyBundesliga2)
  })

  it('applies the French ladder winner after the two-leg final', () => {
    const config = getCountryCompetitionConfig('france')
    const state = setup(config, { [C.franceLigue1]: 18, [C.franceLigue2]: 18 })
    const challenger = `${C.franceLigue2}-4`
    const incumbent = `${C.franceLigue1}-16`
    const next = resolveCompetitionMovements(state.clubs, state.tables, config, [
      completedPlayoff('france-ligue-two-promotion-playoff', 'promotion-final', [[challenger, incumbent]]),
    ])
    expect(next.find((club) => club.id === challenger)?.competitionId).toBe(C.franceLigue1)
  })

  it('balances every Russian group and preserves every stable club id', () => {
    const config = getCountryCompetitionConfig('russia')
    const counts = {
      [C.russiaPremierLeague]: 16,
      [C.russiaFirstLeague]: 18,
      [C.russiaSecondLeagueGold]: 10,
      [C.russiaSecondLeagueSilver]: 10,
      [C.russiaSecondLeagueBGroup1]: 10,
      [C.russiaSecondLeagueBGroup2]: 10,
      [C.russiaSecondLeagueBGroup3]: 10,
      [C.russiaSecondLeagueBGroup4]: 10,
    }
    const state = setup(config, counts)
    const playoffs = [
      completedPlayoff('russia-rpl-relegation-playoff', 'final', [
        [`${C.russiaFirstLeague}-3`, `${C.russiaPremierLeague}-14`],
        [`${C.russiaFirstLeague}-4`, `${C.russiaPremierLeague}-13`],
      ]),
      completedPlayoff('russia-gold-promotion-playoff', 'final', [[`${C.russiaSecondLeagueGold}-3`, `${C.russiaSecondLeagueGold}-4`]]),
    ]
    const next = resolveCompetitionMovements(state.clubs, state.tables, config, playoffs)
    const nextCounts = next.reduce<Record<string, number>>((result, club) => {
      result[club.competitionId!] = (result[club.competitionId!] ?? 0) + 1
      return result
    }, {})

    expect(new Set(next.map((club) => club.id)).size).toBe(state.clubs.length)
    expect(nextCounts).toEqual(counts)
    expect([1, 2, 3, 4].map((position) => next.find((club) => club.id === `${C.russiaSecondLeagueBGroup1.replace('group-1', `group-${position}`)}-1`)?.competitionId)).toEqual(Array(4).fill(C.russiaSecondLeagueSilver))
  })
})
