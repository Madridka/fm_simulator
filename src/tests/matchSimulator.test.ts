import { describe, expect, it } from 'vitest'
import { createMatchTimeline, simulateMatch } from '@/domain/match/matchSimulator'
import {
  autoSelectLineup,
  formations,
  getFormationSlots,
  getPositionFit,
} from '@/domain/season/squadSelectionService'
import { clubs } from '@/data/clubs'
import type { Club, ClubLineup, PlayedLineup } from '@/types/football'

const playedLineup = (club: Club, lineup: ClubLineup): PlayedLineup => ({
  formation: lineup.formation,
  tacticalStyle: lineup.tacticalStyle,
  starters: getFormationSlots(lineup.formation)
    .map((slot) => lineup.starters[slot.id])
    .filter((playerId): playerId is string => typeof playerId === 'string'),
})

describe('matchSimulator', () => {
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
    }
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
