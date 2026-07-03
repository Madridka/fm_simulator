import type { NationalTeamProfile } from '@/data/wc26/types'

import { mexicoProfile } from '@/data/wc26/teams/A/mexico'
import { southAfricaProfile } from '@/data/wc26/teams/A/south-africa'
import { southKoreaProfile } from '@/data/wc26/teams/A/south-korea'
import { czechiaProfile } from '@/data/wc26/teams/A/czechia'
import { canadaProfile } from '@/data/wc26/teams/B/canada'
import { switzerlandProfile } from '@/data/wc26/teams/B/switzerland'
import { qatarProfile } from '@/data/wc26/teams/B/qatar'
import { bosniaAndHerzegovinaProfile } from '@/data/wc26/teams/B/bosnia-and-herzegovina'
import { brazilProfile } from '@/data/wc26/teams/C/brazil'
import { moroccoProfile } from '@/data/wc26/teams/C/morocco'
import { haitiProfile } from '@/data/wc26/teams/C/haiti'
import { scotlandProfile } from '@/data/wc26/teams/C/scotland'
import { usaProfile } from '@/data/wc26/teams/D/usa'
import { paraguayProfile } from '@/data/wc26/teams/D/paraguay'
import { australiaProfile } from '@/data/wc26/teams/D/australia'
import { turkeyProfile } from '@/data/wc26/teams/D/turkey'
import { germanyProfile } from '@/data/wc26/teams/E/germany'
import { ecuadorProfile } from '@/data/wc26/teams/E/ecuador'
import { ivoryCoastProfile } from '@/data/wc26/teams/E/ivory-coast'
import { curacaoProfile } from '@/data/wc26/teams/E/curacao'
import { netherlandsProfile } from '@/data/wc26/teams/F/netherlands'
import { japanProfile } from '@/data/wc26/teams/F/japan'
import { tunisiaProfile } from '@/data/wc26/teams/F/tunisia'
import { swedenProfile } from '@/data/wc26/teams/F/sweden'
import { belgiumProfile } from '@/data/wc26/teams/G/belgium'
import { egyptProfile } from '@/data/wc26/teams/G/egypt'
import { iranProfile } from '@/data/wc26/teams/G/iran'
import { newZealandProfile } from '@/data/wc26/teams/G/new-zealand'
import { spainProfile } from '@/data/wc26/teams/H/spain'
import { uruguayProfile } from '@/data/wc26/teams/H/uruguay'
import { saudiArabiaProfile } from '@/data/wc26/teams/H/saudi-arabia'
import { capeVerdeProfile } from '@/data/wc26/teams/H/cape-verde'
import { franceProfile } from '@/data/wc26/teams/I/france'
import { senegalProfile } from '@/data/wc26/teams/I/senegal'
import { iraqProfile } from '@/data/wc26/teams/I/iraq'
import { norwayProfile } from '@/data/wc26/teams/I/norway'
import { argentinaProfile } from '@/data/wc26/teams/J/argentina'
import { algeriaProfile } from '@/data/wc26/teams/J/algeria'
import { austriaProfile } from '@/data/wc26/teams/J/austria'
import { jordanProfile } from '@/data/wc26/teams/J/jordan'
import { portugalProfile } from '@/data/wc26/teams/K/portugal'
import { colombiaProfile } from '@/data/wc26/teams/K/colombia'
import { uzbekistanProfile } from '@/data/wc26/teams/K/uzbekistan'
import { drCongoProfile } from '@/data/wc26/teams/L/dr-congo'
import { englandProfile } from '@/data/wc26/teams/L/england'
import { croatiaProfile } from '@/data/wc26/teams/K/croatia'
import { ghanaProfile } from '@/data/wc26/teams/L/ghana'
import { panamaProfile } from '@/data/wc26/teams/L/panama'

export const worldCup2026TeamProfiles: NationalTeamProfile[] = [
  mexicoProfile,
  southAfricaProfile,
  southKoreaProfile,
  czechiaProfile,
  canadaProfile,
  switzerlandProfile,
  qatarProfile,
  bosniaAndHerzegovinaProfile,
  brazilProfile,
  moroccoProfile,
  haitiProfile,
  scotlandProfile,
  usaProfile,
  paraguayProfile,
  australiaProfile,
  turkeyProfile,
  germanyProfile,
  ecuadorProfile,
  ivoryCoastProfile,
  curacaoProfile,
  netherlandsProfile,
  japanProfile,
  tunisiaProfile,
  swedenProfile,
  belgiumProfile,
  egyptProfile,
  iranProfile,
  newZealandProfile,
  spainProfile,
  uruguayProfile,
  saudiArabiaProfile,
  capeVerdeProfile,
  franceProfile,
  senegalProfile,
  iraqProfile,
  norwayProfile,
  argentinaProfile,
  algeriaProfile,
  austriaProfile,
  jordanProfile,
  portugalProfile,
  colombiaProfile,
  uzbekistanProfile,
  drCongoProfile,
  englandProfile,
  croatiaProfile,
  ghanaProfile,
  panamaProfile,
]

export const worldCup2026ProfilesById = Object.fromEntries(
  worldCup2026TeamProfiles.map((profile) => [profile.id, profile]),
) as Record<string, NationalTeamProfile>

export const worldCup2026RatingByTeamId = Object.fromEntries(
  worldCup2026TeamProfiles.map((profile) => [profile.id, profile.rating]),
) as Record<string, number>
