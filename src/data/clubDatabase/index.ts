import type { ClubProfile } from '@/data/clubs/types'

type ClubProfileModule = Record<string, unknown>

const isClubProfile = (value: unknown): value is ClubProfile => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const profile = value as Partial<ClubProfile>
  return Boolean(profile.config?.id)
}

const profileModules = import.meta.glob<ClubProfileModule>(['./**/index.ts', '!./index.ts'], {
  eager: true,
})

export const clubProfiles = Object.keys(profileModules)
  .sort()
  .flatMap((path) => Object.values(profileModules[path] ?? {}).filter(isClubProfile))

export const clubProfilesById = clubProfiles.reduce<Record<string, ClubProfile>>(
  (result, profile) => {
    result[profile.config.id] = profile
    return result
  },
  {},
)
