import { describe, expect, it } from 'vitest'
import {
  createMatchTimeline,
  removeGoalsAfterPlayerExit,
  simulateMatch,
} from '@/domain/match/matchSimulator'
import { normalizeCardEvents } from '@/domain/match/disciplineService'
import { applySuspensionsAfterMatch } from '@/domain/season/playerAvailability'
import {
  autoSelectLineup,
  formations,
  getFormationSlots,
  getPositionFit,
  validateLineup,
} from '@/domain/season/squadSelectionService'
import { clubs } from '@/data/clubs'
import type { Club, ClubLineup, PlayedLineup } from '@/types/football'

const playedLineup = (club: Club, lineup: ClubLineup): PlayedLineup => ({
  formation: lineup.formation,
  tacticalStyle: lineup.tacticalStyle,
  starters: getFormationSlots(lineup.formation)
    .map((slot) => lineup.starters[slot.id])
    .filter((playerId): playerId is string => typeof playerId === 'string'),
  substitutes: [...lineup.substitutes],
})

describe('matchSimulator', () => {
  it('removes goals and assists recorded after a player left the pitch', () => {
    const goals = removeGoalsAfterPlayerExit(
      [
        { minute: 40, clubId: 'club', playerId: 'sent-off', playerName: 'Player' },
        { minute: 80, clubId: 'club', playerId: 'sent-off', playerName: 'Player' },
        {
          minute: 75,
          clubId: 'club',
          playerId: 'active',
          playerName: 'Active',
          assistPlayerId: 'injured',
          assistPlayerName: 'Injured',
        },
      ],
      [{ minute: 50, clubId: 'club', playerId: 'sent-off', card: 'red' }],
      [{ minute: 60, clubId: 'club', playerId: 'injured' }],
    )

    expect(goals).toHaveLength(2)
    expect(goals.some((goal) => goal.minute === 80)).toBe(false)
    expect(goals.find((goal) => goal.minute === 75)?.assistPlayerId).toBeUndefined()
  })

  it('never lets an injured or dismissed player score later in a full match', () => {
    const home = clubs[0] as Club
    const away = clubs[1] as Club
    for (let seed = 1; seed <= 120; seed += 1) {
      const result = createMatchTimeline({
        matchId: `departure-${seed}`,
        homeClub: home,
        awayClub: away,
        homeLineup: playedLineup(home, autoSelectLineup(home)),
        awayLineup: playedLineup(away, autoSelectLineup(away)),
        neutralVenue: false,
        allowPenaltyShootout: false,
        seed,
      }).finalResult
      const departures = [
        ...(result.cards ?? [])
          .filter((card) => card.card === 'red')
          .map((card) => ({ playerId: card.playerId, minute: card.minute ?? 90 })),
        ...(result.injuries ?? []).map((injury) => ({
          playerId: injury.playerId,
          minute: injury.minute ?? 90,
        })),
      ]
      for (const departure of departures) {
        expect(
          result.goals.some(
            (goal) => goal.playerId === departure.playerId && goal.minute > departure.minute,
          ),
        ).toBe(false)
        expect(
          result.goals.some(
            (goal) => goal.assistPlayerId === departure.playerId && goal.minute > departure.minute,
          ),
        ).toBe(false)
      }
    }
  })

  it('turns a second yellow card for the same player into a dismissal', () => {
    const cards = normalizeCardEvents([
      { minute: 24, clubId: 'club', playerId: 'player', card: 'yellow' },
      { minute: 67, clubId: 'club', playerId: 'player', card: 'yellow' },
    ])

    expect(cards).toEqual([
      { minute: 24, clubId: 'club', playerId: 'player', card: 'yellow' },
      {
        minute: 67,
        clubId: 'club',
        playerId: 'player',
        card: 'red',
        dismissalReason: 'second-yellow',
      },
    ])
  })

  it('does not select a suspended player for the next match', () => {
    const source = clubs[0] as Club
    const lineupWithSuspendedPlayer = autoSelectLineup(source)
    const suspendedPlayerId = Object.values(lineupWithSuspendedPlayer.starters).find(
      (playerId): playerId is string => typeof playerId === 'string',
    )!
    const club: Club = {
      ...source,
      squad: source.squad.map((player) =>
        player.id === suspendedPlayerId
          ? { ...player, suspensionMatchesRemaining: 1, suspensionReason: 'red-card' }
          : { ...player },
      ),
    }
    const automaticLineup = autoSelectLineup(club)

    expect(Object.values(automaticLineup.starters)).not.toContain(suspendedPlayerId)
    expect(validateLineup(club, lineupWithSuspendedPlayer).valid).toBe(false)
  })

  it('clears a one-match suspension after the club plays its next fixture', () => {
    const source = clubs[0] as Club
    const opponent = clubs[1] as Club
    const playerId = source.squad[0]!.id
    const suspendedClub: Club = {
      ...source,
      squad: source.squad.map((player) =>
        player.id === playerId
          ? { ...player, suspensionMatchesRemaining: 1, suspensionReason: 'red-card' }
          : { ...player },
      ),
    }
    const updated = applySuspensionsAfterMatch(
      [suspendedClub, opponent],
      { homeClubId: suspendedClub.id, awayClubId: opponent.id },
    )

    expect(
      updated.find((club) => club.id === suspendedClub.id)?.squad.find((player) => player.id === playerId)
        ?.suspensionMatchesRemaining,
    ).toBeUndefined()
  })

  it('fills every formation slot with a player of the exact position when available', () => {
    const club = clubs[0] as Club

    for (const formation of formations) {
      const lineup = autoSelectLineup(club, formation)
      for (const slot of getFormationSlots(formation)) {
        const player = club.squad.find((candidate) => candidate.id === lineup.starters[slot.id])
        expect(player?.position).toBe(slot.position)
      }
    }
  })

  it('produces reproducible results with the same seed', () => {
    const home = clubs[0] as Club
    const away = clubs[1] as Club
    const input = {
      matchId: 'test-match',
      homeClub: home,
      awayClub: away,
      homeLineup: playedLineup(home, autoSelectLineup(home)),
      awayLineup: playedLineup(away, autoSelectLineup(away)),
      neutralVenue: false,
      allowPenaltyShootout: false,
      seed: 12345,
    }

    expect(simulateMatch(input)).toEqual(simulateMatch(input))
  })

  it('uses only position-compatible outfield players for substitutions', () => {
    const home = clubs[0] as Club
    const away = clubs[1] as Club
    const result = createMatchTimeline({
      matchId: 'position-compatible-substitutions',
      homeClub: home,
      awayClub: away,
      homeLineup: playedLineup(home, autoSelectLineup(home)),
      awayLineup: playedLineup(away, autoSelectLineup(away)),
      neutralVenue: false,
      allowPenaltyShootout: false,
      seed: 731,
    }).finalResult

    expect(result.substitutions?.length).toBeGreaterThan(0)
    for (const substitution of result.substitutions ?? []) {
      const club = substitution.clubId === home.id ? home : away
      const playerOut = club.squad.find((player) => player.id === substitution.playerOutId)
      const playerIn = club.squad.find((player) => player.id === substitution.playerInId)

      expect(playerOut?.position).not.toBe('GK')
      expect(playerIn?.position).not.toBe('GK')
      expect(getPositionFit(playerOut!.position, playerIn!.position)).toBeLessThanOrEqual(1)
      const lineup = substitution.clubId === home.id
        ? playedLineup(home, autoSelectLineup(home))
        : playedLineup(away, autoSelectLineup(away))
      expect(lineup.substitutes).toContain(substitution.playerInId)
    }
  })

  it('immediately replaces an injured player when a suitable substitute is available', () => {
    const home = clubs[0] as Club
    const away = clubs[1] as Club
    const homeLineup = playedLineup(home, autoSelectLineup(home))
    const awayLineup = playedLineup(away, autoSelectLineup(away))
    const timeline = Array.from({ length: 800 }, (_, index) =>
      createMatchTimeline({
        matchId: `forced-injury-substitution-${index}`,
        homeClub: home,
        awayClub: away,
        homeLineup,
        awayLineup,
        neutralVenue: false,
        allowPenaltyShootout: false,
        seed: index + 1,
      }),
    ).find((candidate) =>
      candidate.finalResult.injuries?.some((injury) => (injury.minute ?? 90) < 55),
    )
    const injury = timeline?.finalResult.injuries?.find(
      (candidate) => (candidate.minute ?? 90) < 55,
    )
    const replacement = timeline?.finalResult.substitutions?.find(
      (substitution) =>
        substitution.clubId === injury?.clubId &&
        substitution.playerOutId === injury.playerId &&
        substitution.minute === injury.minute,
    )

    expect(injury).toBeDefined()
    expect(replacement).toBeDefined()
    const matchLineup = injury?.clubId === home.id ? homeLineup : awayLineup
    expect(matchLineup.substitutes).toContain(replacement?.playerInId)
  })

  it('brings on the reserve goalkeeper for an outfield player after a goalkeeper dismissal', () => {
    const home = clubs[0] as Club
    const away = clubs[1] as Club
    const homeLineup = playedLineup(home, autoSelectLineup(home))
    const awayLineup = playedLineup(away, autoSelectLineup(away))
    const timeline = Array.from({ length: 2500 }, (_, index) =>
      createMatchTimeline({
        matchId: `dismissed-goalkeeper-${index}`,
        homeClub: home,
        awayClub: away,
        homeLineup,
        awayLineup,
        neutralVenue: false,
        allowPenaltyShootout: false,
        seed: index + 1,
      }),
    ).find((candidate) =>
      candidate.finalResult.cards?.some((card) => {
        const club = card.clubId === home.id ? home : away
        return card.card === 'red' && club.squad.find((player) => player.id === card.playerId)?.position === 'GK'
      }),
    )
    const dismissal = timeline?.finalResult.cards?.find((card) => {
      const club = card.clubId === home.id ? home : away
      return card.card === 'red' && club.squad.find((player) => player.id === card.playerId)?.position === 'GK'
    })
    const replacement = timeline?.finalResult.substitutions?.find(
      (substitution) =>
        substitution.clubId === dismissal?.clubId && substitution.minute === dismissal.minute,
    )
    const club = dismissal?.clubId === home.id ? home : away

    expect(dismissal).toBeDefined()
    expect(replacement).toBeDefined()
    expect(club.squad.find((player) => player.id === replacement?.playerOutId)?.position).not.toBe('GK')
    expect(club.squad.find((player) => player.id === replacement?.playerInId)?.position).toBe('GK')
  })

  it('adds an injury with a recovery duration to the commentary', () => {
    const home = clubs[0] as Club
    const away = clubs[1] as Club
    const baseInput = {
      matchId: 'injury-commentary-match',
      homeClub: home,
      awayClub: away,
      homeLineup: playedLineup(home, autoSelectLineup(home)),
      awayLineup: playedLineup(away, autoSelectLineup(away)),
      neutralVenue: false,
      allowPenaltyShootout: false,
    }

    const timeline = Array.from({ length: 500 }, (_, index) =>
      createMatchTimeline({ ...baseInput, seed: index + 1 }),
    ).find((candidate) => candidate.finalResult.injuries?.length)
    const injury = timeline?.finalResult.injuries?.[0]

    expect(injury).toBeDefined()
    expect(injury?.durationMatchdays).toBeGreaterThanOrEqual(1)
    expect(injury?.durationMatchdays).toBeLessThanOrEqual(5)
    expect(
      timeline?.finalResult.commentary?.some(
        (event) => event.minute === injury?.minute && event.text.includes('получил травму'),
      ),
    ).toBe(true)
  })
})
