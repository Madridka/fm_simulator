import { SpainLeagueId } from '@/data/clubs/enums'
import { type ClubProfile } from '@/data/clubs/types'

const leagueId = String(SpainLeagueId['La Liga'])

export const realMadridProfile: ClubProfile = {
  config: {
    id: 'real-madrid',
    name: 'Реал Мадрид',
    shortName: 'РМА',
    city: 'Мадрид',
    divisionId: 1,
    leagueId: leagueId,
    rating: 93,
    attackRating: 94,
    midfieldRating: 93,
    defenseRating: 91,
    budget: 200_000_000,
    primaryColor: '#ffffff',
    secondaryColor: '#febd11',
  },
  stadium: {
    name: 'Сантьяго Бернабеу',
    city: 'Мадрид',
    capacity: 83_186,
  },
  historicalStats: {
    foundedYear: 1902,
  },
}
