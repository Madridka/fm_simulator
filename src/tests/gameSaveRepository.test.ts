import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '@/domain/season/seasonService'
import { createMemoryStorage, gameSaveRepository } from '@/repositories/gameSaveRepository'
import type { MatchResult } from '@/types/football'

const resultWithCommentary = (text: string): MatchResult => ({
  detail: 'full',
  homeGoals: 2,
  awayGoals: 1,
  goals: [],
  stats: {
    home: { possession: 55, shots: 10, shotsOnTarget: 4, yellowCards: 1 },
    away: { possession: 45, shots: 7, shotsOnTarget: 2, yellowCards: 2 },
  },
  bestPlayerId: 'player-1',
  commentary: [{ minute: 1, text }],
})

describe('gameSaveRepository', () => {
  it('saves a compact state and restores all calculated world data', () => {
    const storage = createMemoryStorage()
    const state = createInitialGameState('russia', 'zenit')

    const saveResult = gameSaveRepository.save(state, storage)
    const loaded = gameSaveRepository.load(storage)

    expect(saveResult.saved).toBe(true)
    expect(saveResult.size).toBeLessThan(JSON.stringify(state).length)
    expect(loaded?.championshipId).toBe(state.championshipId)
    expect(loaded?.selectedClubId).toBe(state.selectedClubId)
    expect(loaded?.clubs).toHaveLength(state.clubs.length)
    expect(loaded?.matches.map((match) => match.id)).toEqual(
      state.matches.map((match) => match.id),
    )
    expect(loaded?.leagueTables).toEqual(state.leagueTables)
    expect(loaded?.worldLeagueTables).toEqual(state.worldLeagueTables)
  })

  it('keeps full user match history but compacts background results', () => {
    const storage = createMemoryStorage()
    const initial = createInitialGameState('russia', 'zenit')
    const userMatch = initial.matches.find(
      (match) => match.homeClubId === initial.selectedClubId || match.awayClubId === initial.selectedClubId,
    )!
    const backgroundMatch = initial.matches.find(
      (match) => match.homeClubId !== initial.selectedClubId && match.awayClubId !== initial.selectedClubId,
    )!
    const state = {
      ...initial,
      matches: initial.matches.map((match) => {
        if (match.id === userMatch.id) {
          return { ...match, status: 'played' as const, result: resultWithCommentary('user-event') }
        }
        if (match.id === backgroundMatch.id) {
          return {
            ...match,
            status: 'played' as const,
            result: resultWithCommentary('background-event'),
          }
        }
        return match
      }),
    }

    expect(gameSaveRepository.save(state, storage).saved).toBe(true)
    const loaded = gameSaveRepository.load(storage)
    const loadedUserMatch = loaded?.matches.find((match) => match.id === userMatch.id)
    const loadedBackgroundMatch = loaded?.matches.find((match) => match.id === backgroundMatch.id)

    expect(loadedUserMatch?.result?.commentary?.[0]?.text).toBe('user-event')
    expect(loadedBackgroundMatch?.result?.commentary).toBeUndefined()
    expect(loadedBackgroundMatch?.result?.homeGoals).toBe(2)
    expect(loadedBackgroundMatch?.result?.awayGoals).toBe(1)
  })

  it('restores foreign league results from compact score tuples', () => {
    const storage = createMemoryStorage()
    const initial = createInitialGameState('russia', 'zenit')
    const foreignMatch = initial.worldMatches?.spain?.[0]
    expect(foreignMatch).toBeDefined()

    const state = {
      ...initial,
      worldMatches: {
        ...initial.worldMatches,
        spain: initial.worldMatches?.spain?.map((match) =>
          match.id === foreignMatch!.id
            ? { ...match, status: 'played' as const, result: resultWithCommentary('foreign') }
            : match,
        ),
      },
    }

    expect(gameSaveRepository.save(state, storage).saved).toBe(true)
    const loaded = gameSaveRepository.load(storage)
    const restoredMatch = loaded?.worldMatches?.spain?.find(
      (match) => match.id === foreignMatch!.id,
    )

    expect(restoredMatch?.status).toBe('played')
    expect(restoredMatch?.result?.homeGoals).toBe(2)
    expect(restoredMatch?.result?.awayGoals).toBe(1)
    expect(restoredMatch?.result?.commentary).toBeUndefined()
  })

  it('returns a failed result instead of throwing when storage quota is exceeded', () => {
    const storage = createMemoryStorage()
    const quotaStorage = {
      ...storage,
      setItem(): void {
        const error = new Error('Storage quota exceeded')
        error.name = 'QuotaExceededError'
        throw error
      },
    }

    const result = gameSaveRepository.save(
      createInitialGameState('russia', 'zenit'),
      quotaStorage,
    )

    expect(result.saved).toBe(false)
    expect(result.error).toContain('Storage quota exceeded')
  })

  it('keeps a completed-season save safely below the usual localStorage quota', () => {
    const storage = createMemoryStorage()
    const initial = createInitialGameState('russia', 'zenit')
    const verboseResult = resultWithCommentary('Подробное событие матча. '.repeat(100))
    const completedMatches = initial.matches.map((match) => ({
      ...match,
      status: 'played' as const,
      result: verboseResult,
    }))
    const completedWorldMatches = Object.fromEntries(
      Object.entries(initial.worldMatches ?? {}).map(([championshipId, matches]) => [
        championshipId,
        matches?.map((match) => ({
          ...match,
          status: 'played' as const,
          result: verboseResult,
        })),
      ]),
    )

    const result = gameSaveRepository.save(
      {
        ...initial,
        matches: completedMatches,
        worldMatches: completedWorldMatches,
      },
      storage,
    )

    expect(result.saved).toBe(true)
    expect(result.size).toBeLessThan(3_500_000)
  })
})
