"use client"

import { useCallback } from "react"
import type { GameState, PokerAction } from "@/types/poker"
import { evaluateHand } from "@/lib/poker-engine"

export function useAIPlayer() {
  const processAITurn = useCallback(
    (gameState: GameState, onAction: (action: PokerAction, amount?: number) => void) => {
      const currentPlayer = gameState.players.find((p) => p.id === gameState.currentPlayerId)
      if (!currentPlayer || currentPlayer.isHuman) {
        console.log("Not AI player's turn or no current player") // Debug log
        return
      }

      console.log("AI player making decision:", currentPlayer.name) // Debug log
      const decision = makeAIDecision(gameState, currentPlayer)
      console.log("AI decision:", decision) // Debug log
      onAction(decision.action, decision.amount)
    },
    [],
  )

  const makeAIDecision = (gameState: GameState, player: any): { action: PokerAction; amount?: number } => {
    // Evaluate hand strength
    const allCards = [...player.hand, ...gameState.communityCards]
    const handStrength = allCards.length >= 5 ? evaluateHand(allCards) : null

    // Calculate pot odds
    const potOdds = gameState.currentBet > 0 ? gameState.pot / gameState.currentBet : 0
    const callAmount = gameState.currentBet - player.currentBet

    // AI personality factors (could be randomized per AI)
    const aggression = 0.3 + Math.random() * 0.4 // 0.3 to 0.7
    const bluffFrequency = 0.1 + Math.random() * 0.2 // 0.1 to 0.3

    // Pre-flop strategy
    if (gameState.round === "pre-flop") {
      return makePreFlopDecision(player, gameState, aggression, bluffFrequency)
    }

    // Post-flop strategy with hand evaluation
    if (handStrength) {
      return makePostFlopDecision(player, gameState, handStrength, aggression, potOdds, callAmount)
    }

    // Fallback decision
    if (callAmount === 0) return { action: "check" }
    if (Math.random() < 0.3) return { action: "call" }
    return { action: "fold" }
  }

  const makePreFlopDecision = (player: any, gameState: GameState, aggression: number, bluffFrequency: number) => {
    const hand = player.hand
    const handValue = evaluatePreFlopHand(hand)
    const callAmount = gameState.currentBet - player.currentBet

    // Premium hands (AA, KK, QQ, AK)
    if (handValue >= 0.9) {
      if (Math.random() < aggression) {
        const raiseAmount = Math.min(gameState.bigBlind * (3 + Math.random() * 3), player.chips)
        return { action: "raise", amount: raiseAmount }
      }
      return callAmount > 0 ? { action: "call" } : { action: "check" }
    }

    // Strong hands (JJ, TT, AQ, AJ)
    if (handValue >= 0.7) {
      if (callAmount <= gameState.bigBlind * 3) {
        return callAmount > 0 ? { action: "call" } : { action: "check" }
      }
      return { action: "fold" }
    }

    // Medium hands
    if (handValue >= 0.5) {
      if (callAmount <= gameState.bigBlind) {
        return callAmount > 0 ? { action: "call" } : { action: "check" }
      }
      return { action: "fold" }
    }

    // Weak hands - mostly fold, occasional bluff
    if (Math.random() < bluffFrequency && callAmount === 0) {
      return { action: "check" }
    }

    return callAmount > 0 ? { action: "fold" } : { action: "check" }
  }

  const makePostFlopDecision = (
    player: any,
    gameState: GameState,
    handStrength: any,
    aggression: number,
    potOdds: number,
    callAmount: number,
  ) => {
    const handRank = handStrength.rank

    // Very strong hands (full house or better)
    if (handRank >= 7) {
      if (Math.random() < aggression * 1.5) {
        const raiseAmount = Math.min(gameState.pot * (0.5 + Math.random() * 0.5), player.chips)
        return { action: "raise", amount: raiseAmount }
      }
      return callAmount > 0 ? { action: "call" } : { action: "check" }
    }

    // Strong hands (trips, straight, flush)
    if (handRank >= 4) {
      if (callAmount <= gameState.pot * 0.5) {
        if (Math.random() < aggression) {
          const raiseAmount = Math.min(gameState.pot * 0.75, player.chips)
          return { action: "raise", amount: raiseAmount }
        }
        return callAmount > 0 ? { action: "call" } : { action: "check" }
      }
      return { action: "call" }
    }

    // Medium hands (two pair, one pair)
    if (handRank >= 2) {
      if (callAmount <= gameState.pot * 0.25) {
        return callAmount > 0 ? { action: "call" } : { action: "check" }
      }
      if (potOdds > 3) {
        return { action: "call" }
      }
      return { action: "fold" }
    }

    // Weak hands (high card)
    if (callAmount === 0) {
      return { action: "check" }
    }

    // Bluff occasionally
    if (Math.random() < 0.1 && callAmount <= gameState.bigBlind) {
      return { action: "call" }
    }

    return { action: "fold" }
  }

  const evaluatePreFlopHand = (hand: any[]): number => {
    if (hand.length !== 2) return 0

    const [card1, card2] = hand
    const val1 = getCardValue(card1.rank)
    const val2 = getCardValue(card2.rank)
    const isPair = val1 === val2
    const isSuited = card1.suit === card2.suit
    const highCard = Math.max(val1, val2)
    const lowCard = Math.min(val1, val2)

    // Pocket pairs
    if (isPair) {
      if (val1 >= 14) return 1.0 // AA
      if (val1 >= 13) return 0.95 // KK
      if (val1 >= 12) return 0.9 // QQ
      if (val1 >= 11) return 0.8 // JJ
      if (val1 >= 10) return 0.75 // TT
      return 0.6 + (val1 - 2) * 0.02 // Lower pairs
    }

    // Ace hands
    if (highCard === 14) {
      if (lowCard >= 13) return 0.9 // AK
      if (lowCard >= 12) return 0.8 // AQ
      if (lowCard >= 11) return 0.75 // AJ
      if (lowCard >= 10) return 0.7 // AT
      return 0.5 + (lowCard - 2) * 0.02
    }

    // King hands
    if (highCard === 13) {
      if (lowCard >= 12) return 0.7 // KQ
      if (lowCard >= 11) return 0.65 // KJ
      return 0.4 + (lowCard - 2) * 0.02
    }

    // Suited connectors and gaps
    if (isSuited) {
      const gap = highCard - lowCard
      if (gap <= 1) return 0.6 // Suited connectors
      if (gap <= 3) return 0.5 // Suited one-gappers
      return 0.4
    }

    // Offsuit connectors
    const gap = highCard - lowCard
    if (gap <= 1 && highCard >= 10) return 0.5

    return 0.3 // Default for weak hands
  }

  const getCardValue = (rank: string): number => {
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

  return { processAITurn }
}
