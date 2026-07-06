import { describe, expect, it } from 'vitest'
import { createLiveMatch } from '@/domain/match/liveMatchEngine'
import { autoSelectLineup, getFormationSlots } from '@/domain/season/squadSelectionService'
import { clubs } from '@/data/clubs'
import type { Club, ClubLineup, PlayedLineup } from '@/types/football'

const playedLineup = (club: Club, lineup: ClubLineup): PlayedLineup => ({
  formation: lineup.formation,
  tacticalStyle: lineup.tacticalStyle,
  starters: getFormationSlots(lineup.formation)
    .map((slot) => lineup.starters[slot.id])
    .filter((id): id is string => Boolean(id)),
  substitutes: [...lineup.substitutes],
})

const setup = (maxSubstitutions = 5) => {
  const home = clubs[0] as Club
  const away = clubs[1] as Club
  return createLiveMatch({
    matchId: 'live-test',
    homeClub: home,
    awayClub: away,
    homeLineup: playedLineup(home, autoSelectLineup(home)),
    awayLineup: playedLineup(away, autoSelectLineup(away)),
    neutralVenue: false,
    allowPenaltyShootout: false,
    controlledTeamId: home.id,
    maxSubstitutions,
    seed: 42,
  })
}

describe('liveMatchEngine', () => {
  it('advances in segments and applies tactical changes immediately', () => {
    const match = setup()
    match.advance(10)
    match.changeTactics(match.state.homeTeamId, { mentality: 'attacking', tempo: 'fast' })
    match.advance(5)

    expect(match.state.minute).toBe(15)
    expect(match.state.homeTactics.mentality).toBe('attacking')
    expect(match.result().tacticalChanges).toEqual([
      expect.objectContaining({ minute: 10, teamId: match.state.homeTeamId }),
    ])
  })

  it('updates the active lineup and enforces the substitution limit', () => {
    const match = setup(1)
    const playerOutId = match.state.homeLineupPlayerIds[0]!
    const playerInId = match.state.homeBenchPlayerIds[0]!
    match.advance(20)
    match.substitute(match.state.homeTeamId, playerOutId, playerInId)

    expect(match.state.homeLineupPlayerIds).toContain(playerInId)
    expect(match.state.homeLineupPlayerIds).not.toContain(playerOutId)
    expect(match.result().substitutions).toEqual([
      { minute: 20, clubId: match.state.homeTeamId, playerOutId, playerInId },
    ])
    expect(() =>
      match.substitute(
        match.state.homeTeamId,
        match.state.homeLineupPlayerIds[1]!,
        match.state.homeBenchPlayerIds[0]!,
      ),
    ).toThrow('Лимит замен исчерпан')
  })

  it('records player minutes across a substitution and finishes cleanly', () => {
    const match = setup()
    const playerOutId = match.state.homeLineupPlayerIds[0]!
    const playerInId = match.state.homeBenchPlayerIds[0]!
    match.advance(60)
    match.substitute(match.state.homeTeamId, playerOutId, playerInId)
    match.advance(30)
    const result = match.result()

    expect(result.playerMinutes?.[playerOutId]).toBe(60)
    expect(result.playerMinutes?.[playerInId]).toBe(30)
    expect(result.matchEvents?.at(-1)?.type).toBe('full-time')
  })
})
