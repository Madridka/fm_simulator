import achievementCatalogData from '@/data/achievementCatalog.json'

export type AchievementCategory = 'career' | 'league' | 'match' | 'collection' | 'epic'

export interface AchievementDefinition {
  id: string
  title: string
  description: string
  category: AchievementCategory
  points: number
  hidden?: boolean
}

export const achievementCategoryLabels: Record<AchievementCategory, string> = {
  career: 'Карьера',
  league: 'Лига',
  match: 'Матчи',
  collection: 'Коллекция',
  epic: 'Эпические',
}

export const achievementCatalog = achievementCatalogData as AchievementDefinition[]

export const achievementById = Object.fromEntries(
  achievementCatalog.map((achievement) => [achievement.id, achievement]),
) as Record<string, AchievementDefinition>
