import { RussianLeagueId } from '@/data/clubs/enums'
import { type ClubProfile } from '@/data/clubs/types'

const leagueId = String(RussianLeagueId.rpl)

export const zenitProfile: ClubProfile = {
  config: {
    id: 'zenit',
    name: 'Зенит',
    shortName: 'ЗЕН',
    city: 'Санкт-Петербург',
    divisionId: 1,
    leagueId,
    rating: 84,
    attackRating: 86,
    midfieldRating: 84,
    defenseRating: 82,
    budget: 100_000_000,
    primaryColor: '#00aeef',
    secondaryColor: '#004c97',
  },
  stadium: {
    name: 'Газпром Арена',
    city: 'Санкт-Петербург',
    capacity: 68_134,
  },
  historicalStats: {
    foundedYear: 1925,
  },
}
