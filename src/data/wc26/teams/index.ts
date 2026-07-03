import type { NationalTeamProfile } from '@/data/wc26/types'

import { mexicoProfile } from '@/data/nationalTeams/worldCup2026/wc-26/A/mexico'
import { southAfricaProfile } from '@/data/nationalTeams/worldCup2026/wc-26/A/south-africa'
import { southKoreaProfile } from '@/data/nationalTeams/worldCup2026/wc-26/A/south-korea'
import { czechiaProfile } from '@/data/nationalTeams/worldCup2026/wc-26/A/czechia'
import { canadaProfile } from '@/data/nationalTeams/worldCup2026/wc-26/B/canada'
import { switzerlandProfile } from '@/data/nationalTeams/worldCup2026/wc-26/B/switzerland'
import { qatarProfile } from '@/data/nationalTeams/worldCup2026/wc-26/B/qatar'
import { bosniaAndHerzegovinaProfile } from '@/data/nationalTeams/worldCup2026/wc-26/B/bosnia-and-herzegovina'
import { brazilProfile } from '@/data/nationalTeams/worldCup2026/wc-26/C/brazil'
import { moroccoProfile } from '@/data/nationalTeams/worldCup2026/wc-26/C/morocco'
import { haitiProfile } from '@/data/nationalTeams/worldCup2026/wc-26/C/haiti'
import { scotlandProfile } from '@/data/nationalTeams/worldCup2026/wc-26/C/scotland'
import { usaProfile } from '@/data/nationalTeams/worldCup2026/wc-26/D/usa'
import { paraguayProfile } from '@/data/nationalTeams/worldCup2026/wc-26/D/paraguay'
import { australiaProfile } from '@/data/nationalTeams/worldCup2026/wc-26/D/australia'
import { turkeyProfile } from '@/data/nationalTeams/worldCup2026/wc-26/D/turkey'
import { germanyProfile } from '@/data/nationalTeams/worldCup2026/wc-26/E/germany'
import { ecuadorProfile } from '@/data/nationalTeams/worldCup2026/wc-26/E/ecuador'
import { ivoryCoastProfile } from '@/data/nationalTeams/worldCup2026/wc-26/E/ivory-coast'
import { curacaoProfile } from '@/data/nationalTeams/worldCup2026/wc-26/E/curacao'
import { netherlandsProfile } from '@/data/nationalTeams/worldCup2026/wc-26/F/netherlands'
import { japanProfile } from '@/data/nationalTeams/worldCup2026/wc-26/F/japan'
import { tunisiaProfile } from '@/data/nationalTeams/worldCup2026/wc-26/F/tunisia'
import { swedenProfile } from '@/data/nationalTeams/worldCup2026/wc-26/F/sweden'
import { belgiumProfile } from '@/data/nationalTeams/worldCup2026/wc-26/G/belgium'
import { egyptProfile } from '@/data/nationalTeams/worldCup2026/wc-26/G/egypt'
import { iranProfile } from '@/data/nationalTeams/worldCup2026/wc-26/G/iran'
import { newZealandProfile } from '@/data/nationalTeams/worldCup2026/wc-26/G/new-zealand'
import { spainProfile } from '@/data/nationalTeams/worldCup2026/wc-26/H/spain'
import { uruguayProfile } from '@/data/nationalTeams/worldCup2026/wc-26/H/uruguay'
import { saudiArabiaProfile } from '@/data/nationalTeams/worldCup2026/wc-26/H/saudi-arabia'
import { capeVerdeProfile } from '@/data/nationalTeams/worldCup2026/wc-26/H/cape-verde'
import { franceProfile } from '@/data/nationalTeams/worldCup2026/wc-26/I/france'
import { senegalProfile } from '@/data/nationalTeams/worldCup2026/wc-26/I/senegal'
import { iraqProfile } from '@/data/nationalTeams/worldCup2026/wc-26/I/iraq'
import { norwayProfile } from '@/data/nationalTeams/worldCup2026/wc-26/I/norway'
import { argentinaProfile } from '@/data/nationalTeams/worldCup2026/wc-26/J/argentina'
import { algeriaProfile } from '@/data/nationalTeams/worldCup2026/wc-26/J/algeria'
import { austriaProfile } from '@/data/nationalTeams/worldCup2026/wc-26/J/austria'
import { jordanProfile } from '@/data/nationalTeams/worldCup2026/wc-26/J/jordan'
import { portugalProfile } from '@/data/nationalTeams/worldCup2026/wc-26/K/portugal'
import { colombiaProfile } from '@/data/nationalTeams/worldCup2026/wc-26/K/colombia'
import { uzbekistanProfile } from '@/data/nationalTeams/worldCup2026/wc-26/K/uzbekistan'
import { drCongoProfile } from '@/data/nationalTeams/worldCup2026/wc-26/L/dr-congo'
import { englandProfile } from '@/data/nationalTeams/worldCup2026/wc-26/L/england'
import { croatiaProfile } from '@/data/nationalTeams/worldCup2026/wc-26/K/croatia'
import { ghanaProfile } from '@/data/nationalTeams/worldCup2026/wc-26/L/ghana'
import { panamaProfile } from '@/data/nationalTeams/worldCup2026/wc-26/L/panama'

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
