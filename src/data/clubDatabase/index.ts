import type { ClubProfile } from '@/data/clubs/types'

type ClubProfileModule = Record<string, unknown>

// ПРОВЕРЯЕТ, ЧТО ЭКСПОРТ МОДУЛЯ ЯВЛЯЕТСЯ КОРРЕКТНЫМ ПРОФИЛЕМ КЛУБА
const isClubProfile = (value: unknown): value is ClubProfile => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const profile = value as Partial<ClubProfile>
  return Boolean(profile.config?.id)
}

// ЗАГРУЖАЕТ ВСЕ ПРОФИЛИ КЛУБОВ ИЗ ИЕРАРХИИ БАЗЫ ДАННЫХ
const profileModules = import.meta.glob<ClubProfileModule>(['./**/*.ts', '!./index.ts'], {
  eager: true,
})

// СОБИРАЕТ ВАЛИДНЫЕ ПРОФИЛИ В СТАБИЛЬНОМ ПОРЯДКЕ
export const clubProfiles = Object.keys(profileModules)
  .sort()
  .flatMap((path) => Object.values(profileModules[path] ?? {}).filter(isClubProfile))

// СОЗДАЁТ ИНДЕКС ПРОФИЛЕЙ ДЛЯ БЫСТРОГО ПОИСКА ПО ИДЕНТИФИКАТОРУ
export const clubProfilesById = clubProfiles.reduce<Record<string, ClubProfile>>(
  (result, profile) => {
    result[profile.config.id] = profile
    return result
  },
  {},
)
