import { buildSquad } from '@/data/players'
import { clubProfilesById } from '@/data/clubDatabase'
import type { ClubConfig, ClubProfile } from '@/data/clubs/types'
import type { Club, Player } from '@/types/football'
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

// ДЕЛАЕТ ИДЕНТИФИКАТОР ИГРОКА УНИКАЛЬНЫМ В МАСШТАБЕ ВСЕЙ БАЗЫ И УБИРАЕТ
// ОДНОСИМВОЛЬНЫЕ ЗАГЛУШКИ ФАМИЛИЙ ИЗ ОТОБРАЖАЕМОГО СОСТАВА
const normalizePlayer = (player: Player, clubId: string): Player => {
  const lastName = player.lastName.trim()

  return {
    ...player,
    id: `${clubId}:${player.id}`,
    lastName: lastName.length === 1 ? '' : lastName,
  }
}

// ПРЕОБРАЗУЕТ ПРОФИЛЬ В ИГРОВОЙ КЛУБ И ДОСТРАИВАЕТ СОСТАВ ПРИ НЕОБХОДИМОСТИ
const createClub = (profile: ClubProfile, index: number): Club => {
  const sourceProfile = mergeProfile(profile, clubProfilesById[profile.config.id])
  const sourceConfig = sourceProfile.config
  const sourceSquad =
    sourceProfile.squad ??
    buildSquad(
      sourceConfig.id,
      index,
      sourceConfig.attackRating,
      sourceConfig.midfieldRating,
      sourceConfig.defenseRating,
    )

  return {
    ...sourceConfig,
    competitionId:
      sourceConfig.competitionId ??
      resolveLegacyCompetitionId(sourceConfig.leagueId, sourceConfig.groupId, sourceConfig.divisionId),
    logoUrl: sourceProfile.assets?.crestUrl ?? sourceConfig.logoUrl,
    squad: sourceSquad.map((player) => normalizePlayer(player, sourceConfig.id)),
  }
}

// СОЗДАЁТ ИГРОВЫЕ КЛУБЫ ИЗ КОНФИГУРАЦИИ ЧЕМПИОНАТА
export const createClubs = (clubProfiles: readonly ClubProfile[]): Club[] =>
  clubProfiles.map((club, index) => createClub(club, index))

export type { ClubConfig, ClubProfile }
