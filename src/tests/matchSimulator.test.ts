import { describe, expect, it } from 'vitest'
import { simulateMatch } from '@/domain/match/matchSimulator'
import { autoSelectLineup, getFormationSlots } from '@/domain/season/squadSelectionService'
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
})
