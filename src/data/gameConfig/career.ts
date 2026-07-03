import type { CareerConfig } from '@/data/gameConfig/types'

export const careerConfig: CareerConfig = {
  maximumSeasons: 70,
  minimumSquadSize: 16,
  maximumSquadSize: 35,
  transferSaleCoefficient: 0.8,
}

export const playerRetirementAge = 38

export const seasonsUntilPlayerRetirement = (age: number): number =>
  Math.max(1, playerRetirementAge - age + 1)

export const willPlayerRetireAfterSeason = (age: number): boolean =>
  age >= playerRetirementAge
