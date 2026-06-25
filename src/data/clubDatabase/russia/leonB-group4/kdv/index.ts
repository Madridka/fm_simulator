import { RussianLeagueGroupId, RussianLeagueId } from '@/data/clubs/enums'
import { type ClubProfile } from '@/data/clubs/types'

const leagueId = String(RussianLeagueId['second-league-b'])
const groupId = String(RussianLeagueGroupId['group-4'])

export const kdvProfile: ClubProfile = {
  config: {
    id: 'kdv',
    name: 'КДВ',
    shortName: 'КДВ',
    city: 'Томск',
    divisionId: 4,
    leagueId: leagueId,
    groupId: groupId,
    rating: 55,
    attackRating: 55,
    midfieldRating: 55,
    defenseRating: 55,
    budget: 2_895_000,
    primaryColor: '#f4c300',
    secondaryColor: '#111111',
  },
  stadium: {
    name: 'Темп',
    city: 'Томск',
    capacity: 3_056,
  },
  historicalStats: {
    foundedYear: 2025,
  },
}
