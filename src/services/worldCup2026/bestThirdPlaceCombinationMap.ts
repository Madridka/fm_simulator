import type { WorldCupGroupId } from '@/stores/worldCup2026/enums'
import combinationMap from '@/services/worldCup2026/bestThirdPlaceCombinationMap.json'

export type ThirdPlaceWinnerSlot = '1A' | '1B' | '1D' | '1E' | '1G' | '1I' | '1K' | '1L'

export type BestThirdPlaceCombinationMap = Record<
  string,
  Record<ThirdPlaceWinnerSlot, WorldCupGroupId>
>

export const bestThirdPlaceCombinationMap = combinationMap as BestThirdPlaceCombinationMap

export const getThirdPlaceSlotAssignment = (
  qualifyingGroupLetters: readonly WorldCupGroupId[],
): Record<ThirdPlaceWinnerSlot, WorldCupGroupId> => {
  const key = [...new Set(qualifyingGroupLetters)].sort().join('')
  const assignment = bestThirdPlaceCombinationMap[key]
  if (!assignment) {
    throw new Error(`Unknown third-place combination: ${key}`)
  }
  return assignment
}
