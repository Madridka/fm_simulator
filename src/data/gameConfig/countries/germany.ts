import { CompetitionIds as C } from '@/data/gameConfig/competitionIds'
import { createCalendar, createDomesticCup, createLeagueCompetition, zones } from '@/data/gameConfig/common'
import type { CountryCompetitionConfig, PlayoffTransitionRule } from '@/data/gameConfig/types'

const relegationPlayoff: PlayoffTransitionRule = {
  id: 'germany-bundesliga-relegation-playoff', type: 'relegation-playoff',
  participants: [
    { competitionId: C.germanyBundesliga2, selector: { type: 'positions', positions: [3] } },
    { competitionId: C.germanyBundesliga, selector: { type: 'from-bottom', offsets: [3] } },
  ],
  stages: [{ id: 'final', format: 'two-leg', firstLegAtHomeSource: true, extraTime: true, penalties: true, awayGoals: false, ties: [
    { home: { type: 'table', competitionId: C.germanyBundesliga2, selector: { type: 'positions', positions: [3] } }, away: { type: 'table', competitionId: C.germanyBundesliga, selector: { type: 'from-bottom', offsets: [3] } } },
  ] }],
  targetCompetitionId: C.germanyBundesliga, loserCompetitionId: C.germanyBundesliga2, winnerStageId: 'final',
}

export const germanyConfig: CountryCompetitionConfig = {
  countryId: 'germany', configVersion: 2,
  calendar: createCalendar('SATURDAY', ['FRIDAY', 'SATURDAY', 'SUNDAY'], ['TUESDAY', 'WEDNESDAY'], [{ startMonth: 12, startDay: 20, endMonth: 1, endDay: 20 }]),
  competitions: {
    [C.germanyBundesliga]: createLeagueCompetition({ id: C.germanyBundesliga, countryId: 'germany', level: 1, nameKey: 'championships.germany.divisionNames.1', legacyLeagueId: 'Bundesliga', rules: [
      { id: 'germany-bundesliga-relegation', type: 'direct-relegation', sourceCompetitionId: C.germanyBundesliga, targetCompetitionId: C.germanyBundesliga2, selector: { type: 'bottom', count: 2 } },
      relegationPlayoff,
    ], zones: [zones.champion, zones.relegationPlayoff({ type: 'from-bottom', offsets: [3] }), zones.directRelegation({ type: 'bottom', count: 2 })] }),
    [C.germanyBundesliga2]: createLeagueCompetition({ id: C.germanyBundesliga2, countryId: 'germany', level: 2, nameKey: 'championships.germany.divisionNames.2', legacyLeagueId: '2. Bundesliga', bottomBoundaryPolicy: 'closed', rules: [
      { id: 'germany-bundesliga2-promotion', type: 'direct-promotion', sourceCompetitionId: C.germanyBundesliga2, targetCompetitionId: C.germanyBundesliga, selector: { type: 'top', count: 2 } },
    ], zones: [zones.directPromotion({ type: 'top', count: 2 }), zones.promotionPlayoff({ type: 'positions', positions: [3] }), zones.relegationPlayoff({ type: 'from-bottom', offsets: [3] }), zones.directRelegation({ type: 'bottom', count: 2 })] }),
  },
  cups: { 'germany-domestic-cup': createDomesticCup('germany', ['TUESDAY', 'WEDNESDAY', 'THURSDAY']) },
}
