import { matchSimulationConfig } from '@/config/matchSimulationConfig'

export interface SimulationSettings {
  goalkeeperGoalChancePercent: number
  liveBaseShotChancePercent: number
}

export const defaultSimulationSettings: SimulationSettings = {
  goalkeeperGoalChancePercent: 0.1,
  liveBaseShotChancePercent: matchSimulationConfig.liveMatch.baseShotChance * 100,
}

const STORAGE_KEY = 'fm-simulator-admin-settings-v1'
let runtimeSettings: SimulationSettings | undefined

const clampPercent = (value: unknown, fallback: number): number => {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(100, Math.max(0, parsed))
}

const readStorage = (): Storage | undefined => {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

export const normalizeSimulationSettings = (
  value: Partial<SimulationSettings>,
): SimulationSettings => ({
  goalkeeperGoalChancePercent: clampPercent(
    value.goalkeeperGoalChancePercent,
    defaultSimulationSettings.goalkeeperGoalChancePercent,
  ),
  liveBaseShotChancePercent: clampPercent(
    value.liveBaseShotChancePercent,
    defaultSimulationSettings.liveBaseShotChancePercent,
  ),
})

export const getSimulationSettings = (): SimulationSettings => {
  if (runtimeSettings) return { ...runtimeSettings }
  const stored = readStorage()?.getItem(STORAGE_KEY)
  if (!stored) return { ...defaultSimulationSettings }

  try {
    return normalizeSimulationSettings(JSON.parse(stored) as Partial<SimulationSettings>)
  } catch {
    return { ...defaultSimulationSettings }
  }
}

// Web Workers cannot read localStorage, so the main thread provides a snapshot.
export const setRuntimeSimulationSettings = (
  value: Partial<SimulationSettings> | undefined,
): void => {
  runtimeSettings = value ? normalizeSimulationSettings(value) : undefined
}

export const saveSimulationSettings = (
  value: Partial<SimulationSettings>,
): SimulationSettings => {
  const settings = normalizeSimulationSettings(value)
  readStorage()?.setItem(STORAGE_KEY, JSON.stringify(settings))
  return settings
}

export const resetSimulationSettings = (): SimulationSettings => {
  readStorage()?.removeItem(STORAGE_KEY)
  return { ...defaultSimulationSettings }
}
