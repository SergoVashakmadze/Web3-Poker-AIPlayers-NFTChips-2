import type { PokerCard } from "@/types/poker"

export interface HandStrength {
  rank: number // 1-10 (1 = high card, 10 = royal flush)
  values: number[] // Tiebreaker values
  name: string
}

export function evaluateHand(cards: PokerCard[]): HandStrength {
  if (cards.length < 5) {
    return { rank: 0, values: [], name: "Invalid Hand" }
  }

  // Convert cards to numerical values for easier processing
  const processedCards = cards
    .map((card) => ({
      value: getCardValue(card.rank),
      suit: card.suit,
      rank: card.rank,
    }))
    .sort((a, b) => b.value - a.value)

  // Check for each hand type (from highest to lowest)
  const royalFlush = checkRoyalFlush(processedCards)
  if (royalFlush) return royalFlush

  const straightFlush = checkStraightFlush(processedCards)
  if (straightFlush) return straightFlush

  const fourOfAKind = checkFourOfAKind(processedCards)
  if (fourOfAKind) return fourOfAKind

  const fullHouse = checkFullHouse(processedCards)
  if (fullHouse) return fullHouse

  const flush = checkFlush(processedCards)
  if (flush) return flush

  const straight = checkStraight(processedCards)
  if (straight) return straight

  const threeOfAKind = checkThreeOfAKind(processedCards)
  if (threeOfAKind) return threeOfAKind

  const twoPair = checkTwoPair(processedCards)
  if (twoPair) return twoPair

  const onePair = checkOnePair(processedCards)
  if (onePair) return onePair

  return checkHighCard(processedCards)
}

function getCardValue(rank: string): number {
  switch (rank) {
    case "A":
      return 14
    case "K":
      return 13
    case "Q":
      return 12
    case "J":
      return 11
    case "10":
      return 10
    default:
      return Number.parseInt(rank)
  }
}

function checkRoyalFlush(cards: any[]): HandStrength | null {
  const flushSuit = getFlushSuit(cards)
  if (!flushSuit) return null

  const royalCards = cards.filter((c) => c.suit === flushSuit && [14, 13, 12, 11, 10].includes(c.value))
  if (royalCards.length >= 5) {
    return { rank: 10, values: [14], name: "Royal Flush" }
  }
  return null
}

function checkStraightFlush(cards: any[]): HandStrength | null {
  const flushSuit = getFlushSuit(cards)
  if (!flushSuit) return null

  const flushCards = cards.filter((c) => c.suit === flushSuit)
  const straight = findStraight(flushCards)

  if (straight) {
    return { rank: 9, values: [straight], name: "Straight Flush" }
  }
  return null
}

function checkFourOfAKind(cards: any[]): HandStrength | null {
  const valueCounts = getValueCounts(cards)
  const fourOfAKindValue = Object.keys(valueCounts).find((value) => valueCounts[Number.parseInt(value)] >= 4)

  if (fourOfAKindValue) {
    const kicker = Math.max(
      ...Object.keys(valueCounts)
        .map((v) => Number.parseInt(v))
        .filter((v) => v !== Number.parseInt(fourOfAKindValue)),
    )
    return {
      rank: 8,
      values: [Number.parseInt(fourOfAKindValue), kicker],
      name: "Four of a Kind",
    }
  }
  return null
}

function checkFullHouse(cards: any[]): HandStrength | null {
  const valueCounts = getValueCounts(cards)
  const threeOfAKindValue = Object.keys(valueCounts).find((value) => valueCounts[Number.parseInt(value)] >= 3)
  const pairValue = Object.keys(valueCounts).find(
    (value) =>
      valueCounts[Number.parseInt(value)] >= 2 && Number.parseInt(value) !== Number.parseInt(threeOfAKindValue || "0"),
  )

  if (threeOfAKindValue && pairValue) {
    return {
      rank: 7,
      values: [Number.parseInt(threeOfAKindValue), Number.parseInt(pairValue)],
      name: "Full House",
    }
  }
  return null
}

function checkFlush(cards: any[]): HandStrength | null {
  const flushSuit = getFlushSuit(cards)
  if (!flushSuit) return null

  const flushCards = cards.filter((c) => c.suit === flushSuit).slice(0, 5)
  return {
    rank: 6,
    values: flushCards.map((c) => c.value),
    name: "Flush",
  }
}

function checkStraight(cards: any[]): HandStrength | null {
  const straightHigh = findStraight(cards)
  if (straightHigh) {
    return { rank: 5, values: [straightHigh], name: "Straight" }
  }
  return null
}

function checkThreeOfAKind(cards: any[]): HandStrength | null {
  const valueCounts = getValueCounts(cards)
  const threeOfAKindValue = Object.keys(valueCounts).find((value) => valueCounts[Number.parseInt(value)] >= 3)

  if (threeOfAKindValue) {
    const kickers = Object.keys(valueCounts)
      .map((v) => Number.parseInt(v))
      .filter((v) => v !== Number.parseInt(threeOfAKindValue))
      .sort((a, b) => b - a)
      .slice(0, 2)

    return {
      rank: 4,
      values: [Number.parseInt(threeOfAKindValue), ...kickers],
      name: "Three of a Kind",
    }
  }
  return null
}

function checkTwoPair(cards: any[]): HandStrength | null {
  const valueCounts = getValueCounts(cards)
  const pairs = Object.keys(valueCounts)
    .filter((value) => valueCounts[Number.parseInt(value)] >= 2)
    .map((v) => Number.parseInt(v))
    .sort((a, b) => b - a)

  if (pairs.length >= 2) {
    const kicker = Math.max(
      ...Object.keys(valueCounts)
        .map((v) => Number.parseInt(v))
        .filter((v) => !pairs.includes(v)),
    )

    return {
      rank: 3,
      values: [pairs[0], pairs[1], kicker],
      name: "Two Pair",
    }
  }
  return null
}

function checkOnePair(cards: any[]): HandStrength | null {
  const valueCounts = getValueCounts(cards)
  const pairValue = Object.keys(valueCounts).find((value) => valueCounts[Number.parseInt(value)] >= 2)

  if (pairValue) {
    const kickers = Object.keys(valueCounts)
      .map((v) => Number.parseInt(v))
      .filter((v) => v !== Number.parseInt(pairValue))
      .sort((a, b) => b - a)
      .slice(0, 3)

    return {
      rank: 2,
      values: [Number.parseInt(pairValue), ...kickers],
      name: "One Pair",
    }
  }
  return null
}

function checkHighCard(cards: any[]): HandStrength {
  const values = cards
    .map((c) => c.value)
    .sort((a, b) => b - a)
    .slice(0, 5)
  return { rank: 1, values, name: "High Card" }
}

// Helper functions
function getValueCounts(cards: any[]): Record<number, number> {
  const counts: Record<number, number> = {}
  cards.forEach((card) => {
    counts[card.value] = (counts[card.value] || 0) + 1
  })
  return counts
}

function getFlushSuit(cards: any[]): string | null {
  const suitCounts: Record<string, number> = {}
  cards.forEach((card) => {
    suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1
  })

  return Object.keys(suitCounts).find((suit) => suitCounts[suit] >= 5) || null
}

function findStraight(cards: any[]): number | null {
  const uniqueValues = [...new Set(cards.map((c) => c.value))].sort((a, b) => b - a)

  // Check for regular straight
  for (let i = 0; i <= uniqueValues.length - 5; i++) {
    if (uniqueValues[i] - uniqueValues[i + 4] === 4) {
      return uniqueValues[i]
    }
  }

  // Check for A-2-3-4-5 straight (wheel)
  if (
    uniqueValues.includes(14) &&
    uniqueValues.includes(5) &&
    uniqueValues.includes(4) &&
    uniqueValues.includes(3) &&
    uniqueValues.includes(2)
  ) {
    return 5
  }

  return null
}

export function compareHands(hand1: HandStrength, hand2: HandStrength): number {
  if (hand1.rank !== hand2.rank) {
    return hand1.rank - hand2.rank
  }

  // Same rank, compare values
  for (let i = 0; i < Math.max(hand1.values.length, hand2.values.length); i++) {
    const val1 = hand1.values[i] || 0
    const val2 = hand2.values[i] || 0
    if (val1 !== val2) {
      return val1 - val2
    }
  }

  return 0 // Tie
}

export function getHandDescription(handStrength: HandStrength): string {
  return handStrength.name
}
