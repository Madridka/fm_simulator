export interface RandomGenerator {
  next(): number
  int(min: number, max: number): number
  chance(probability: number): boolean
  pick<T>(items: readonly T[]): T
}

export const createSeededRandom = (seed: number): RandomGenerator => {
  let state = Math.trunc(seed) % 2_147_483_647
  if (state <= 0) {
    state += 2_147_483_646
  }

  const nextRaw = (): number => {
    state = (state * 16_807) % 2_147_483_647
    return state
  }

  const next = (): number => (nextRaw() - 1) / 2_147_483_646

  return {
    next,
    int(min: number, max: number): number {
      return Math.floor(next() * (max - min + 1)) + min
    },
    chance(probability: number): boolean {
      return next() < probability
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) {
        throw new Error('Cannot pick from an empty array')
      }
      return items[Math.floor(next() * items.length)] as T
    },
  }
}

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value))
}
