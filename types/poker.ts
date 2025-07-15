export interface PokerCard {
  rank: string
  suit: string
}

export interface Player {
  id: string
  name: string
  chips: number
  hand: PokerCard[]
  currentBet: number
  totalBet: number
  isHuman: boolean
  status: "active" | "folded" | "all-in" | "out"
  isDealer: boolean
  showCards: boolean
  position: number
  isAllIn: boolean
  handStrength: HandStrength | null
}

export interface HandStrength {
  rank: number
  values: number[]
  name: string
}

export interface GameAction {
  playerId: string
  action: PokerAction
  amount: number
  timestamp: number
}

export interface GameState {
  players: Player[]
  communityCards: PokerCard[]
  pot: number
  currentBet: number
  smallBlind: number
  bigBlind: number
  round: "pre-flop" | "flop" | "turn" | "river" | "showdown"
  currentPlayerId: string
  dealerPosition: number
  deck: PokerCard[]
  gamePhase: "waiting" | "ready" | "betting" | "transition" | "showdown"
  sidePots: SidePot[]
  lastAction: GameAction | null
  actionHistory: GameAction[]
}

export interface SidePot {
  amount: number
  eligiblePlayers: string[]
}

export type PokerAction = "fold" | "check" | "call" | "raise" | "all-in"
