import { createClubs } from '@/data/clubConfig'
import { russiaClubConfigs } from '@/data/champs/russia'
import { spainClubConfigs } from '@/data/champs/spain'
import { englandClubConfigs } from '@/data/champs/england'
import { germanyClubConfigs } from '@/data/champs/germany'
import { franceClubConfigs } from '@/data/champs/france'
import { italyClubConfigs } from '@/data/champs/italy'
import type { ChampionshipId, Club } from '@/types/football'
import type { ClubConfig } from '@/data/clubs/types'

export type { ChampionshipId } from '@/types/football'

export interface ChampionshipConfig {
  id: ChampionshipId
  name: string
  description: string
  divisionNames: Record<number, string>
  competitionNames?: Record<string, string>
  clubConfigs: readonly ClubConfig[]
}

export const championships: Record<ChampionshipId, ChampionshipConfig> = {
  russia: {
    id: 'russia',
    name: '\u0420\u043e\u0441\u0441\u0438\u044f',
    description: '\u0420\u043e\u0441\u0441\u0438\u044f, \u0447\u0435\u0442\u044b\u0440\u0435 \u0443\u0440\u043e\u0432\u043d\u044f, 108 \u043a\u043b\u0443\u0431\u043e\u0432.',
    divisionNames: {
      1: '\u041c\u0418\u0420 \u0420\u043e\u0441\u0441\u0438\u0439\u0441\u043a\u0430\u044f \u041f\u0440\u0435\u043c\u044c\u0435\u0440-\u041b\u0438\u0433\u0430',
      2: 'PARI \u041f\u0435\u0440\u0432\u0430\u044f \u043b\u0438\u0433\u0430',
      3: 'LEON \u0412\u0442\u043e\u0440\u0430\u044f \u043b\u0438\u0433\u0430, \u0414\u0438\u0432\u0438\u0437\u0438\u043e\u043d \u0410',
      4: 'LEON \u0412\u0442\u043e\u0440\u0430\u044f \u043b\u0438\u0433\u0430, \u0414\u0438\u0432\u0438\u0437\u0438\u043e\u043d \u0411',
    },
    clubConfigs: russiaClubConfigs,
  },

  spain: {
    id: 'spain',
    name: '\u0418\u0441\u043f\u0430\u043d\u0438\u044f',
    description: '\u0418\u0441\u043f\u0430\u043d\u0438\u044f, \u0434\u0432\u0430 \u0434\u0438\u0432\u0438\u0437\u0438\u043e\u043d\u0430, 42 \u043a\u043b\u0443\u0431\u0430.',
    divisionNames: {
      1: 'La Liga',
      2: 'Segunda Divisi\u00f3n',
    },
    clubConfigs: spainClubConfigs,
  },

  england: {
    id: 'england',
    name: '\u0410\u043d\u0433\u043b\u0438\u044f',
    description: '\u0410\u043d\u0433\u043b\u0438\u044f, \u0447\u0435\u0442\u044b\u0440\u0435 \u0434\u0438\u0432\u0438\u0437\u0438\u043e\u043d\u0430, 88 \u043a\u043b\u0443\u0431\u043e\u0432.',
    divisionNames: {
      1: 'Premier League',
      2: 'EFL Championship',
      3: 'EFL League One',
      4: 'EFL League Two',
    },
    clubConfigs: englandClubConfigs,
  },

  germany: {
    id: 'germany',
    name: '\u0413\u0435\u0440\u043c\u0430\u043d\u0438\u044f',
    description: '\u0413\u0435\u0440\u043c\u0430\u043d\u0438\u044f, \u0434\u0432\u0430 \u0434\u0438\u0432\u0438\u0437\u0438\u043e\u043d\u0430, 40 \u043a\u043b\u0443\u0431\u043e\u0432.',
    divisionNames: {
      1: 'Bundesliga',
      2: '2. Bundesliga',
    },
    clubConfigs: germanyClubConfigs,
  },

  france: {
    id: 'france',
    name: '\u0424\u0440\u0430\u043d\u0446\u0438\u044f',
    description: '\u0424\u0440\u0430\u043d\u0446\u0438\u044f, \u0434\u0432\u0430 \u0434\u0438\u0432\u0438\u0437\u0438\u043e\u043d\u0430, 40 \u043a\u043b\u0443\u0431\u043e\u0432.',
    divisionNames: {
      1: 'Ligue 1',
      2: 'Ligue 2',
    },
    clubConfigs: franceClubConfigs,
  },

  italy: {
    id: 'italy',
    name: '\u0418\u0442\u0430\u043b\u0438\u044f',
    description: '\u0418\u0442\u0430\u043b\u0438\u044f, \u0434\u0432\u0430 \u0434\u0438\u0432\u0438\u0437\u0438\u043e\u043d\u0430, 40 \u043a\u043b\u0443\u0431\u043e\u0432.',
    divisionNames: {
      1: 'Serie A',
      2: 'Serie B',
    },
    clubConfigs: italyClubConfigs,
  },
}

export const getChampionshipClubs = (championshipId: ChampionshipId): Club[] => {
  return createClubs(championships[championshipId].clubConfigs)
}

// Compatibility for domain tests and code that needs the default club set.
export const clubs = getChampionshipClubs('russia')

export const getChampionship = (championshipId: ChampionshipId) => championships[championshipId]
