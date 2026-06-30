import { CompetitionIds as C } from '@/data/gameConfig/competitionIds'
import { createCalendar, createDomesticCup, createLeagueCompetition, zones } from '@/data/gameConfig/common'
import type { CountryCompetitionConfig, PlayoffTransitionRule } from '@/data/gameConfig/types'

const promotionPlayoff: PlayoffTransitionRule = {
  id: 'spain-segunda-promotion-playoff', type: 'promotion-playoff',
  participants: [{ competitionId: C.spainSegunda, selector: { type: 'range', from: 3, to: 6 } }],
  stages: [
    { id: 'semi-final', format: 'two-leg', extraTime: true, penalties: true, awayGoals: false, ties: [
      { home: { type: 'table', competitionId: C.spainSegunda, selector: { type: 'positions', positions: [6] } }, away: { type: 'table', competitionId: C.spainSegunda, selector: { type: 'positions', positions: [3] } } },
      { home: { type: 'table', competitionId: C.spainSegunda, selector: { type: 'positions', positions: [5] } }, away: { type: 'table', competitionId: C.spainSegunda, selector: { type: 'positions', positions: [4] } } },
    ] },
    { id: 'final', format: 'two-leg', extraTime: true, penalties: true, awayGoals: false, ties: [
      { home: { type: 'stage', stageId: 'semi-final', tieIndex: 0, outcome: 'winner' }, away: { type: 'stage', stageId: 'semi-final', tieIndex: 1, outcome: 'winner' } },
    ] },
  ],
  targetCompetitionId: C.spainLaLiga, loserCompetitionId: C.spainSegunda, winnerStageId: 'final',
}

export const spainConfig: CountryCompetitionConfig = {
  countryId: 'spain', configVersion: 2,
  calendar: createCalendar('SUNDAY', ['FRIDAY', 'SATURDAY', 'SUNDAY', 'MONDAY'], ['TUESDAY', 'WEDNESDAY', 'THURSDAY'], [{ startMonth: 12, startDay: 24, endMonth: 1, endDay: 2 }]),
  competitions: {
    [C.spainLaLiga]: createLeagueCompetition({ id: C.spainLaLiga, countryId: 'spain', level: 1, nameKey: 'championships.spain.divisionNames.1', legacyLeagueId: 'La Liga', rules: [
      { id: 'spain-la-liga-relegation', type: 'direct-relegation', sourceCompetitionId: C.spainLaLiga, targetCompetitionId: C.spainSegunda, selector: { type: 'bottom', count: 3 } },
    ], zones: [zones.champion, zones.directRelegation({ type: 'bottom', count: 3 })] }),
    [C.spainSegunda]: createLeagueCompetition({ id: C.spainSegunda, countryId: 'spain', level: 2, nameKey: 'championships.spain.divisionNames.2', legacyLeagueId: 'Segunda Division', bottomBoundaryPolicy: 'closed', rules: [
      { id: 'spain-segunda-promotion', type: 'direct-promotion', sourceCompetitionId: C.spainSegunda, targetCompetitionId: C.spainLaLiga, selector: { type: 'top', count: 2 } },
      promotionPlayoff,
    ], zones: [zones.directPromotion({ type: 'top', count: 2 }), zones.promotionPlayoff({ type: 'range', from: 3, to: 6 }), zones.directRelegation({ type: 'bottom', count: 4 })] }),
  },
  cups: { 'spain-domestic-cup': createDomesticCup('spain', ['TUESDAY', 'WEDNESDAY', 'THURSDAY']) },
}
