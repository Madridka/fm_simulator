import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '@/domain/season/seasonService'
import { createMemoryStorage, gameSaveRepository } from '@/repositories/gameSaveRepository'

describe('gameSaveRepository', () => {
  it('saves and restores a complete game state', () => {
    const storage = createMemoryStorage()
    const state = createInitialGameState('zenit')

    gameSaveRepository.save(state, storage)

    expect(gameSaveRepository.load(storage)).toEqual(state)
  })
})
