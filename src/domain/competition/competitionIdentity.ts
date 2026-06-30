import { t } from '@/plugins/i18n/i18n'
import type { Club, Match } from '@/types/football'

export type CompetitionId = string

export interface ChampionshipCompetitionNames {
  id?: string
  divisionNames: Record<number, string>
  competitionNames?: Record<string, string>
}

// ОПРЕДЕЛЯЕТ УНИКАЛЬНЫЙ ИДЕНТИФИКАТОР ЛИГИ ИЛИ ГРУППЫ КЛУБА
export const getClubCompetitionId = (club: Pick<Club, 'divisionId' | 'groupId'>): CompetitionId =>
  club.groupId ? `${club.divisionId}:${club.groupId}` : String(club.divisionId)

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
