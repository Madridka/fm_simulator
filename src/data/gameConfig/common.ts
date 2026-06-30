import type {
  CountryId,
  CupCompetitionConfig,
  LeagueCompetitionConfig,
  SeasonCalendarConfig,
  TableZoneConfig,
  TransitionRule,
  WeekDay,
} from '@/data/gameConfig/types'
import { createCompetitionRewards } from '@/data/gameConfig/economy'

export const commonCupRewards = {
  roundRewards: {
    preliminary: 750_000,
    round_of_128: 750_000,
    round_of_64: 1_000_000,
    round_of_32: 1_250_000,
    round_of_16: 2_500_000,
    quarter_final: 5_000_000,
    semi_final: 9_000_000,
    final: 15_000_000,
  },
  winnerReward: 25_000_000,
}

export const createCalendar = (
  preferredMatchDay: WeekDay,
  weekendMatchDays: WeekDay[],
  midweekMatchDays: WeekDay[],
  winterBreaks: SeasonCalendarConfig['winterBreaks'] = [],
): SeasonCalendarConfig => ({
  startMonth: 9,
  startDay: 1,
  endMonth: 5,
  endDay: 31,
  leagueEndMonth: 5,
  leagueEndDay: 15,
  preferredMatchDay,
  weekendMatchDays,
  midweekMatchDays,
  minimumRestDays: 2,
  winterBreaks,
  cupPriority: 100,
  leaguePriority: 50,
})

interface CompetitionInput {
  id: string
  countryId: CountryId
  level: number
  nameKey: string
  legacyLeagueId: string
  legacyGroupId?: string
  rules?: TransitionRule[]
  zones?: TableZoneConfig[]
  bottomBoundaryPolicy?: LeagueCompetitionConfig['bottomBoundaryPolicy']
  implementationMode?: 'simplified'
}

export const createLeagueCompetition = (input: CompetitionInput): LeagueCompetitionConfig => ({
  id: input.id,
  countryId: input.countryId,
  level: input.level,
  nameKey: input.nameKey,
  legacyLeagueId: input.legacyLeagueId,
  legacyGroupId: input.legacyGroupId,
  format: { rounds: 2 },
  schedule: { rounds: 2, avoidHomeAwayStreakLongerThan: 3 },
  transitions: { rules: input.rules ?? [], implementationMode: input.implementationMode },
  rewards: createCompetitionRewards(input.level),
  tableZones: input.zones ?? [],
  bottomBoundaryPolicy: input.bottomBoundaryPolicy,
})

export const createDomesticCup = (
  countryId: CountryId,
  preferredMatchDays: WeekDay[],
): CupCompetitionConfig => ({
  id: `${countryId}-domestic-cup`,
  countryId,
  nameKey: `competitions.${countryId}.cup`,
  roundNameKeyPrefix: 'cup.roundNames',
  preferredMatchDays,
  finalMatchDays: ['SATURDAY', 'SUNDAY'],
  rewards: {
    roundRewards: { ...commonCupRewards.roundRewards },
    winnerReward: commonCupRewards.winnerReward,
  },
})

const championZone: TableZoneConfig = {
  type: 'champion',
  selector: { type: 'top', count: 1 },
  labelKey: 'leagueTable.zones.champion',
}

export const zones = {
  champion: championZone,
  directPromotion: (selector: TableZoneConfig['selector']): TableZoneConfig => ({ type: 'direct-promotion', selector, labelKey: 'leagueTable.zones.directPromotion' }),
  promotionPlayoff: (selector: TableZoneConfig['selector']): TableZoneConfig => ({ type: 'promotion-playoff', selector, labelKey: 'leagueTable.zones.promotionPlayoff' }),
  relegationPlayoff: (selector: TableZoneConfig['selector']): TableZoneConfig => ({ type: 'relegation-playoff', selector, labelKey: 'leagueTable.zones.relegationPlayoff' }),
  directRelegation: (selector: TableZoneConfig['selector']): TableZoneConfig => ({ type: 'direct-relegation', selector, labelKey: 'leagueTable.zones.directRelegation' }),
}
