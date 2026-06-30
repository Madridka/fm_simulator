import type { CountryCompetitionConfig, CountryId, LeagueCompetitionConfig } from '@/data/gameConfig/types'
import { englandConfig } from '@/data/gameConfig/countries/england'
import { franceConfig } from '@/data/gameConfig/countries/france'
import { germanyConfig } from '@/data/gameConfig/countries/germany'
import { italyConfig } from '@/data/gameConfig/countries/italy'
import { russiaConfig } from '@/data/gameConfig/countries/russia'
import { spainConfig } from '@/data/gameConfig/countries/spain'

export const countryCompetitionConfigs: Record<CountryId, CountryCompetitionConfig> = {
  england: englandConfig,
  russia: russiaConfig,
  spain: spainConfig,
  italy: italyConfig,
  germany: germanyConfig,
  france: franceConfig,
}

export const getCountryCompetitionConfig = (countryId: CountryId): CountryCompetitionConfig =>
  countryCompetitionConfigs[countryId]

export const getCompetitionConfig = (
  countryId: CountryId,
  competitionId: string,
): LeagueCompetitionConfig => {
  const competition = countryCompetitionConfigs[countryId].competitions[competitionId]
  if (!competition) throw new Error(`Unknown competition ${competitionId} for ${countryId}`)
  return competition
}

export const findCompetitionConfig = (competitionId: string): LeagueCompetitionConfig | undefined => {
  for (const country of Object.values(countryCompetitionConfigs)) {
    const competition = country.competitions[competitionId]
    if (competition) return competition
  }
  return undefined
}

export * from '@/data/gameConfig/types'
export { CompetitionIds } from '@/data/gameConfig/competitionIds'
export { careerConfig } from '@/data/gameConfig/career'
export { matchEngineConfig } from '@/data/gameConfig/matchEngine'
