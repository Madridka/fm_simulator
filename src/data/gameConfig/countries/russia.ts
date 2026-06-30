import { CompetitionIds as C } from '@/data/gameConfig/competitionIds'
import { createCalendar, createDomesticCup, createLeagueCompetition, zones } from '@/data/gameConfig/common'
import type { CountryCompetitionConfig, PlayoffTransitionRule } from '@/data/gameConfig/types'

const rplPlayoff: PlayoffTransitionRule = {
  id: 'russia-rpl-relegation-playoff', type: 'relegation-playoff',
  participants: [
    { competitionId: C.russiaFirstLeague, selector: { type: 'positions', positions: [3, 4] } },
    { competitionId: C.russiaPremierLeague, selector: { type: 'from-bottom', offsets: [3, 4] } },
  ],
  stages: [{ id: 'final', format: 'two-leg', firstLegAtHomeSource: true, extraTime: true, penalties: true, awayGoals: false, ties: [
    { home: { type: 'table', competitionId: C.russiaFirstLeague, selector: { type: 'positions', positions: [3] } }, away: { type: 'table', competitionId: C.russiaPremierLeague, selector: { type: 'from-bottom', offsets: [3] } } },
    { home: { type: 'table', competitionId: C.russiaFirstLeague, selector: { type: 'positions', positions: [4] } }, away: { type: 'table', competitionId: C.russiaPremierLeague, selector: { type: 'from-bottom', offsets: [4] } } },
  ] }],
  targetCompetitionId: C.russiaPremierLeague, loserCompetitionId: C.russiaFirstLeague, winnerStageId: 'final',
}

const goldPlayoff: PlayoffTransitionRule = {
  id: 'russia-gold-promotion-playoff', type: 'promotion-playoff',
  participants: [{ competitionId: C.russiaSecondLeagueGold, selector: { type: 'positions', positions: [3, 4] } }],
  stages: [{ id: 'final', format: 'two-leg', extraTime: true, penalties: true, awayGoals: false, ties: [
    { home: { type: 'table', competitionId: C.russiaSecondLeagueGold, selector: { type: 'positions', positions: [4] } }, away: { type: 'table', competitionId: C.russiaSecondLeagueGold, selector: { type: 'positions', positions: [3] } } },
  ] }],
  targetCompetitionId: C.russiaFirstLeague, loserCompetitionId: C.russiaSecondLeagueGold, winnerStageId: 'final',
}

const groupIds = [C.russiaSecondLeagueBGroup1, C.russiaSecondLeagueBGroup2, C.russiaSecondLeagueBGroup3, C.russiaSecondLeagueBGroup4]

export const russiaConfig: CountryCompetitionConfig = {
  countryId: 'russia', configVersion: 2,
  calendar: createCalendar('SATURDAY', ['FRIDAY', 'SATURDAY', 'SUNDAY', 'MONDAY'], ['TUESDAY', 'WEDNESDAY', 'THURSDAY'], [{ startMonth: 12, startDay: 15, endMonth: 2, endDay: 20 }]),
  competitions: {
    [C.russiaPremierLeague]: createLeagueCompetition({ id: C.russiaPremierLeague, countryId: 'russia', level: 1, nameKey: 'championships.russia.competitionNames.1', legacyLeagueId: 'rpl', rules: [
      { id: 'russia-rpl-relegation', type: 'direct-relegation', sourceCompetitionId: C.russiaPremierLeague, targetCompetitionId: C.russiaFirstLeague, selector: { type: 'bottom', count: 2 } },
      rplPlayoff,
    ], zones: [zones.champion, zones.relegationPlayoff({ type: 'from-bottom', offsets: [3, 4] }), zones.directRelegation({ type: 'bottom', count: 2 })] }),
    [C.russiaFirstLeague]: createLeagueCompetition({ id: C.russiaFirstLeague, countryId: 'russia', level: 2, nameKey: 'championships.russia.competitionNames.2', legacyLeagueId: 'first-league', implementationMode: 'simplified', rules: [
      { id: 'russia-first-promotion', type: 'direct-promotion', sourceCompetitionId: C.russiaFirstLeague, targetCompetitionId: C.russiaPremierLeague, selector: { type: 'top', count: 2 } },
      { id: 'russia-first-relegation', type: 'direct-relegation', sourceCompetitionId: C.russiaFirstLeague, targetCompetitionId: C.russiaSecondLeagueGold, selector: { type: 'bottom', count: 3 } },
    ], zones: [zones.directPromotion({ type: 'top', count: 2 }), zones.promotionPlayoff({ type: 'positions', positions: [3, 4] }), zones.directRelegation({ type: 'bottom', count: 3 })] }),
    [C.russiaSecondLeagueGold]: createLeagueCompetition({ id: C.russiaSecondLeagueGold, countryId: 'russia', level: 3, nameKey: 'championships.russia.competitionNames.3:gold', legacyLeagueId: 'second-league-a', legacyGroupId: 'gold', implementationMode: 'simplified', rules: [
      { id: 'russia-gold-promotion', type: 'direct-promotion', sourceCompetitionId: C.russiaSecondLeagueGold, targetCompetitionId: C.russiaFirstLeague, selector: { type: 'top', count: 2 } },
      goldPlayoff,
      { id: 'russia-gold-silver-swap', type: 'internal-group-swap', sourceCompetitionId: C.russiaSecondLeagueGold, targetCompetitionId: C.russiaSecondLeagueSilver, sourceSelector: { type: 'bottom', count: 4 }, targetSelector: { type: 'top', count: 4 } },
    ], zones: [zones.directPromotion({ type: 'top', count: 2 }), zones.promotionPlayoff({ type: 'positions', positions: [3, 4] }), zones.directRelegation({ type: 'bottom', count: 4 })] }),
    [C.russiaSecondLeagueSilver]: createLeagueCompetition({ id: C.russiaSecondLeagueSilver, countryId: 'russia', level: 3, nameKey: 'championships.russia.competitionNames.3:silver', legacyLeagueId: 'second-league-a', legacyGroupId: 'silver', implementationMode: 'simplified', rules: [
      { id: 'russia-silver-group-relegation', type: 'group-relegation', sourceCompetitionId: C.russiaSecondLeagueSilver, targetCompetitionIds: groupIds, selector: { type: 'bottom', count: 4 }, distribution: 'preserve-or-balance' },
    ], zones: [zones.directPromotion({ type: 'top', count: 4 }), zones.directRelegation({ type: 'bottom', count: 4 })] }),
    [C.russiaSecondLeagueBGroup1]: createLeagueCompetition({ id: C.russiaSecondLeagueBGroup1, countryId: 'russia', level: 4, nameKey: 'championships.russia.competitionNames.4:group-1', legacyLeagueId: 'second-league-b', legacyGroupId: 'group-1', bottomBoundaryPolicy: 'closed', implementationMode: 'simplified', rules: [
      { id: 'russia-b1-promotion', type: 'group-promotion', sourceCompetitionId: C.russiaSecondLeagueBGroup1, targetCompetitionId: C.russiaSecondLeagueSilver, selector: { type: 'top', count: 1 } },
    ], zones: [zones.directPromotion({ type: 'top', count: 1 })] }),
    [C.russiaSecondLeagueBGroup2]: createLeagueCompetition({ id: C.russiaSecondLeagueBGroup2, countryId: 'russia', level: 4, nameKey: 'championships.russia.competitionNames.4:group-2', legacyLeagueId: 'second-league-b', legacyGroupId: 'group-2', bottomBoundaryPolicy: 'closed', implementationMode: 'simplified', rules: [
      { id: 'russia-b2-promotion', type: 'group-promotion', sourceCompetitionId: C.russiaSecondLeagueBGroup2, targetCompetitionId: C.russiaSecondLeagueSilver, selector: { type: 'top', count: 1 } },
    ], zones: [zones.directPromotion({ type: 'top', count: 1 })] }),
    [C.russiaSecondLeagueBGroup3]: createLeagueCompetition({ id: C.russiaSecondLeagueBGroup3, countryId: 'russia', level: 4, nameKey: 'championships.russia.competitionNames.4:group-3', legacyLeagueId: 'second-league-b', legacyGroupId: 'group-3', bottomBoundaryPolicy: 'closed', implementationMode: 'simplified', rules: [
      { id: 'russia-b3-promotion', type: 'group-promotion', sourceCompetitionId: C.russiaSecondLeagueBGroup3, targetCompetitionId: C.russiaSecondLeagueSilver, selector: { type: 'top', count: 1 } },
    ], zones: [zones.directPromotion({ type: 'top', count: 1 })] }),
    [C.russiaSecondLeagueBGroup4]: createLeagueCompetition({ id: C.russiaSecondLeagueBGroup4, countryId: 'russia', level: 4, nameKey: 'championships.russia.competitionNames.4:group-4', legacyLeagueId: 'second-league-b', legacyGroupId: 'group-4', bottomBoundaryPolicy: 'closed', implementationMode: 'simplified', rules: [
      { id: 'russia-b4-promotion', type: 'group-promotion', sourceCompetitionId: C.russiaSecondLeagueBGroup4, targetCompetitionId: C.russiaSecondLeagueSilver, selector: { type: 'top', count: 1 } },
    ], zones: [zones.directPromotion({ type: 'top', count: 1 })] }),
  },
  cups: { 'russia-domestic-cup': createDomesticCup('russia', ['TUESDAY', 'WEDNESDAY', 'THURSDAY']) },
}
