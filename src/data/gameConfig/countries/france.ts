import { CompetitionIds as C } from '@/data/gameConfig/competitionIds'
import { createCalendar, createDomesticCup, createLeagueCompetition, zones } from '@/data/gameConfig/common'
import type { CountryCompetitionConfig, PlayoffTransitionRule } from '@/data/gameConfig/types'

const promotionPlayoff: PlayoffTransitionRule = {
  id: 'france-ligue-two-promotion-playoff', type: 'promotion-playoff',
  participants: [
    { competitionId: C.franceLigue2, selector: { type: 'range', from: 3, to: 5 } },
    { competitionId: C.franceLigue1, selector: { type: 'from-bottom', offsets: [3] } },
  ],
  stages: [
    { id: 'eliminator', format: 'single-leg', extraTime: true, penalties: true, awayGoals: false, ties: [
      { home: { type: 'table', competitionId: C.franceLigue2, selector: { type: 'positions', positions: [4] } }, away: { type: 'table', competitionId: C.franceLigue2, selector: { type: 'positions', positions: [5] } } },
    ] },
    { id: 'league-two-final', format: 'single-leg', extraTime: true, penalties: true, awayGoals: false, ties: [
      { home: { type: 'table', competitionId: C.franceLigue2, selector: { type: 'positions', positions: [3] } }, away: { type: 'stage', stageId: 'eliminator', tieIndex: 0, outcome: 'winner' } },
    ] },
    { id: 'promotion-final', format: 'two-leg', firstLegAtHomeSource: true, extraTime: true, penalties: true, awayGoals: false, ties: [
      { home: { type: 'stage', stageId: 'league-two-final', tieIndex: 0, outcome: 'winner' }, away: { type: 'table', competitionId: C.franceLigue1, selector: { type: 'from-bottom', offsets: [3] } } },
    ] },
  ],
  targetCompetitionId: C.franceLigue1, loserCompetitionId: C.franceLigue2,
  winnerStageId: 'promotion-final',
}

export const franceConfig: CountryCompetitionConfig = {
  countryId: 'france', configVersion: 2,
  calendar: createCalendar('SUNDAY', ['FRIDAY', 'SATURDAY', 'SUNDAY'], ['TUESDAY', 'WEDNESDAY'], [{ startMonth: 12, startDay: 24, endMonth: 1, endDay: 3 }]),
  competitions: {
    [C.franceLigue1]: createLeagueCompetition({ id: C.franceLigue1, countryId: 'france', level: 1, nameKey: 'championships.france.divisionNames.1', legacyLeagueId: 'Ligue 1', rules: [
      { id: 'france-ligue-one-relegation', type: 'direct-relegation', sourceCompetitionId: C.franceLigue1, targetCompetitionId: C.franceLigue2, selector: { type: 'bottom', count: 2 } },
      promotionPlayoff,
    ], zones: [zones.champion, zones.relegationPlayoff({ type: 'from-bottom', offsets: [3] }), zones.directRelegation({ type: 'bottom', count: 2 })] }),
    [C.franceLigue2]: createLeagueCompetition({ id: C.franceLigue2, countryId: 'france', level: 2, nameKey: 'championships.france.divisionNames.2', legacyLeagueId: 'Ligue 2', bottomBoundaryPolicy: 'closed', rules: [
      { id: 'france-ligue-two-promotion', type: 'direct-promotion', sourceCompetitionId: C.franceLigue2, targetCompetitionId: C.franceLigue1, selector: { type: 'top', count: 2 } },
    ], zones: [zones.directPromotion({ type: 'top', count: 2 }), zones.promotionPlayoff({ type: 'range', from: 3, to: 5 }), zones.relegationPlayoff({ type: 'from-bottom', offsets: [3] }), zones.directRelegation({ type: 'bottom', count: 2 })] }),
  },
  cups: { 'france-domestic-cup': createDomesticCup('france', ['TUESDAY', 'WEDNESDAY', 'THURSDAY']) },
}
