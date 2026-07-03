export type GameMode = 'club-career' | 'world-cup-2026'

export interface GameSession {
  mode: GameMode
  createdAt: string
  version: number
}

export const GAME_SESSION_VERSION = 1

export const createGameSession = (mode: GameMode): GameSession => ({
  mode,
  createdAt: new Date().toISOString(),
  version: GAME_SESSION_VERSION,
})
