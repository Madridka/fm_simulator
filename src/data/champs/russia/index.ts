import { RussianClubConfig } from '@/data/clubs/types'
import { russiaPremierLeagueClubConfigs } from '@/data/champs/russia/1. RPL/clubs'
import { russiaFirstLeagueClubConfigs } from '@/data/champs/russia/2. FIRST/clubs'
import { russiaSecondLeagueAGoldClubConfigs } from '@/data/champs/russia/3. LEON A - GOLD/clubs'
import { russiaSecondLeagueASilverClubConfigs } from '@/data/champs/russia/4. LEON A - SILVER/clubs'
import { russiaSecondLeagueBGroup1ClubConfigs } from '@/data/champs/russia/5. LEON B - 1/clubs'
import { russiaSecondLeagueBGroup2ClubConfigs } from '@/data/champs/russia/6. LEON B - 2/clubs'
import { russiaSecondLeagueBGroup3ClubConfigs } from '@/data/champs/russia/7. LEON B - 3/clubs'
import { russiaSecondLeagueBGroup4ClubConfigs } from '@/data/champs/russia/8. LEON B - 4/clubs'

export const russiaClubConfigs: RussianClubConfig[] = [
  ...russiaPremierLeagueClubConfigs,
  ...russiaFirstLeagueClubConfigs,
  ...russiaSecondLeagueAGoldClubConfigs,
  ...russiaSecondLeagueASilverClubConfigs,
  ...russiaSecondLeagueBGroup1ClubConfigs,
  ...russiaSecondLeagueBGroup2ClubConfigs,
  ...russiaSecondLeagueBGroup3ClubConfigs,
  ...russiaSecondLeagueBGroup4ClubConfigs,
]

export const russianDivisions = [
  {
    id: 1,
    leagueId: 'rpl',
    name: 'МИР Российская Премьер-Лига',
    shortName: 'РПЛ',
    level: 1,
  },
  {
    id: 2,
    leagueId: 'first-league',
    name: 'PARI Первая лига',
    shortName: 'Первая лига',
    level: 2,
  },
  {
    id: 3,
    leagueId: 'second-league-a',
    name: 'LEON Вторая лига, Дивизион А',
    shortName: 'Вторая лига А',
    level: 3,
    groups: [
      { id: 'gold', name: 'Группа «Золото»' },
      { id: 'silver', name: 'Группа «Серебро»' },
    ],
  },
  {
    id: 4,
    leagueId: 'second-league-b',
    name: 'LEON Вторая лига, Дивизион Б',
    shortName: 'Вторая лига Б',
    level: 4,
    groups: [
      { id: 'group-1', name: 'Группа 1' },
      { id: 'group-2', name: 'Группа 2' },
      { id: 'group-3', name: 'Группа 3' },
      { id: 'group-4', name: 'Группа 4' },
    ],
  },
] as const
