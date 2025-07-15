import type { PokerCard } from "@/types/poker"

const SUITS = ["hearts", "diamonds", "clubs", "spades"]
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]

export function createDeck(): PokerCard[] {
  const deck: PokerCard[] = []

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit })
    }
  }

  return deck
}

export function shuffleDeck(deck: PokerCard[]): PokerCard[] {
  const shuffled = [...deck]

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled
}

export function dealCards(deck: PokerCard[], count: number): { cards: PokerCard[]; remainingDeck: PokerCard[] } {
  const cards = deck.slice(0, count)
  const remainingDeck = deck.slice(count)

  return { cards, remainingDeck }
}
