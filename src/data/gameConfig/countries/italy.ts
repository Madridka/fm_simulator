import { CompetitionIds as C } from '@/data/gameConfig/competitionIds'
import { createCalendar, createDomesticCup, createLeagueCompetition, zones } from '@/data/gameConfig/common'
import type { CountryCompetitionConfig, PlayoffTransitionRule } from '@/data/gameConfig/types'

const promotionPlayoff: PlayoffTransitionRule = {
  id: 'italy-serie-b-promotion-playoff', type: 'promotion-playoff',
  participants: [{ competitionId: C.italySerieB, selector: { type: 'range', from: 3, to: 8 } }],
  stages: [
    { id: 'preliminary', format: 'single-leg', extraTime: true, penalties: true, awayGoals: false, ties: [
      { home: { type: 'table', competitionId: C.italySerieB, selector: { type: 'positions', positions: [5] } }, away: { type: 'table', competitionId: C.italySerieB, selector: { type: 'positions', positions: [8] } } },
      { home: { type: 'table', competitionId: C.italySerieB, selector: { type: 'positions', positions: [6] } }, away: { type: 'table', competitionId: C.italySerieB, selector: { type: 'positions', positions: [7] } } },
    ] },
    { id: 'semi-final', format: 'two-leg', extraTime: true, penalties: true, awayGoals: false, ties: [
      { home: { type: 'stage', stageId: 'preliminary', tieIndex: 1, outcome: 'winner' }, away: { type: 'table', competitionId: C.italySerieB, selector: { type: 'positions', positions: [3] } } },
      { home: { type: 'stage', stageId: 'preliminary', tieIndex: 0, outcome: 'winner' }, away: { type: 'table', competitionId: C.italySerieB, selector: { type: 'positions', positions: [4] } } },
    ] },
    { id: 'final', format: 'two-leg', extraTime: true, penalties: true, awayGoals: false, ties: [
      { home: { type: 'stage', stageId: 'semi-final', tieIndex: 0, outcome: 'winner' }, away: { type: 'stage', stageId: 'semi-final', tieIndex: 1, outcome: 'winner' } },
    ] },
  ],
  targetCompetitionId: C.italySerieA, loserCompetitionId: C.italySerieB, winnerStageId: 'final',
}

const relegationPlayout: PlayoffTransitionRule = {
  id: 'italy-serie-b-relegation-playout', type: 'relegation-playoff',
  participants: [{ competitionId: C.italySerieB, selector: { type: 'from-bottom', offsets: [4, 5] } }],
  stages: [{ id: 'playout', format: 'two-leg', extraTime: true, penalties: true, awayGoals: false, ties: [
    { home: { type: 'table', competitionId: C.italySerieB, selector: { type: 'from-bottom', offsets: [4] } }, away: { type: 'table', competitionId: C.italySerieB, selector: { type: 'from-bottom', offsets: [5] } } },
  ] }],
  targetCompetitionId: C.italySerieB, loserCompetitionId: C.italySerieB,
  winnerStageId: 'playout', maximumPointsGapForPlayout: 4,
}

export const italyConfig: CountryCompetitionConfig = {
  countryId: 'italy', configVersion: 2,
  calendar: createCalendar('SUNDAY', ['FRIDAY', 'SATURDAY', 'SUNDAY', 'MONDAY'], ['TUESDAY', 'WEDNESDAY', 'THURSDAY'], [{ startMonth: 12, startDay: 24, endMonth: 1, endDay: 3 }]),
  competitions: {
    [C.italySerieA]: createLeagueCompetition({ id: C.italySerieA, countryId: 'italy', level: 1, nameKey: 'championships.italy.divisionNames.1', legacyLeagueId: 'Serie A', rules: [
      { id: 'italy-serie-a-relegation', type: 'direct-relegation', sourceCompetitionId: C.italySerieA, targetCompetitionId: C.italySerieB, selector: { type: 'bottom', count: 3 } },
    ], zones: [zones.champion, zones.directRelegation({ type: 'bottom', count: 3 })] }),
    [C.italySerieB]: createLeagueCompetition({ id: C.italySerieB, countryId: 'italy', level: 2, nameKey: 'championships.italy.divisionNames.2', legacyLeagueId: 'Serie B', bottomBoundaryPolicy: 'closed', rules: [
      { id: 'italy-serie-b-promotion', type: 'direct-promotion', sourceCompetitionId: C.italySerieB, targetCompetitionId: C.italySerieA, selector: { type: 'top', count: 2 } },
      promotionPlayoff,
      relegationPlayout,
    ], zones: [zones.directPromotion({ type: 'top', count: 2 }), zones.promotionPlayoff({ type: 'range', from: 3, to: 8 }), zones.relegationPlayoff({ type: 'from-bottom', offsets: [4, 5] }), zones.directRelegation({ type: 'bottom', count: 3 })] }),
  },
  cups: { 'italy-domestic-cup': createDomesticCup('italy', ['TUESDAY', 'WEDNESDAY', 'THURSDAY']) },
}
