import { afterEach, describe, expect, it, vi } from 'vitest'
import { simulateMatch } from '@/domain/match/matchSimulator'
import {
  getSimulationSettings,
  resetSimulationSettings,
  saveSimulationSettings,
  setRuntimeSimulationSettings,
} from '@/domain/admin/simulationSettings'
import { autoSelectLineup, getFormationSlots } from '@/domain/season/squadSelectionService'
import { clubs } from '@/data/clubs'
import type { Club, ClubLineup, PlayedLineup } from '@/types/football'

const createMemoryStorage = (): Storage => {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key) },
    setItem: (key, value) => { values.set(key, value) },
  }
}

const installBrowserStorage = (): void => {
  vi.stubGlobal('window', {
    localStorage: createMemoryStorage(),
  })
}

const playedLineup = (club: Club, lineup: ClubLineup): PlayedLineup => ({
  formation: lineup.formation,
  tacticalStyle: lineup.tacticalStyle,
  starters: getFormationSlots(lineup.formation)
    .map((slot) => lineup.starters[slot.id])
    .filter((playerId): playerId is string => Boolean(playerId)),
  substitutes: [...lineup.substitutes],
})

afterEach(() => {
  setRuntimeSimulationSettings(undefined)
  vi.unstubAllGlobals()
})

describe('simulationSettings', () => {
  it('persists values and keeps every percentage between zero and one hundred', () => {
    installBrowserStorage()

    saveSimulationSettings({
      goalkeeperGoalChancePercent: 140,
      liveBaseShotChancePercent: -20,
    })

    expect(getSimulationSettings()).toEqual({
      goalkeeperGoalChancePercent: 100,
      liveBaseShotChancePercent: 0,
    })
    expect(resetSimulationSettings()).toEqual({
      goalkeeperGoalChancePercent: 0.1,
      liveBaseShotChancePercent: 12.5,
    })
  })

  it('uses the configured goalkeeper probability for simulated goal scorers', () => {
    installBrowserStorage()
    saveSimulationSettings({ goalkeeperGoalChancePercent: 100 })
    const home = clubs[0] as Club
    const away = clubs[1] as Club
    const homeLineup = playedLineup(home, autoSelectLineup(home))
    const awayLineup = playedLineup(away, autoSelectLineup(away))
    const results = Array.from({ length: 40 }, (_, index) => simulateMatch({
      matchId: `goalkeeper-setting-${index}`,
      homeClub: home,
      awayClub: away,
      homeLineup,
      awayLineup,
      neutralVenue: false,
      allowPenaltyShootout: false,
      seed: (index + 1) * 104_729,
    }))
    const goals = results.flatMap((result) => result.goals)
    const players = new Map([...home.squad, ...away.squad].map((player) => [player.id, player]))

    expect(goals.length).toBeGreaterThan(0)
    expect(goals.every((goal) => players.get(goal.playerId)?.position === 'GK')).toBe(true)
  })

  it('accepts a settings snapshot in environments without local storage', () => {
    setRuntimeSimulationSettings({
      goalkeeperGoalChancePercent: 25,
      liveBaseShotChancePercent: 18,
    })

    expect(getSimulationSettings()).toEqual({
      goalkeeperGoalChancePercent: 25,
      liveBaseShotChancePercent: 18,
    })
  })
})
