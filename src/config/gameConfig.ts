import { careerConfig } from '@/data/gameConfig/career'
import { matchEngineConfig } from '@/data/gameConfig/matchEngine'
import type { CareerConfig, MatchEngineConfig } from '@/data/gameConfig/types'

/** @deprecated Import careerConfig or matchEngineConfig from data/gameConfig instead. */
export type GameConfig = CareerConfig & MatchEngineConfig

/** @deprecated Compatibility facade without country-specific competition rules. */
export const gameConfig: GameConfig = {
  ...careerConfig,
  ...matchEngineConfig,
}
