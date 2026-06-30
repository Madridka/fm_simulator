import type { ClubProfile } from '@/data/clubs/types'
import { russiaPremierLeagueClubProfiles } from '@/data/championships/russia/1. RPL/clubs'
import { russiaFirstLeagueClubProfiles } from '@/data/championships/russia/2. FIRST/clubs'
import { russiaSecondLeagueAGoldClubProfiles } from '@/data/championships/russia/3. LEON A - GOLD/clubs'
import { russiaSecondLeagueASilverClubProfiles } from '@/data/championships/russia/4. LEON A - SILVER/clubs'
import { russiaSecondLeagueBGroup1ClubProfiles } from '@/data/championships/russia/5. LEON B - 1/clubs'
import { russiaSecondLeagueBGroup2ClubProfiles } from '@/data/championships/russia/6. LEON B - 2/clubs'
import { russiaSecondLeagueBGroup3ClubProfiles } from '@/data/championships/russia/7. LEON B - 3/clubs'
import { russiaSecondLeagueBGroup4ClubProfiles } from '@/data/championships/russia/8. LEON B - 4/clubs'
import { t } from '@/plugins/i18n/i18n'

export const russiaClubConfigs: ClubProfile[] = [
  ...russiaPremierLeagueClubProfiles,
  ...russiaFirstLeagueClubProfiles,
  ...russiaSecondLeagueAGoldClubProfiles,
  ...russiaSecondLeagueASilverClubProfiles,
  ...russiaSecondLeagueBGroup1ClubProfiles,
  ...russiaSecondLeagueBGroup2ClubProfiles,
  ...russiaSecondLeagueBGroup3ClubProfiles,
  ...russiaSecondLeagueBGroup4ClubProfiles,
]

export const russianDivisions = [
  {
    id: 1,
    leagueId: 'rpl',
    name: t('championships.russia.divisionNames.1'),
    shortName: t('championships.russia.divisionShortNames.1'),
    level: 1,
  },
  {
    id: 2,
    leagueId: 'first-league',
    name: t('championships.russia.divisionNames.2'),
    shortName: t('championships.russia.divisionShortNames.2'),
    level: 2,
  },
  {
    id: 3,
    leagueId: 'second-league-a',
    name: t('championships.russia.divisionNames.3'),
    shortName: t('championships.russia.divisionShortNames.3'),
    level: 3,
    groups: [
      { id: 'gold', name: t('championships.russia.groupNames.gold') },
      { id: 'silver', name: t('championships.russia.groupNames.silver') },
    ],
  },
  {
    id: 4,
    leagueId: 'second-league-b',
    name: t('championships.russia.divisionNames.4'),
    shortName: t('championships.russia.divisionShortNames.4'),
    level: 4,
    groups: [
      { id: 'group-1', name: t('championships.russia.groupNames.group-1') },
      { id: 'group-2', name: t('championships.russia.groupNames.group-2') },
      { id: 'group-3', name: t('championships.russia.groupNames.group-3') },
      { id: 'group-4', name: t('championships.russia.groupNames.group-4') },
    ],
  },
] as const
