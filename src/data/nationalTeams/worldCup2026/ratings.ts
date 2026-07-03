import type { NationalTeamProfile } from '@/data/nationalTeams/worldCup2026/teams'

// РЕАЛИСТИЧНЫЕ РЕЙТИНГИ СБОРНЫХ НА ЧМ-2026 (ОЩУТИМАЯ РАЗНИЦА МЕЖДУ ФАВОРИТАМИ И АУТСАЙДЕРАМИ)
export const worldCup2026TeamProfiles: NationalTeamProfile[] = [
  { id: 'mexico', name: 'Мексика', shortName: 'MEX', fifaCode: 'MEX', groupId: 'A', flagCode: 'MX', rating: 78, attackRating: 77, midfieldRating: 78, defenseRating: 79, primaryColor: '#006847', secondaryColor: '#CE1126' },
  { id: 'south-africa', name: 'ЮАР', shortName: 'RSA', fifaCode: 'RSA', groupId: 'A', flagCode: 'ZA', rating: 72, attackRating: 71, midfieldRating: 72, defenseRating: 73, primaryColor: '#007A4D', secondaryColor: '#FFB612' },
  { id: 'south-korea', name: 'Южная Корея', shortName: 'KOR', fifaCode: 'KOR', groupId: 'A', flagCode: 'KR', rating: 79, attackRating: 78, midfieldRating: 79, defenseRating: 80, primaryColor: '#CD2E3A', secondaryColor: '#0047A0' },
  { id: 'czechia', name: 'Чехия', shortName: 'CZE', fifaCode: 'CZE', groupId: 'A', flagCode: 'CZ', rating: 77, attackRating: 76, midfieldRating: 78, defenseRating: 77, primaryColor: '#11457E', secondaryColor: '#D7141A' },

  { id: 'canada', name: 'Канада', shortName: 'CAN', fifaCode: 'CAN', groupId: 'B', flagCode: 'CA', rating: 76, attackRating: 75, midfieldRating: 76, defenseRating: 77, primaryColor: '#FF0000', secondaryColor: '#FFFFFF' },
  { id: 'switzerland', name: 'Швейцария', shortName: 'SUI', fifaCode: 'SUI', groupId: 'B', flagCode: 'CH', rating: 80, attackRating: 79, midfieldRating: 81, defenseRating: 80, primaryColor: '#DA291C', secondaryColor: '#FFFFFF' },
  { id: 'qatar', name: 'Катар', shortName: 'QAT', fifaCode: 'QAT', groupId: 'B', flagCode: 'QA', rating: 71, attackRating: 70, midfieldRating: 71, defenseRating: 72, primaryColor: '#8A1538', secondaryColor: '#FFFFFF' },
  { id: 'bosnia-and-herzegovina', name: 'Босния и Герцеговина', shortName: 'BIH', fifaCode: 'BIH', groupId: 'B', flagCode: 'BA', rating: 74, attackRating: 74, midfieldRating: 73, defenseRating: 75, primaryColor: '#002395', secondaryColor: '#FECB00' },

  { id: 'brazil', name: 'Бразилия', shortName: 'BRA', fifaCode: 'BRA', groupId: 'C', flagCode: 'BR', rating: 88, attackRating: 89, midfieldRating: 87, defenseRating: 87, primaryColor: '#FFDF00', secondaryColor: '#009C3B' },
  { id: 'morocco', name: 'Марокко', shortName: 'MAR', fifaCode: 'MAR', groupId: 'C', flagCode: 'MA', rating: 82, attackRating: 81, midfieldRating: 82, defenseRating: 83, primaryColor: '#C1272D', secondaryColor: '#006233' },
  { id: 'haiti', name: 'Гаити', shortName: 'HAI', fifaCode: 'HAI', groupId: 'C', flagCode: 'HT', rating: 62, attackRating: 61, midfieldRating: 62, defenseRating: 63, primaryColor: '#00209F', secondaryColor: '#D21034' },
  { id: 'scotland', name: 'Шотландия', shortName: 'SCO', fifaCode: 'SCO', groupId: 'C', flagCode: 'GB', rating: 75, attackRating: 74, midfieldRating: 75, defenseRating: 76, primaryColor: '#005EB8', secondaryColor: '#FFFFFF' },

  { id: 'usa', name: 'США', shortName: 'USA', fifaCode: 'USA', groupId: 'D', flagCode: 'US', rating: 81, attackRating: 80, midfieldRating: 81, defenseRating: 82, primaryColor: '#3C3B6E', secondaryColor: '#B22234' },
  { id: 'paraguay', name: 'Парагвай', shortName: 'PAR', fifaCode: 'PAR', groupId: 'D', flagCode: 'PY', rating: 73, attackRating: 72, midfieldRating: 73, defenseRating: 74, primaryColor: '#D52B1E', secondaryColor: '#0038A8' },
  { id: 'australia', name: 'Австралия', shortName: 'AUS', fifaCode: 'AUS', groupId: 'D', flagCode: 'AU', rating: 76, attackRating: 75, midfieldRating: 76, defenseRating: 77, primaryColor: '#00008B', secondaryColor: '#FFCD00' },
  { id: 'turkey', name: 'Турция', shortName: 'TUR', fifaCode: 'TUR', groupId: 'D', flagCode: 'TR', rating: 78, attackRating: 78, midfieldRating: 77, defenseRating: 79, primaryColor: '#E30A17', secondaryColor: '#FFFFFF' },

  { id: 'germany', name: 'Германия', shortName: 'GER', fifaCode: 'GER', groupId: 'E', flagCode: 'DE', rating: 86, attackRating: 85, midfieldRating: 86, defenseRating: 87, primaryColor: '#000000', secondaryColor: '#DD0000' },
  { id: 'ecuador', name: 'Эквадор', shortName: 'ECU', fifaCode: 'ECU', groupId: 'E', flagCode: 'EC', rating: 76, attackRating: 76, midfieldRating: 75, defenseRating: 77, primaryColor: '#FFD100', secondaryColor: '#034EA2' },
  { id: 'ivory-coast', name: "Кот-д'Ивуар", shortName: 'CIV', fifaCode: 'CIV', groupId: 'E', flagCode: 'CI', rating: 79, attackRating: 80, midfieldRating: 78, defenseRating: 79, primaryColor: '#F77F00', secondaryColor: '#009E60' },
  { id: 'curacao', name: 'Кюрасао', shortName: 'CUW', fifaCode: 'CUW', groupId: 'E', flagCode: 'CW', rating: 64, attackRating: 63, midfieldRating: 64, defenseRating: 65, primaryColor: '#002B7F', secondaryColor: '#F9E814' },

  { id: 'netherlands', name: 'Нидерланды', shortName: 'NED', fifaCode: 'NED', groupId: 'F', flagCode: 'NL', rating: 85, attackRating: 86, midfieldRating: 84, defenseRating: 85, primaryColor: '#FF6600', secondaryColor: '#21468B' },
  { id: 'japan', name: 'Япония', shortName: 'JPN', fifaCode: 'JPN', groupId: 'F', flagCode: 'JP', rating: 81, attackRating: 80, midfieldRating: 82, defenseRating: 81, primaryColor: '#BC002D', secondaryColor: '#FFFFFF' },
  { id: 'tunisia', name: 'Тунис', shortName: 'TUN', fifaCode: 'TUN', groupId: 'F', flagCode: 'TN', rating: 74, attackRating: 73, midfieldRating: 74, defenseRating: 75, primaryColor: '#E70013', secondaryColor: '#FFFFFF' },
  { id: 'sweden', name: 'Швеция', shortName: 'SWE', fifaCode: 'SWE', groupId: 'F', flagCode: 'SE', rating: 77, attackRating: 76, midfieldRating: 77, defenseRating: 78, primaryColor: '#006AA7', secondaryColor: '#FECC00' },

  { id: 'belgium', name: 'Бельгия', shortName: 'BEL', fifaCode: 'BEL', groupId: 'G', flagCode: 'BE', rating: 84, attackRating: 85, midfieldRating: 83, defenseRating: 84, primaryColor: '#ED2939', secondaryColor: '#FDDA24' },
  { id: 'egypt', name: 'Египет', shortName: 'EGY', fifaCode: 'EGY', groupId: 'G', flagCode: 'EG', rating: 77, attackRating: 77, midfieldRating: 76, defenseRating: 78, primaryColor: '#CE1126', secondaryColor: '#FFFFFF' },
  { id: 'iran', name: 'Иран', shortName: 'IRN', fifaCode: 'IRN', groupId: 'G', flagCode: 'IR', rating: 76, attackRating: 75, midfieldRating: 76, defenseRating: 77, primaryColor: '#239F40', secondaryColor: '#FFFFFF' },
  { id: 'new-zealand', name: 'Новая Зеландия', shortName: 'NZL', fifaCode: 'NZL', groupId: 'G', flagCode: 'NZ', rating: 68, attackRating: 67, midfieldRating: 68, defenseRating: 69, primaryColor: '#000000', secondaryColor: '#FFFFFF' },

  { id: 'spain', name: 'Испания', shortName: 'ESP', fifaCode: 'ESP', groupId: 'H', flagCode: 'ES', rating: 89, attackRating: 88, midfieldRating: 90, defenseRating: 88, primaryColor: '#AA151B', secondaryColor: '#F1BF00' },
  { id: 'uruguay', name: 'Уругвай', shortName: 'URU', fifaCode: 'URU', groupId: 'H', flagCode: 'UY', rating: 83, attackRating: 82, midfieldRating: 83, defenseRating: 84, primaryColor: '#0038A8', secondaryColor: '#FFFFFF' },
  { id: 'saudi-arabia', name: 'Саудовская Аравия', shortName: 'KSA', fifaCode: 'KSA', groupId: 'H', flagCode: 'SA', rating: 73, attackRating: 72, midfieldRating: 73, defenseRating: 74, primaryColor: '#006C35', secondaryColor: '#FFFFFF' },
  { id: 'cape-verde', name: 'Кабо-Верде', shortName: 'CPV', fifaCode: 'CPV', groupId: 'H', flagCode: 'CV', rating: 70, attackRating: 69, midfieldRating: 70, defenseRating: 71, primaryColor: '#003893', secondaryColor: '#FFFFFF' },

  { id: 'france', name: 'Франция', shortName: 'FRA', fifaCode: 'FRA', groupId: 'I', flagCode: 'FR', rating: 90, attackRating: 90, midfieldRating: 89, defenseRating: 90, primaryColor: '#002395', secondaryColor: '#ED2939' },
  { id: 'senegal', name: 'Сенегал', shortName: 'SEN', fifaCode: 'SEN', groupId: 'I', flagCode: 'SN', rating: 80, attackRating: 80, midfieldRating: 79, defenseRating: 81, primaryColor: '#00853F', secondaryColor: '#FDEF42' },
  { id: 'iraq', name: 'Ирак', shortName: 'IRQ', fifaCode: 'IRQ', groupId: 'I', flagCode: 'IQ', rating: 69, attackRating: 68, midfieldRating: 69, defenseRating: 70, primaryColor: '#CE1126', secondaryColor: '#FFFFFF' },
  { id: 'norway', name: 'Норвегия', shortName: 'NOR', fifaCode: 'NOR', groupId: 'I', flagCode: 'NO', rating: 79, attackRating: 80, midfieldRating: 78, defenseRating: 79, primaryColor: '#BA0C2F', secondaryColor: '#00205B' },

  { id: 'argentina', name: 'Аргентина', shortName: 'ARG', fifaCode: 'ARG', groupId: 'J', flagCode: 'AR', rating: 91, attackRating: 91, midfieldRating: 90, defenseRating: 90, primaryColor: '#74ACDF', secondaryColor: '#FFFFFF' },
  { id: 'algeria', name: 'Алжир', shortName: 'ALG', fifaCode: 'ALG', groupId: 'J', flagCode: 'DZ', rating: 76, attackRating: 76, midfieldRating: 75, defenseRating: 77, primaryColor: '#006233', secondaryColor: '#FFFFFF' },
  { id: 'austria', name: 'Австрия', shortName: 'AUT', fifaCode: 'AUT', groupId: 'J', flagCode: 'AT', rating: 78, attackRating: 77, midfieldRating: 78, defenseRating: 79, primaryColor: '#ED2939', secondaryColor: '#FFFFFF' },
  { id: 'jordan', name: 'Иордания', shortName: 'JOR', fifaCode: 'JOR', groupId: 'J', flagCode: 'JO', rating: 70, attackRating: 69, midfieldRating: 70, defenseRating: 71, primaryColor: '#007A3D', secondaryColor: '#000000' },

  { id: 'portugal', name: 'Португалия', shortName: 'POR', fifaCode: 'POR', groupId: 'K', flagCode: 'PT', rating: 87, attackRating: 87, midfieldRating: 86, defenseRating: 87, primaryColor: '#006600', secondaryColor: '#FF0000' },
  { id: 'colombia', name: 'Колумбия', shortName: 'COL', fifaCode: 'COL', groupId: 'K', flagCode: 'CO', rating: 82, attackRating: 82, midfieldRating: 81, defenseRating: 83, primaryColor: '#FCD116', secondaryColor: '#003893' },
  { id: 'uzbekistan', name: 'Узбекистан', shortName: 'UZB', fifaCode: 'UZB', groupId: 'K', flagCode: 'UZ', rating: 72, attackRating: 71, midfieldRating: 72, defenseRating: 73, primaryColor: '#1EB53A', secondaryColor: '#0099B5' },
  { id: 'dr-congo', name: 'ДР Конго', shortName: 'COD', fifaCode: 'COD', groupId: 'K', flagCode: 'CD', rating: 74, attackRating: 74, midfieldRating: 73, defenseRating: 75, primaryColor: '#007FFF', secondaryColor: '#F7D618' },

  { id: 'england', name: 'Англия', shortName: 'ENG', fifaCode: 'ENG', groupId: 'L', flagCode: 'GB', rating: 88, attackRating: 88, midfieldRating: 87, defenseRating: 88, primaryColor: '#FFFFFF', secondaryColor: '#CE1124' },
  { id: 'croatia', name: 'Хорватия', shortName: 'CRO', fifaCode: 'CRO', groupId: 'L', flagCode: 'HR', rating: 84, attackRating: 83, midfieldRating: 85, defenseRating: 84, primaryColor: '#FF0000', secondaryColor: '#FFFFFF' },
  { id: 'ghana', name: 'Гана', shortName: 'GHA', fifaCode: 'GHA', groupId: 'L', flagCode: 'GH', rating: 75, attackRating: 75, midfieldRating: 74, defenseRating: 76, primaryColor: '#006B3F', secondaryColor: '#FCD116' },
  { id: 'panama', name: 'Панама', shortName: 'PAN', fifaCode: 'PAN', groupId: 'L', flagCode: 'PA', rating: 71, attackRating: 70, midfieldRating: 71, defenseRating: 72, primaryColor: '#DA121A', secondaryColor: '#005293' },
]

export const worldCup2026ProfilesById = Object.fromEntries(
  worldCup2026TeamProfiles.map((profile) => [profile.id, profile]),
) as Record<string, NationalTeamProfile>

export const worldCup2026RatingByTeamId = Object.fromEntries(
  worldCup2026TeamProfiles.map((profile) => [profile.id, profile.rating]),
) as Record<string, number>
