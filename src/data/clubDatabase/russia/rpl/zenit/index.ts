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
    leagueId: leagueId,
    rating: 88,
    attackRating: 89,
    midfieldRating: 88,
    defenseRating: 89,
    budget: 120_000_000,
    primaryColor: '#1e9bd7',
    secondaryColor: '#ffffff',
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
