import type { ClubProfile } from '@/data/clubs/types'

import { alavesProfile } from '@/data/clubDatabase/spain/1. LaLiga/alaves/alaves'
import { athleticBilbaoProfile } from '@/data/clubDatabase/spain/1. LaLiga/athletic-bilbao/athletic-bilbao'
import { atleticoMadridProfile } from '@/data/clubDatabase/spain/1. LaLiga/atletico-madrid/atletico-madrid'
import { barcelonaProfile } from '@/data/clubDatabase/spain/1. LaLiga/barcelona/barcelona'
import { celtaVigoProfile } from '@/data/clubDatabase/spain/1. LaLiga/celta-vigo/celta-vigo'
import { elcheProfile } from '@/data/clubDatabase/spain/1. LaLiga/elche/elche'
import { espanyolProfile } from '@/data/clubDatabase/spain/1. LaLiga/espanyol/espanyol'
import { getafeProfile } from '@/data/clubDatabase/spain/1. LaLiga/getafe/getafe'
import { gironaProfile } from '@/data/clubDatabase/spain/1. LaLiga/girona/girona'
import { levanteProfile } from '@/data/clubDatabase/spain/1. LaLiga/levante/levante'
import { mallorcaProfile } from '@/data/clubDatabase/spain/1. LaLiga/mallorca/mallorca'
import { osasunaProfile } from '@/data/clubDatabase/spain/1. LaLiga/osasuna/osasuna'
import { rayoVallecanoProfile } from '@/data/clubDatabase/spain/1. LaLiga/rayo-vallecano/rayo-vallecano'
import { realBetisProfile } from '@/data/clubDatabase/spain/1. LaLiga/real-betis/real-betis'
import { realMadridProfile } from '@/data/clubDatabase/spain/1. LaLiga/real-madrid/real-madrid'
import { realOviedoProfile } from '@/data/clubDatabase/spain/1. LaLiga/real-oviedo/real-oviedo'
import { realSociedadProfile } from '@/data/clubDatabase/spain/1. LaLiga/real-sociedad/real-sociedad'
import { sevillaProfile } from '@/data/clubDatabase/spain/1. LaLiga/sevilla/sevilla'
import { valenciaProfile } from '@/data/clubDatabase/spain/1. LaLiga/valencia/valencia'
import { villarrealProfile } from '@/data/clubDatabase/spain/1. LaLiga/villarreal/villarreal'

export const spainDivision1ClubProfiles: ClubProfile[] = [
  realMadridProfile,
  barcelonaProfile,
  atleticoMadridProfile,
  athleticBilbaoProfile,
  villarrealProfile,
  realBetisProfile,
  realSociedadProfile,
  celtaVigoProfile,
  rayoVallecanoProfile,
  osasunaProfile,
  valenciaProfile,
  gironaProfile,
  mallorcaProfile,
  getafeProfile,
  sevillaProfile,
  espanyolProfile,
  alavesProfile,
  levanteProfile,
  elcheProfile,
  realOviedoProfile,
]
