import { buildSquad } from '@/data/players'
import { clubProfilesById } from '@/data/clubDatabase'
import type { ClubConfig, ClubProfile } from '@/data/clubs/types'
import type { Club } from '@/types/football'
import { resolveLegacyCompetitionId } from '@/domain/competition/competitionIdentity'

// ОБЪЕДИНЯЕТ БАЗОВЫЙ ПРОФИЛЬ КЛУБА С РАСШИРЕННЫМИ ДАННЫМИ ИЗ БАЗЫ
const mergeProfile = (baseProfile: ClubProfile, overrideProfile?: ClubProfile): ClubProfile => ({
  ...baseProfile,
  ...overrideProfile,
  config: {
    ...baseProfile.config,
    ...overrideProfile?.config,
  },
})

// ПРЕОБРАЗУЕТ ПРОФИЛЬ В ИГРОВОЙ КЛУБ И ДОСТРАИВАЕТ СОСТАВ ПРИ НЕОБХОДИМОСТИ
const createClub = (profile: ClubProfile, index: number): Club => {
  const sourceProfile = mergeProfile(profile, clubProfilesById[profile.config.id])
  const sourceConfig = sourceProfile.config

  return {
    ...sourceConfig,
    competitionId:
      sourceConfig.competitionId ??
      resolveLegacyCompetitionId(sourceConfig.leagueId, sourceConfig.groupId, sourceConfig.divisionId),
    logoUrl: sourceProfile.assets?.crestUrl ?? sourceConfig.logoUrl,
    squad:
      sourceProfile.squad ??
      buildSquad(
        sourceConfig.id,
        index,
        sourceConfig.attackRating,
        sourceConfig.midfieldRating,
        sourceConfig.defenseRating,
      ),
  }
}

// СОЗДАЁТ ИГРОВЫЕ КЛУБЫ ИЗ КОНФИГУРАЦИИ ЧЕМПИОНАТА
export const createClubs = (clubProfiles: readonly ClubProfile[]): Club[] =>
  clubProfiles.map((club, index) => createClub(club, index))

export type { ClubConfig, ClubProfile }
