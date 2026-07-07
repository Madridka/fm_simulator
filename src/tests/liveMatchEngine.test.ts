import { describe, expect, it } from 'vitest'
import { createLiveMatch } from '@/domain/match/liveMatchEngine'
import { simulateMatch } from '@/domain/match/matchSimulator'
import {
  autoSelectLineup,
  defaultTeamTactics,
  getFormationSlots,
} from '@/domain/season/squadSelectionService'
import { clubs } from '@/data/clubs'
import type { Club, ClubLineup, PlayedLineup } from '@/types/football'

const playedLineup = (club: Club, lineup: ClubLineup): PlayedLineup => ({
  formation: lineup.formation,
  tacticalStyle: lineup.tacticalStyle,
  tactics: lineup.tactics,
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

  it('starts with the tactical style selected in the squad screen', () => {
    const home = clubs[0] as Club
    const away = clubs[1] as Club
    const homeLineup = autoSelectLineup(home, '4-4-2', 'attacking')
    const match = createLiveMatch({
      matchId: 'selected-tactical-style',
      homeClub: home,
      awayClub: away,
      homeLineup: playedLineup(home, homeLineup),
      awayLineup: playedLineup(away, autoSelectLineup(away)),
      neutralVenue: false,
      allowPenaltyShootout: false,
      controlledTeamId: home.id,
      seed: 42,
    })

    expect(match.state.homeTactics.mentality).toBe('attacking')
  })

  it('starts with the detailed tactics selected in the squad screen', () => {
    const home = clubs[0] as Club
    const away = clubs[1] as Club
    const homeLineup = autoSelectLineup(home, '4-4-2', 'attacking', {
      ...defaultTeamTactics('attacking'),
      mentality: 'allOutAttack',
      pressing: 'high',
      tempo: 'fast',
      width: 'wide',
      defensiveLine: 'high',
      attackPlan: 'throughBalls',
      defensiveShape: 'wide',
      tackling: 'hard',
      matchCommand: 'loadBox',
      teamTalk: 'demandMore',
    })
    const match = createLiveMatch({
      matchId: 'selected-detailed-tactics',
      homeClub: home,
      awayClub: away,
      homeLineup: playedLineup(home, homeLineup),
      awayLineup: playedLineup(away, autoSelectLineup(away)),
      neutralVenue: false,
      allowPenaltyShootout: false,
      controlledTeamId: home.id,
      seed: 42,
    })

    expect(match.state.homeTactics).toMatchObject({
      formation: '4-4-2',
      mentality: 'allOutAttack',
      pressing: 'high',
      tempo: 'fast',
      width: 'wide',
      defensiveLine: 'high',
      attackPlan: 'throughBalls',
      defensiveShape: 'wide',
      tackling: 'hard',
      matchCommand: 'loadBox',
      teamTalk: 'demandMore',
    })
  })

  it('keeps live scoring on the same scale as background simulation', () => {
    const home = clubs[0] as Club
    const away = clubs[1] as Club
    let homeGoals = 0
    let awayGoals = 0
    let backgroundGoals = 0
    const sampleSize = 500

    for (let seed = 1; seed <= sampleSize; seed += 1) {
      const simulationSeed = seed * 104_729
      const homeLineup = playedLineup(home, autoSelectLineup(home))
      const awayLineup = playedLineup(away, autoSelectLineup(away))
      const match = createLiveMatch({
        matchId: `live-balance-${seed}`,
        homeClub: home,
        awayClub: away,
        homeLineup,
        awayLineup,
        neutralVenue: false,
        allowPenaltyShootout: false,
        controlledTeamId: home.id,
        seed: simulationSeed,
      })
      match.advance(90)
      homeGoals += match.result().homeGoals
      awayGoals += match.result().awayGoals
      const background = simulateMatch({
        matchId: `background-balance-${seed}`,
        homeClub: home,
        awayClub: away,
        homeLineup,
        awayLineup,
        neutralVenue: false,
        allowPenaltyShootout: false,
        seed: simulationSeed,
      })
      backgroundGoals += background.homeGoals + background.awayGoals
    }

    const liveAverage = (homeGoals + awayGoals) / sampleSize
    const backgroundAverage = backgroundGoals / sampleSize
    expect(liveAverage).toBeGreaterThan(backgroundAverage * 0.75)
    expect(liveAverage).toBeLessThan(backgroundAverage * 1.25)
  })

  it('makes all-out tactics noticeable without multiplying attack excessively', () => {
    const home = clubs[0] as Club
    const away = clubs[1] as Club
    let balancedShots = 0
    let allOutShots = 0
    const sampleSize = 300

    for (let seed = 1; seed <= sampleSize; seed += 1) {
      const simulationSeed = seed * 104_729
      const createSample = () => createLiveMatch({
        matchId: `tactics-balance-${seed}`,
        homeClub: home,
        awayClub: away,
        homeLineup: playedLineup(home, autoSelectLineup(home)),
        awayLineup: playedLineup(away, autoSelectLineup(away)),
        neutralVenue: true,
        allowPenaltyShootout: false,
        controlledTeamId: home.id,
        seed: simulationSeed,
      })
      const balanced = createSample()
      const allOut = createSample()
      allOut.changeTactics(home.id, {
        mentality: 'allOutAttack',
        pressing: 'high',
        tempo: 'fast',
      })
      balanced.advance(90)
      allOut.advance(90)
      balancedShots += balanced.result().stats.home.shots
      allOutShots += allOut.result().stats.home.shots
    }

    expect(allOutShots).toBeGreaterThan(balancedShots * 1.2)
    expect(allOutShots).toBeLessThan(balancedShots * 1.75)
  })

  it('makes the park-the-bus mentality reduce opponent shot volume', () => {
    const home = clubs[0] as Club
    const away = clubs[1] as Club
    let balancedAwayShots = 0
    let busAwayShots = 0
    const sampleSize = 220

    for (let seed = 1; seed <= sampleSize; seed += 1) {
      const simulationSeed = seed * 97_531
      const createSample = () => createLiveMatch({
        matchId: `bus-impact-${seed}`,
        homeClub: home,
        awayClub: away,
        homeLineup: playedLineup(home, autoSelectLineup(home)),
        awayLineup: playedLineup(away, autoSelectLineup(away)),
        neutralVenue: true,
        allowPenaltyShootout: false,
        controlledTeamId: home.id,
        seed: simulationSeed,
      })
      const balanced = createSample()
      const bus = createSample()
      bus.changeTactics(home.id, {
        mentality: 'parkTheBus',
        pressing: 'low',
        tempo: 'slow',
        defensiveLine: 'low',
        defensiveShape: 'compact',
        tackling: 'cautious',
        matchCommand: 'holdLead',
        teamTalk: 'calm',
      })
      balanced.advance(90)
      bus.advance(90)
      balancedAwayShots += balanced.result().stats.away.shots
      busAwayShots += bus.result().stats.away.shots
    }

    expect(busAwayShots).toBeLessThan(balancedAwayShots * 0.9)
  })

  it('updates the active lineup and enforces the substitution limit', () => {
    const match = setup(1)
    const playerOutId = match.state.homeLineupPlayerIds[0]!
    const playerInId = match.state.homeBenchPlayerIds[0]!
    match.advance(20)
    match.substitute(match.state.homeTeamId, playerOutId, playerInId)

    expect(match.state.homeLineupPlayerIds).toContain(playerInId)
    expect(match.state.homeLineupPlayerIds).not.toContain(playerOutId)
    expect(match.state.homeBenchPlayerIds).not.toContain(playerInId)
    expect(match.state.homeBenchPlayerIds).not.toContain(playerOutId)
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

  it('changes the formation without replacing the active players', () => {
    const match = setup()
    const activePlayers = [...match.state.homeLineupPlayerIds]

    match.advance(15)
    match.changeTactics(match.state.homeTeamId, { formation: '4-3-3' })

    expect(match.state.homeTactics.formation).toBe('4-3-3')
    expect(match.state.homeLineupPlayerIds).toEqual(activePlayers)
    expect(match.result().tacticalChanges).toContainEqual({
      minute: 15,
      teamId: match.state.homeTeamId,
      changes: { formation: '4-3-3' },
    })
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
