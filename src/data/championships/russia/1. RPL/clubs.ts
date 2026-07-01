import type { ClubProfile } from '@/data/clubs/types'

import { akhmatProfile } from '@/data/clubDatabase/russia/1. RPL/akhmat/akhmat'
import { akronProfile } from '@/data/clubDatabase/russia/1. RPL/akron/akron'
import { baltikaProfile } from '@/data/clubDatabase/russia/1. RPL/baltika/baltika'
import { cskaProfile } from '@/data/clubDatabase/russia/1. RPL/cska/cska'
import { dinamoMakhachkalaProfile } from '@/data/clubDatabase/russia/1. RPL/dinamo-makhachkala/dinamo-makhachkala'
import { dinamoMoscowProfile } from '@/data/clubDatabase/russia/1. RPL/dinamo-moscow/dinamo-moscow'
import { krasnodarProfile } from '@/data/clubDatabase/russia/1. RPL/krasnodar/krasnodar'
import { kryliaSovetovProfile } from '@/data/clubDatabase/russia/1. RPL/krylia-sovetov/krylia-sovetov'
import { lokomotivProfile } from '@/data/clubDatabase/russia/1. RPL/lokomotiv/lokomotiv'
import { orenburgProfile } from '@/data/clubDatabase/russia/1. RPL/orenburg/orenburg'
import { pariNnProfile } from '@/data/clubDatabase/russia/1. RPL/pari-nn/pari-nn'
import { rostovProfile } from '@/data/clubDatabase/russia/1. RPL/rostov/rostov'
import { rubinProfile } from '@/data/clubDatabase/russia/1. RPL/rubin/rubin'
import { sochiProfile } from '@/data/clubDatabase/russia/1. RPL/sochi/sochi'
import { spartakProfile } from '@/data/clubDatabase/russia/1. RPL/spartak/spartak'
import { zenitProfile } from '@/data/clubDatabase/russia/1. RPL/zenit/zenit'

export const russiaPremierLeagueClubProfiles: ClubProfile[] = [
  zenitProfile,
  krasnodarProfile,
  cskaProfile,
  spartakProfile,
  dinamoMoscowProfile,
  lokomotivProfile,
  rubinProfile,
  rostovProfile,
  akronProfile,
  baltikaProfile,
  kryliaSovetovProfile,
  dinamoMakhachkalaProfile,
  akhmatProfile,
  sochiProfile,
  pariNnProfile,
  orenburgProfile,
]
