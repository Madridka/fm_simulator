import { describe, expect, it } from 'vitest'
import { CompetitionIds as C, getCountryCompetitionConfig } from '@/data/gameConfig'
import { getChampionshipClubs } from '@/data/clubs'
import {
  advanceCompetitionPlayoffs,
  initializeCompetitionPlayoffs,
} from '@/domain/competitions/playoffResolver'
import { selectTableRows } from '@/domain/competitions/selectors'
import { validateCompetitionParticipants } from '@/domain/competitions/participantValidator'
import type { PlayoffTransitionRule } from '@/data/gameConfig/types'
import type { LeagueTableRow, Match, MatchResult } from '@/types/football'

const table = (competitionId: string, count: number): LeagueTableRow[] =>
  Array.from({ length: count }, (_, index) => ({
    clubId: `${competitionId}-club-${index + 1}`,
    competitionId,
    divisionId: 1,
    played: count - 1,
    wins: count - index,
    draws: 0,
    losses: index,
    goalsFor: count - index,
    goalsAgainst: index,
    goalDifference: count - index * 2,
    points: (count - index) * 3,
    position: index + 1,
  }))

const resultFor = (match: Match): MatchResult => ({
  homeGoals: 1,
  awayGoals: 0,
  winnerClubId: match.homeClubId,
  penaltyWinnerClubId: match.homeClubId,
  goals: [],
  stats: {
    home: { possession: 50, shots: 1, shotsOnTarget: 1, yellowCards: 0 },
    away: { possession: 50, shots: 1, shotsOnTarget: 0, yellowCards: 0 },
  },
  bestPlayerId: '',
})

const play = (matches: readonly Match[], playoffId: string, stageId: string): Match[] =>
  matches.map((match) =>
    match.playoffId === playoffId && match.playoffStageId === stageId
      ? { ...match, status: 'played' as const, result: resultFor(match) }
      : match,
  )

describe('country competition configs', () => {
  it('encodes England direct movements and the 3-6 Championship bracket', () => {
    const config = getCountryCompetitionConfig('england')
    const tables = {
      [C.englandPremierLeague]: table(C.englandPremierLeague, 20),
      [C.englandChampionship]: table(C.englandChampionship, 24),
      [C.englandLeagueOne]: table(C.englandLeagueOne, 24),
      [C.englandLeagueTwo]: table(C.englandLeagueTwo, 24),
    }
    expect(selectTableRows(tables[C.englandPremierLeague], { type: 'bottom', count: 3 })).toHaveLength(3)
    expect(selectTableRows(tables[C.englandChampionship], { type: 'top', count: 2 })).toHaveLength(2)

    const initialized = initializeCompetitionPlayoffs(config, tables, 1)
    const playoffId = 'england-championship-promotion-playoff'
    const semiFinals = initialized.matches.filter((match) => match.playoffId === playoffId)
    expect(semiFinals).toHaveLength(4)
    expect(new Set(semiFinals.flatMap((match) => [match.homeClubId, match.awayClubId]))).toEqual(
      new Set([3, 4, 5, 6].map((position) => `${C.englandChampionship}-club-${position}`)),
    )

    const firstAdvance = advanceCompetitionPlayoffs(
      initialized.playoffs,
      play(initialized.matches, playoffId, 'semi-final'),
      tables,
      config,
      1,
    )
    expect(firstAdvance.newMatches.filter((match) => match.playoffId === playoffId)).toHaveLength(1)
    const allMatches = [...initialized.matches, ...firstAdvance.newMatches]
    const secondAdvance = advanceCompetitionPlayoffs(
      firstAdvance.playoffs,
      play(allMatches, playoffId, 'final'),
      tables,
      config,
      1,
    )
    expect(secondAdvance.playoffs.find((playoff) => playoff.id === playoffId)?.status).toBe('completed')
  })

  it('creates the German two-leg tie between Bundesliga positions', () => {
    const config = getCountryCompetitionConfig('germany')
    const tables = {
      [C.germanyBundesliga]: table(C.germanyBundesliga, 18),
      [C.germanyBundesliga2]: table(C.germanyBundesliga2, 18),
    }
    const initialized = initializeCompetitionPlayoffs(config, tables, 1)
    const matches = initialized.matches.filter((match) => match.playoffId === 'germany-bundesliga-relegation-playoff')
    expect(matches).toHaveLength(2)
    expect(matches[0]?.homeClubId).toBe(`${C.germanyBundesliga2}-club-3`)
    expect(matches[0]?.awayClubId).toBe(`${C.germanyBundesliga}-club-16`)
  })

  it('builds all three configured French playoff stages in sequence', () => {
    const config = getCountryCompetitionConfig('france')
    const tables = {
      [C.franceLigue1]: table(C.franceLigue1, 18),
      [C.franceLigue2]: table(C.franceLigue2, 18),
    }
    const playoffId = 'france-ligue-two-promotion-playoff'
    const initial = initializeCompetitionPlayoffs(config, tables, 1)
    expect(initial.matches[0]?.homeClubId).toBe(`${C.franceLigue2}-club-4`)
    expect(initial.matches[0]?.awayClubId).toBe(`${C.franceLigue2}-club-5`)

    const afterEliminator = advanceCompetitionPlayoffs(initial.playoffs, play(initial.matches, playoffId, 'eliminator'), tables, config, 1)
    expect(afterEliminator.newMatches[0]?.homeClubId).toBe(`${C.franceLigue2}-club-3`)
    const throughSecond = [...initial.matches, ...afterEliminator.newMatches]
    const afterSecond = advanceCompetitionPlayoffs(afterEliminator.playoffs, play(throughSecond, playoffId, 'league-two-final'), tables, config, 1)
    expect(afterSecond.newMatches).toHaveLength(2)
    expect(afterSecond.newMatches[0]?.awayClubId).toBe(`${C.franceLigue1}-club-16`)
  })

  it('encodes Russian direct, swap and deterministic group transitions without losing clubs', () => {
    const config = getCountryCompetitionConfig('russia')
    const rplRules = config.competitions[C.russiaPremierLeague]?.transitions.rules ?? []
    const silverRules = config.competitions[C.russiaSecondLeagueSilver]?.transitions.rules ?? []
    const goldRules = config.competitions[C.russiaSecondLeagueGold]?.transitions.rules ?? []

    expect(rplRules.some((rule) => rule.type === 'direct-relegation')).toBe(true)
    expect(rplRules.some((rule) => rule.type === 'relegation-playoff')).toBe(true)
    expect(goldRules.some((rule) => rule.type === 'internal-group-swap')).toBe(true)
    expect(silverRules.some((rule) => rule.type === 'group-relegation')).toBe(true)
    expect(
      [C.russiaSecondLeagueBGroup1, C.russiaSecondLeagueBGroup2, C.russiaSecondLeagueBGroup3, C.russiaSecondLeagueBGroup4]
        .every((competitionId) => config.competitions[competitionId]?.transitions.rules.some((rule) => rule.type === 'group-promotion')),
    ).toBe(true)

    const clubs = getChampionshipClubs('russia')
    expect(() => validateCompetitionParticipants(clubs, config)).not.toThrow()
    expect(new Set(clubs.map((club) => club.id)).size).toBe(clubs.length)
  })

  it('stores the Italian playout threshold and closed missing lower tiers', () => {
    const config = getCountryCompetitionConfig('italy')
    const rules = config.competitions[C.italySerieB]?.transitions.rules ?? []
    const playout = rules.find((rule): rule is PlayoffTransitionRule => rule.type === 'relegation-playoff')
    expect(playout?.maximumPointsGapForPlayout).toBe(4)
    expect(config.competitions[C.italySerieB]?.bottomBoundaryPolicy).toBe('closed')
    expect(getCountryCompetitionConfig('spain').competitions[C.spainSegunda]?.bottomBoundaryPolicy).toBe('closed')
  })
})
