import { CompetitionIds as C } from '@/data/gameConfig/competitionIds'
import { createCalendar, createDomesticCup, createLeagueCompetition, zones } from '@/data/gameConfig/common'
import type { CountryCompetitionConfig, PlayoffTransitionRule } from '@/data/gameConfig/types'

const championshipPlayoff: PlayoffTransitionRule = {
  id: 'england-championship-promotion-playoff',
  type: 'promotion-playoff',
  participants: [{ competitionId: C.englandChampionship, selector: { type: 'range', from: 3, to: 6 } }],
  stages: [
    {
      id: 'semi-final', format: 'two-leg', extraTime: true, penalties: true, awayGoals: false,
      ties: [
        { home: { type: 'table', competitionId: C.englandChampionship, selector: { type: 'positions', positions: [6] } }, away: { type: 'table', competitionId: C.englandChampionship, selector: { type: 'positions', positions: [3] } } },
        { home: { type: 'table', competitionId: C.englandChampionship, selector: { type: 'positions', positions: [5] } }, away: { type: 'table', competitionId: C.englandChampionship, selector: { type: 'positions', positions: [4] } } },
      ],
    },
    {
      id: 'final', format: 'single-leg', neutralVenue: true, extraTime: true, penalties: true, awayGoals: false,
      ties: [{ home: { type: 'stage', stageId: 'semi-final', tieIndex: 0, outcome: 'winner' }, away: { type: 'stage', stageId: 'semi-final', tieIndex: 1, outcome: 'winner' } }],
    },
  ],
  targetCompetitionId: C.englandPremierLeague,
  loserCompetitionId: C.englandChampionship,
  winnerStageId: 'final',
}

const leagueOnePlayoff: PlayoffTransitionRule = {
  ...championshipPlayoff,
  id: 'england-league-one-promotion-playoff',
  participants: [{ competitionId: C.englandLeagueOne, selector: { type: 'range', from: 3, to: 6 } }],
  stages: championshipPlayoff.stages.map((stage) => ({
    ...stage,
    ties: stage.ties.map((tie) => ({
      home: tie.home.type === 'table' ? { ...tie.home, competitionId: C.englandLeagueOne } : tie.home,
      away: tie.away.type === 'table' ? { ...tie.away, competitionId: C.englandLeagueOne } : tie.away,
    })),
  })),
  targetCompetitionId: C.englandChampionship,
  loserCompetitionId: C.englandLeagueOne,
}

const leagueTwoPlayoff: PlayoffTransitionRule = {
  ...leagueOnePlayoff,
  id: 'england-league-two-promotion-playoff',
  participants: [{ competitionId: C.englandLeagueTwo, selector: { type: 'range', from: 4, to: 7 } }],
  stages: [
    {
      ...leagueOnePlayoff.stages[0]!,
      ties: [
        { home: { type: 'table', competitionId: C.englandLeagueTwo, selector: { type: 'positions', positions: [7] } }, away: { type: 'table', competitionId: C.englandLeagueTwo, selector: { type: 'positions', positions: [4] } } },
        { home: { type: 'table', competitionId: C.englandLeagueTwo, selector: { type: 'positions', positions: [6] } }, away: { type: 'table', competitionId: C.englandLeagueTwo, selector: { type: 'positions', positions: [5] } } },
      ],
    },
    leagueOnePlayoff.stages[1]!,
  ],
  targetCompetitionId: C.englandLeagueOne,
  loserCompetitionId: C.englandLeagueTwo,
}

export const englandConfig: CountryCompetitionConfig = {
  countryId: 'england',
  configVersion: 2,
  calendar: createCalendar('SATURDAY', ['FRIDAY', 'SATURDAY', 'SUNDAY', 'MONDAY'], ['TUESDAY', 'WEDNESDAY']),
  competitions: {
    [C.englandPremierLeague]: createLeagueCompetition({
      id: C.englandPremierLeague, countryId: 'england', level: 1,
      nameKey: 'championships.england.divisionNames.1', legacyLeagueId: 'Premier League',
      rules: [{ id: 'england-pl-relegation', type: 'direct-relegation', sourceCompetitionId: C.englandPremierLeague, targetCompetitionId: C.englandChampionship, selector: { type: 'bottom', count: 3 } }],
      zones: [zones.champion, zones.directRelegation({ type: 'bottom', count: 3 })],
    }),
    [C.englandChampionship]: createLeagueCompetition({
      id: C.englandChampionship, countryId: 'england', level: 2,
      nameKey: 'championships.england.divisionNames.2', legacyLeagueId: 'EFL Championship',
      rules: [
        { id: 'england-championship-promotion', type: 'direct-promotion', sourceCompetitionId: C.englandChampionship, targetCompetitionId: C.englandPremierLeague, selector: { type: 'top', count: 2 } },
        championshipPlayoff,
        { id: 'england-championship-relegation', type: 'direct-relegation', sourceCompetitionId: C.englandChampionship, targetCompetitionId: C.englandLeagueOne, selector: { type: 'bottom', count: 3 } },
      ],
      zones: [zones.directPromotion({ type: 'top', count: 2 }), zones.promotionPlayoff({ type: 'range', from: 3, to: 6 }), zones.directRelegation({ type: 'bottom', count: 3 })],
    }),
    [C.englandLeagueOne]: createLeagueCompetition({
      id: C.englandLeagueOne, countryId: 'england', level: 3,
      nameKey: 'championships.england.divisionNames.3', legacyLeagueId: 'EFL League One',
      rules: [
        { id: 'england-league-one-promotion', type: 'direct-promotion', sourceCompetitionId: C.englandLeagueOne, targetCompetitionId: C.englandChampionship, selector: { type: 'top', count: 2 } },
        leagueOnePlayoff,
        { id: 'england-league-one-relegation', type: 'direct-relegation', sourceCompetitionId: C.englandLeagueOne, targetCompetitionId: C.englandLeagueTwo, selector: { type: 'bottom', count: 4 } },
      ],
      zones: [zones.directPromotion({ type: 'top', count: 2 }), zones.promotionPlayoff({ type: 'range', from: 3, to: 6 }), zones.directRelegation({ type: 'bottom', count: 4 })],
    }),
    [C.englandLeagueTwo]: createLeagueCompetition({
      id: C.englandLeagueTwo, countryId: 'england', level: 4,
      nameKey: 'championships.england.divisionNames.4', legacyLeagueId: 'EFL League Two', bottomBoundaryPolicy: 'closed',
      rules: [
        { id: 'england-league-two-promotion', type: 'direct-promotion', sourceCompetitionId: C.englandLeagueTwo, targetCompetitionId: C.englandLeagueOne, selector: { type: 'top', count: 3 } },
        leagueTwoPlayoff,
      ],
      zones: [zones.directPromotion({ type: 'top', count: 3 }), zones.promotionPlayoff({ type: 'range', from: 4, to: 7 }), zones.directRelegation({ type: 'bottom', count: 2 })],
    }),
  },
  cups: { 'england-domestic-cup': createDomesticCup('england', ['TUESDAY', 'WEDNESDAY', 'THURSDAY']) },
}
