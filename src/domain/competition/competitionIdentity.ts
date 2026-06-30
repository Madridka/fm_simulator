import { t } from '@/plugins/i18n/i18n'
import type { Club, Match } from '@/types/football'
import { countryCompetitionConfigs } from '@/data/gameConfig'

export type CompetitionId = string

export interface ChampionshipCompetitionNames {
  id?: string
  divisionNames: Record<number, string>
  competitionNames?: Record<string, string>
}

// ОПРЕДЕЛЯЕТ УНИКАЛЬНЫЙ ИДЕНТИФИКАТОР ЛИГИ ИЛИ ГРУППЫ КЛУБА
export const resolveLegacyCompetitionId = (
  leagueId: string | undefined,
  groupId: string | undefined,
  divisionId: number,
): CompetitionId => {
  for (const country of Object.values(countryCompetitionConfigs)) {
    const match = Object.values(country.competitions).find(
      (competition) =>
        competition.legacyLeagueId === leagueId &&
        (competition.legacyGroupId ?? undefined) === (groupId ?? undefined),
    )
    if (match) return match.id
  }
  return groupId ? `${divisionId}:${groupId}` : String(divisionId)
}

export const getClubCompetitionId = (
  club: Pick<Club, 'competitionId' | 'divisionId' | 'leagueId' | 'groupId'>,
): CompetitionId =>
  club.competitionId ??
  resolveLegacyCompetitionId(club.leagueId, club.groupId, club.divisionId)

// ОПРЕДЕЛЯЕТ СОРЕВНОВАНИЕ, К КОТОРОМУ ОТНОСИТСЯ МАТЧ
export const getMatchCompetitionId = (
  match: Pick<Match, 'competitionId' | 'divisionId' | 'homeClubId'>,
  clubsById?: ReadonlyMap<string, Club>,
): CompetitionId => {
  if (match.competitionId) {
    return match.competitionId
  }

  const homeClub = clubsById?.get(match.homeClubId)
  if (homeClub) {
    return getClubCompetitionId(homeClub)
  }

  return String(match.divisionId ?? 1)
}

// СОБИРАЕТ ЧИТАЕМЫЕ НАЗВАНИЯ ВСЕХ СОРЕВНОВАНИЙ ЧЕМПИОНАТА
export const getCompetitionNames = (
  championship: ChampionshipCompetitionNames,
): Record<string, string> => {
  if (championship.id && championship.id in countryCompetitionConfigs) {
    const config = countryCompetitionConfigs[championship.id as keyof typeof countryCompetitionConfigs]
    return Object.fromEntries(
      Object.values(config.competitions).map((competition) => [competition.id, t(competition.nameKey)]),
    )
  }
  return (
    championship.competitionNames ??
    Object.fromEntries(
      Object.entries(championship.divisionNames).map(([divisionId, name]) => [divisionId, name]),
    )
  )
}

// ВОЗВРАЩАЕТ НАЗВАНИЕ ОДНОГО СОРЕВНОВАНИЯ С РЕЗЕРВНЫМ ВАРИАНТОМ
export const getCompetitionName = (
  championship: ChampionshipCompetitionNames | undefined,
  competitionId: CompetitionId,
): string => {
  if (!championship) {
    return t('common.competitionFallback', { competition: competitionId })
  }

  const competitionName = getCompetitionNames(championship)[competitionId]
  if (competitionName) {
    return competitionName
  }

  const divisionId = Number(competitionId.split(':')[0])
  return (
    championship.divisionNames[divisionId] ??
    t('common.competitionFallback', { competition: competitionId })
  )
}
