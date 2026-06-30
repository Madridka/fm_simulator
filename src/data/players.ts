import type { Player, PlayerPosition } from '@/types/football'
import { clamp, createSeededRandom } from '@/utils/random'

interface RealPlayerName {
  firstName: string
  lastName: string
}

type PlayerOverride = Partial<Omit<Player, 'id'>>

const playerOverrides: Record<string, PlayerOverride> = {
  // Пример точечной правки: 'zenit-p1': { rating: 90, potential: 94, fitness: 100 }
}

const realPlayerNames: RealPlayerName[] = [
  { firstName: 'Lionel', lastName: 'Messi' },
  { firstName: 'Cristiano', lastName: 'Ronaldo' },
  { firstName: 'Kylian', lastName: 'Mbappe' },
  { firstName: 'Erling', lastName: 'Haaland' },
  { firstName: 'Kevin', lastName: 'De Bruyne' },
  { firstName: 'Luka', lastName: 'Modric' },
  { firstName: 'Toni', lastName: 'Kroos' },
  { firstName: 'Jude', lastName: 'Bellingham' },
  { firstName: 'Vinicius', lastName: 'Junior' },
  { firstName: 'Mohamed', lastName: 'Salah' },
  { firstName: 'Sadio', lastName: 'Mane' },
  { firstName: 'Robert', lastName: 'Lewandowski' },
  { firstName: 'Harry', lastName: 'Kane' },
  { firstName: 'Neymar', lastName: 'Junior' },
  { firstName: 'Antoine', lastName: 'Griezmann' },
  { firstName: 'Paulo', lastName: 'Dybala' },
  { firstName: 'Bruno', lastName: 'Fernandes' },
  { firstName: 'Bernardo', lastName: 'Silva' },
  { firstName: 'Rodri', lastName: 'Hernandez' },
  { firstName: 'Pedri', lastName: 'Gonzalez' },
  { firstName: 'Gavi', lastName: 'Paez' },
  { firstName: 'Frenkie', lastName: 'De Jong' },
  { firstName: 'Martin', lastName: 'Odegaard' },
  { firstName: 'Declan', lastName: 'Rice' },
  { firstName: 'Bukayo', lastName: 'Saka' },
  { firstName: 'Phil', lastName: 'Foden' },
  { firstName: 'Jack', lastName: 'Grealish' },
  { firstName: 'Marcus', lastName: 'Rashford' },
  { firstName: 'Jamal', lastName: 'Musiala' },
  { firstName: 'Florian', lastName: 'Wirtz' },
  { firstName: 'Joshua', lastName: 'Kimmich' },
  { firstName: 'Thomas', lastName: 'Muller' },
  { firstName: 'Leroy', lastName: 'Sane' },
  { firstName: 'Ilkay', lastName: 'Gundogan' },
  { firstName: 'Manuel', lastName: 'Neuer' },
  { firstName: 'Marc-Andre', lastName: 'Ter Stegen' },
  { firstName: 'Thibaut', lastName: 'Courtois' },
  { firstName: 'Alisson', lastName: 'Becker' },
  { firstName: 'Ederson', lastName: 'Moraes' },
  { firstName: 'Gianluigi', lastName: 'Donnarumma' },
  { firstName: 'Virgil', lastName: 'Van Dijk' },
  { firstName: 'Ruben', lastName: 'Dias' },
  { firstName: 'Marquinhos', lastName: 'Correa' },
  { firstName: 'Eder', lastName: 'Militao' },
  { firstName: 'Antonio', lastName: 'Rudiger' },
  { firstName: 'David', lastName: 'Alaba' },
  { firstName: 'Achraf', lastName: 'Hakimi' },
  { firstName: 'Theo', lastName: 'Hernandez' },
  { firstName: 'Trent', lastName: 'Alexander-Arnold' },
  { firstName: 'Andrew', lastName: 'Robertson' },
  { firstName: 'Joao', lastName: 'Cancelo' },
  { firstName: 'Kyle', lastName: 'Walker' },
  { firstName: 'Rafael', lastName: 'Leao' },
  { firstName: 'Victor', lastName: 'Osimhen' },
  { firstName: 'Lautaro', lastName: 'Martinez' },
  { firstName: 'Julian', lastName: 'Alvarez' },
  { firstName: 'Romelu', lastName: 'Lukaku' },
  { firstName: 'Son', lastName: 'Heung-min' },
  { firstName: 'Luis', lastName: 'Diaz' },
  { firstName: 'Darwin', lastName: 'Nunez' },
  { firstName: 'Federico', lastName: 'Valverde' },
  { firstName: 'Aurelien', lastName: 'Tchouameni' },
  { firstName: 'Eduardo', lastName: 'Camavinga' },
  { firstName: 'Enzo', lastName: 'Fernandez' },
  { firstName: 'Alexis', lastName: 'Mac Allister' },
  { firstName: 'Angel', lastName: 'Di Maria' },
  { firstName: 'Lisandro', lastName: 'Martinez' },
  { firstName: 'Emiliano', lastName: 'Martinez' },
  { firstName: 'Casemiro', lastName: 'Santos' },
  { firstName: 'Richarlison', lastName: 'Andrade' },
  { firstName: 'Raphinha', lastName: 'Dias' },
  { firstName: 'Gabriel', lastName: 'Jesus' },
  { firstName: 'Gabriel', lastName: 'Martinelli' },
  { firstName: 'Gabriel', lastName: 'Magalhaes' },
  { firstName: 'William', lastName: 'Saliba' },
  { firstName: 'Olivier', lastName: 'Giroud' },
  { firstName: 'Kingsley', lastName: 'Coman' },
  { firstName: 'Mike', lastName: 'Maignan' },
  { firstName: 'Adrien', lastName: 'Rabiot' },
  { firstName: 'Ousmane', lastName: 'Dembele' },
  { firstName: 'Khvicha', lastName: 'Kvaratskhelia' },
  { firstName: 'Giorgi', lastName: 'Mamardashvili' },
  { firstName: 'Hakan', lastName: 'Calhanoglu' },
  { firstName: 'Nicolo', lastName: 'Barella' },
  { firstName: 'Federico', lastName: 'Chiesa' },
  { firstName: 'Alessandro', lastName: 'Bastoni' },
  { firstName: 'Dusan', lastName: 'Vlahovic' },
  { firstName: 'Sergej', lastName: 'Milinkovic-Savic' },
  { firstName: 'Jan', lastName: 'Oblak' },
  { firstName: 'Yann', lastName: 'Sommer' },
  { firstName: 'Granit', lastName: 'Xhaka' },
  { firstName: 'Xherdan', lastName: 'Shaqiri' },
  { firstName: 'Christian', lastName: 'Pulisic' },
  { firstName: 'Weston', lastName: 'McKennie' },
  { firstName: 'Sergio', lastName: 'Busquets' },
  { firstName: 'Sergio', lastName: 'Ramos' },
  { firstName: 'Gerard', lastName: 'Pique' },
  { firstName: 'Cesc', lastName: 'Fabregas' },
  { firstName: 'Andres', lastName: 'Iniesta' },
  { firstName: 'David', lastName: 'Silva' },
  { firstName: 'Iker', lastName: 'Casillas' },
  { firstName: 'Fernando', lastName: 'Torres' },
  { firstName: 'Zlatan', lastName: 'Ibrahimovic' },
  { firstName: 'Edinson', lastName: 'Cavani' },
  { firstName: 'Luis', lastName: 'Suarez' },
  { firstName: 'Diego', lastName: 'Godin' },
  { firstName: 'Keylor', lastName: 'Navas' },
  { firstName: 'James', lastName: 'Rodriguez' },
  { firstName: 'Radamel', lastName: 'Falcao' },
  { firstName: 'Shinji', lastName: 'Kagawa' },
  { firstName: 'Takumi', lastName: 'Minamino' },
  { firstName: 'Takehiro', lastName: 'Tomiyasu' },
  { firstName: 'Kaoru', lastName: 'Mitoma' },
  { firstName: 'Hirving', lastName: 'Lozano' },
  { firstName: 'Raul', lastName: 'Jimenez' },
  { firstName: 'Alphonso', lastName: 'Davies' },
  { firstName: 'Jonathan', lastName: 'David' },
  { firstName: 'Бухающий', lastName: 'Фонден' },
  { firstName: 'Сергей', lastName: 'Гей' },
]

const squadPositions: PlayerPosition[] = [
  'GK',
  'GK',
  'GK',
  'LB',
  'LB',
  'CB',
  'CB',
  'CB',
  'CB',
  'RB',
  'RB',
  'CDM',
  'CDM',
  'CM',
  'CM',
  'CM',
  'CAM',
  'LW',
  'LW',
  'RW',
  'ST',
  'ST',
]

// ВЫБИРАЕТ БАЗОВЫЙ РЕЙТИНГ ЛИНИИ ПО ПОЗИЦИИ ИГРОКА
const getLineRating = (
  position: PlayerPosition,
  attackRating: number,
  midfieldRating: number,
  defenseRating: number,
): number => {
  if (position === 'GK' || position === 'LB' || position === 'CB' || position === 'RB') {
    return defenseRating
  }
  if (position === 'CDM' || position === 'CM' || position === 'CAM') {
    return midfieldRating
  }
  return attackRating
}

// ДЕТЕРМИНИРОВАННО ГЕНЕРИРУЕТ СОСТАВ КЛУБА С РЕЙТИНГАМИ И КОНТРАКТАМИ
export const buildSquad = (
  clubId: string,
  clubIndex: number,
  attackRating: number,
  midfieldRating: number,
  defenseRating: number,
): Player[] => {
  const random = createSeededRandom(10_000 + clubIndex * 97)

  return squadPositions.map((position, index): Player => {
    const name = realPlayerNames[
      (clubIndex * 17 + index * 5) % realPlayerNames.length
    ] as RealPlayerName
    const lineRating = getLineRating(position, attackRating, midfieldRating, defenseRating)
    const rotationPenalty = index > 16 ? random.int(4, 11) : random.int(0, 7)
    const rating = clamp(lineRating + random.int(-4, 4) - rotationPenalty, 35, 96)
    const age = random.int(index < 13 ? 23 : 18, index < 10 ? 34 : 30)
    const potential = clamp(rating + random.int(age <= 23 ? 5 : 1, age <= 23 ? 14 : 7), rating, 99)
    const value = Math.round((rating * rating * 1_250 + potential * 18_000) / 10_000) * 10_000

    const player: Player = {
      id: `${clubId}-p${index + 1}`,
      firstName: name.firstName,
      lastName: name.lastName,
      age,
      position,
      rating,
      potential,
      fitness: random.int(86, 100),
      form: random.int(48, 82),
      value,
      salary: Math.round(value * 0.025),
      isInjured: false,
    }

    return {
      ...player,
      ...playerOverrides[player.id],
    }
  })
}
