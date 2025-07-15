"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PokerCard } from "@/components/poker-card"
import { WalletConnection } from "@/components/wallet-connection"
import { useWallet } from "@/hooks/use-wallet"
import { createDeck, shuffleDeck } from "@/lib/deck-utils"
import type { Player, GameState, PokerAction } from "@/types/poker"
import { Bot, User, Play, RotateCcw, Wallet, TestTube, Zap } from "lucide-react"

// Extended Player type to include last action
interface ExtendedPlayer extends Player {
  lastAction?: string
  lastActionAmount?: number
  walletSpent?: number // Track how much this player spent from wallet this hand
}

// Extended GameState type
interface ExtendedGameState extends Omit<GameState, "players"> {
  players: ExtendedPlayer[]
}

export default function PokerGame() {
  const {
    isConnected,
    connectRealWallet,
    connectSimulationWallet,
    isConnecting,
    isSimulated,
    addFunds,
    spendFunds,
    balance, // Add balance to get wallet amount
  } = useWallet()

  const [lastAction, setLastAction] = useState("")
  const [actionCount, setActionCount] = useState(0)
  const [winner, setWinner] = useState<{
    name: string
    amount: number
    method: string
  } | null>(null)

  // Game state with extended player info
  const [gameState, setGameState] = useState<ExtendedGameState>({
    players: [],
    communityCards: [],
    pot: 0,
    currentBet: 0,
    smallBlind: 0.01,
    bigBlind: 0.02,
    round: "pre-flop",
    currentPlayerId: "",
    dealerPosition: 0,
    deck: [],
    gamePhase: "waiting",
    sidePots: [],
    lastAction: null,
    actionHistory: [],
  })

  const [isInGame, setIsInGame] = useState(false)

  // Initialize game with players - FIXED to use wallet balance
  const initializeGame = () => {
    console.log("Initializing game with wallet balance:", balance)

    // Use wallet balance for human player (cap between 5-50 ETH for reasonable game balance)
    const walletBalance = Number.parseFloat(balance) || 10
    const humanChips = Math.max(5, Math.min(walletBalance, 50))

    console.log("Wallet balance:", walletBalance, "Game chips:", humanChips)

    const players: ExtendedPlayer[] = [
      {
        id: "player1",
        name: "You",
        chips: humanChips, // Use wallet balance (capped for game balance)
        hand: [],
        currentBet: 0,
        totalBet: 0,
        isHuman: true,
        status: "active",
        isDealer: true,
        showCards: false,
        position: 0,
        isAllIn: false,
        handStrength: null,
        lastAction: "",
        lastActionAmount: 0,
        walletSpent: 0,
      },
      {
        id: "ai1",
        name: "AI Shark",
        chips: Math.max(15, humanChips * 0.8), // Scale AI chips relative to human
        hand: [],
        currentBet: 0,
        totalBet: 0,
        isHuman: false,
        status: "active",
        isDealer: false,
        showCards: false,
        position: 1,
        isAllIn: false,
        handStrength: null,
        lastAction: "",
        lastActionAmount: 0,
        walletSpent: 0,
      },
      {
        id: "ai2",
        name: "Poker Bot",
        chips: Math.max(12, humanChips * 0.6), // Scale AI chips relative to human
        hand: [],
        currentBet: 0,
        totalBet: 0,
        isHuman: false,
        status: "active",
        isDealer: false,
        showCards: false,
        position: 2,
        isAllIn: false,
        handStrength: null,
        lastAction: "",
        lastActionAmount: 0,
        walletSpent: 0,
      },
    ]

    console.log(
      "✅ Players initialized:",
      players.map((p) => ({ name: p.name, chips: p.chips })),
    )

    setGameState((prev) => ({
      ...prev,
      players,
      gamePhase: "ready",
    }))
    setLastAction(`Game ready - You have ${humanChips.toFixed(3)} ETH in chips`)
  }

  // Start new hand
  const startNewHand = () => {
    console.log("Starting new hand...")

    // First, eliminate players with 0 chips
    const playersWithChips = gameState.players.filter((player) => player.chips > 0)

    console.log(
      "Players with chips:",
      playersWithChips.map((p) => ({ name: p.name, chips: p.chips })),
    )

    if (playersWithChips.length <= 1) {
      // Game over - only one player left with chips
      const winner = playersWithChips[0]
      if (winner) {
        console.log("Game over - last player standing:", winner.name)

        // Award any remaining pot to winner
        if (gameState.pot > 0) {
          if (winner.isHuman && isSimulated) {
            addFunds(gameState.pot)
            console.log("Added remaining pot to wallet:", gameState.pot)
          }

          setWinner({
            name: winner.name,
            amount: gameState.pot,
            method: "Last player standing",
          })

          setTimeout(() => {
            setWinner(null)
            resetGame()
          }, 4000)
        } else {
          // No pot, just reset
          resetGame()
        }
        return
      }
    }

    // Continue with normal hand logic...
    const deck = shuffleDeck(createDeck())

    // Deal 2 cards to each player with chips and reset actions
    const playersWithCards = playersWithChips.map((player, index) => {
      const hand = [deck[index * 2], deck[index * 2 + 1]]
      return {
        ...player,
        hand: hand,
        currentBet: 0,
        totalBet: 0,
        status: "active" as const,
        showCards: false,
        isAllIn: false,
        handStrength: null,
        lastAction: "", // Reset last action
        lastActionAmount: 0,
        walletSpent: 0, // Reset wallet spending tracker
      }
    })

    // Post blinds and set blind actions
    if (playersWithCards.length >= 2) {
      playersWithCards[0].currentBet = gameState.smallBlind
      playersWithCards[0].chips -= gameState.smallBlind
      playersWithCards[0].totalBet = gameState.smallBlind
      playersWithCards[0].lastAction = "Small Blind"
      playersWithCards[0].lastActionAmount = gameState.smallBlind

      playersWithCards[1].currentBet = gameState.bigBlind
      playersWithCards[1].chips -= gameState.bigBlind
      playersWithCards[1].totalBet = gameState.bigBlind
      playersWithCards[1].lastAction = "Big Blind"
      playersWithCards[1].lastActionAmount = gameState.bigBlind
    }

    const humanPlayer = playersWithCards.find((p) => p.isHuman)

    setGameState((prev) => ({
      ...prev,
      players: playersWithCards,
      communityCards: [],
      pot: gameState.smallBlind + gameState.bigBlind,
      currentBet: gameState.bigBlind,
      round: "pre-flop",
      currentPlayerId: humanPlayer?.id || "",
      deck: deck.slice(6),
      gamePhase: "betting",
      actionHistory: [],
    }))

    setLastAction("New hand started - cards dealt")
    setActionCount(0)
  }

  // MUCH MORE CHALLENGING AI Decision Making
  const makeSmartAIDecision = (aiPlayer: ExtendedPlayer, gameState: ExtendedGameState, aiIndex: number) => {
    // If AI has no chips, they should fold
    if (aiPlayer.chips <= 0) {
      return { action: "Fold", amount: 0 }
    }

    // More aggressive and varied AI personalities
    const personalities = [
      {
        name: "Shark",
        aggression: 0.85,
        bluffRate: 0.45,
        foldThreshold: 0.2,
        raiseFactor: 1.8,
        callThreshold: 0.3,
      },
      {
        name: "Maniac",
        aggression: 0.95,
        bluffRate: 0.6,
        foldThreshold: 0.1,
        raiseFactor: 2.2,
        callThreshold: 0.2,
      },
    ]

    const personality = personalities[aiIndex] || personalities[0]
    const callAmount = gameState.currentBet - aiPlayer.currentBet
    const potOdds = gameState.pot > 0 ? callAmount / (gameState.pot + callAmount) : 0

    // Dynamic aggression based on pot size and position
    const dynamicAggression = personality.aggression + (gameState.pot / (gameState.bigBlind * 10)) * 0.2

    if (gameState.round === "pre-flop") {
      return makeAggressivePreFlopDecision(aiPlayer, gameState, personality, callAmount, dynamicAggression)
    }

    if (gameState.communityCards.length > 0) {
      return makeAggressivePostFlopDecision(aiPlayer, gameState, personality, callAmount, potOdds, dynamicAggression)
    }

    return { action: "Check", amount: 0 }
  }

  const makeAggressivePreFlopDecision = (
    aiPlayer: ExtendedPlayer,
    gameState: ExtendedGameState,
    personality: any,
    callAmount: number,
    dynamicAggression: number,
  ) => {
    const handStrength = evaluatePreFlopHand(aiPlayer.hand)
    const random = Math.random()
    const isLatePosition = true // Simplified - assume aggressive position play

    // MUCH more aggressive premium hand play
    if (handStrength >= 0.8) {
      if (random < 0.95) {
        // Almost always raise with premium hands
        const raiseAmount = Math.min(
          gameState.bigBlind * (6 + Math.random() * 8), // Bigger raises
          aiPlayer.chips + aiPlayer.currentBet,
        )
        return { action: "Raise", amount: raiseAmount }
      }
      return callAmount > 0 ? { action: "Call", amount: callAmount } : { action: "Check", amount: 0 }
    }

    // More aggressive with strong hands
    if (handStrength >= 0.6) {
      if (callAmount <= gameState.bigBlind * 8) {
        // Willing to call bigger bets
        if (random < dynamicAggression * 1.2) {
          // More likely to raise
          const raiseAmount = Math.min(
            gameState.bigBlind * (4 + Math.random() * 6),
            aiPlayer.chips + aiPlayer.currentBet,
          )
          return { action: "Raise", amount: raiseAmount }
        }
        return callAmount > 0 ? { action: "Call", amount: callAmount } : { action: "Check", amount: 0 }
      }
      // Still call moderate bets with strong hands
      if (random < 0.7) {
        return { action: "Call", amount: callAmount }
      }
      return { action: "Fold", amount: 0 }
    }

    // More aggressive with medium hands
    if (handStrength >= 0.4) {
      if (callAmount <= gameState.bigBlind * 4) {
        if (random < dynamicAggression * 0.8) {
          const raiseAmount = Math.min(gameState.bigBlind * 3.5, aiPlayer.chips + aiPlayer.currentBet)
          return { action: "Raise", amount: raiseAmount }
        }
        return callAmount > 0 ? { action: "Call", amount: callAmount } : { action: "Check", amount: 0 }
      }
      if (random < 0.4) {
        // More willing to call
        return { action: "Call", amount: callAmount }
      }
      return { action: "Fold", amount: 0 }
    }

    // Much more aggressive bluffing with weak hands
    if (callAmount === 0) {
      if (random < personality.bluffRate * 1.5) {
        // More bluff raises
        const bluffAmount = Math.min(gameState.bigBlind * 4, aiPlayer.chips + aiPlayer.currentBet)
        return { action: "Raise", amount: bluffAmount }
      }
      return { action: "Check", amount: 0 }
    }

    // More bluff calls and aggressive plays
    if (random < personality.bluffRate * 2.5 && callAmount <= gameState.bigBlind * 2) {
      return { action: "Call", amount: callAmount }
    }

    // Less folding overall
    if (random < 0.4) {
      return { action: "Call", amount: callAmount }
    }

    return { action: "Fold", amount: 0 }
  }

  const makeAggressivePostFlopDecision = (
    aiPlayer: ExtendedPlayer,
    gameState: ExtendedGameState,
    personality: any,
    callAmount: number,
    potOdds: number,
    dynamicAggression: number,
  ) => {
    const allCards = [...aiPlayer.hand, ...gameState.communityCards]
    const handStrength = evaluateHandStrength(allCards)
    const random = Math.random()
    const potSize = gameState.pot

    // VERY aggressive with strong hands
    if (handStrength >= 0.75) {
      if (random < 0.98) {
        // Almost always bet/raise
        const raiseAmount = Math.min(
          potSize * (1.0 + Math.random() * 1.5), // Bigger bets
          aiPlayer.chips + aiPlayer.currentBet,
        )
        return { action: "Raise", amount: raiseAmount }
      }
      return callAmount > 0 ? { action: "Call", amount: callAmount } : { action: "Check", amount: 0 }
    }

    // More aggressive with decent hands
    if (handStrength >= 0.5) {
      if (callAmount <= potSize * 1.2) {
        // Willing to call bigger bets
        if (random < dynamicAggression * 1.5) {
          const raiseAmount = Math.min(potSize * 1.2, aiPlayer.chips + aiPlayer.currentBet)
          return { action: "Raise", amount: raiseAmount }
        }
        return callAmount > 0 ? { action: "Call", amount: callAmount } : { action: "Check", amount: 0 }
      }
      if (random < 0.8) {
        // More willing to call
        return { action: "Call", amount: callAmount }
      }
      return { action: "Fold", amount: 0 }
    }

    // Aggressive with marginal hands
    if (handStrength >= 0.25) {
      if (callAmount <= potSize * 0.8) {
        if (random < dynamicAggression * 0.7) {
          const raiseAmount = Math.min(potSize * 0.9, aiPlayer.chips + aiPlayer.currentBet)
          return { action: "Raise", amount: raiseAmount }
        }
        return callAmount > 0 ? { action: "Call", amount: callAmount } : { action: "Check", amount: 0 }
      }
      if (potOdds < 0.3 && random < 0.6) {
        // Better pot odds consideration
        return { action: "Call", amount: callAmount }
      }
      return { action: "Fold", amount: 0 }
    }

    // Much more bluffing with weak hands
    if (callAmount === 0) {
      if (random < personality.bluffRate * 2.0) {
        // Double the bluff rate
        const bluffAmount = Math.min(potSize * 0.8, aiPlayer.chips + aiPlayer.currentBet)
        return { action: "Raise", amount: bluffAmount }
      }
      return { action: "Check", amount: 0 }
    }

    // More aggressive bluff calls
    if (random < personality.bluffRate * 2.0 && callAmount <= potSize * 0.6) {
      return { action: "Call", amount: callAmount }
    }

    // Semi-bluff with draws (simplified)
    if (gameState.round === "flop" || gameState.round === "turn") {
      if (random < 0.3 && callAmount <= potSize * 0.5) {
        return { action: "Call", amount: callAmount }
      }
    }

    return { action: "Fold", amount: 0 }
  }

  // Improved hand evaluation
  const evaluatePreFlopHand = (hand: any[]): number => {
    if (hand.length !== 2) return 0

    const [card1, card2] = hand
    const val1 = getCardValue(card1.rank)
    const val2 = getCardValue(card2.rank)
    const isPair = val1 === val2
    const isSuited = card1.suit === card2.suit
    const highCard = Math.max(val1, val2)
    const lowCard = Math.min(val1, val2)
    const gap = highCard - lowCard

    // Premium pairs
    if (isPair) {
      if (val1 >= 14) return 1.0 // AA
      if (val1 >= 13) return 0.98 // KK
      if (val1 >= 12) return 0.95 // QQ
      if (val1 >= 11) return 0.88 // JJ
      if (val1 >= 10) return 0.82 // TT
      if (val1 >= 8) return 0.75 // 88, 99
      if (val1 >= 6) return 0.65 // 66, 77
      return 0.55 + (val1 - 2) * 0.02 // Small pairs
    }

    // Ace hands
    if (highCard === 14) {
      if (lowCard >= 13) return isSuited ? 0.95 : 0.92 // AK
      if (lowCard >= 12) return isSuited ? 0.88 : 0.84 // AQ
      if (lowCard >= 11) return isSuited ? 0.82 : 0.78 // AJ
      if (lowCard >= 10) return isSuited ? 0.76 : 0.72 // AT
      if (lowCard >= 9) return isSuited ? 0.68 : 0.62 // A9
      if (isSuited) return 0.55 + (lowCard - 2) * 0.03
      return 0.45 + (lowCard - 2) * 0.02
    }

    // King hands
    if (highCard === 13) {
      if (lowCard >= 12) return isSuited ? 0.78 : 0.74 // KQ
      if (lowCard >= 11) return isSuited ? 0.72 : 0.68 // KJ
      if (lowCard >= 10) return isSuited ? 0.66 : 0.62 // KT
      if (lowCard >= 9) return isSuited ? 0.58 : 0.52 // K9
      if (isSuited) return 0.48 + (lowCard - 2) * 0.02
      return 0.38 + (lowCard - 2) * 0.015
    }

    // Queen hands
    if (highCard === 12) {
      if (lowCard >= 11) return isSuited ? 0.68 : 0.64 // QJ
      if (lowCard >= 10) return isSuited ? 0.62 : 0.58 // QT
      if (lowCard >= 9) return isSuited ? 0.54 : 0.48 // Q9
      if (isSuited) return 0.45 + (lowCard - 2) * 0.02
      return 0.35 + (lowCard - 2) * 0.015
    }

    // Suited connectors and one-gappers
    if (isSuited) {
      if (gap <= 1 && highCard >= 8) return 0.65 // Suited connectors 8+
      if (gap <= 1 && highCard >= 6) return 0.58 // Lower suited connectors
      if (gap <= 2 && highCard >= 10) return 0.55 // Suited one-gappers
      if (gap <= 3 && highCard >= 11) return 0.48 // Suited two-gappers
      return 0.42
    }

    // Offsuit connectors
    if (gap <= 1 && highCard >= 10) return 0.52 // High connectors
    if (gap <= 1 && highCard >= 8) return 0.45 // Medium connectors

    // High cards
    if (highCard >= 11) return 0.38
    if (highCard >= 9) return 0.28

    return 0.18 // Trash hands
  }

  const evaluateHandStrength = (cards: any[]): number => {
    if (cards.length < 5) return 0

    const ranks = cards.map((c) => getCardValue(c.rank)).sort((a, b) => b - a)
    const suits = cards.map((c) => c.suit)

    const rankCounts: { [key: number]: number } = {}
    ranks.forEach((rank) => {
      rankCounts[rank] = (rankCounts[rank] || 0) + 1
    })

    const counts = Object.values(rankCounts).sort((a, b) => b - a)
    const suitCounts: { [key: string]: number } = {}
    suits.forEach((suit) => {
      suitCounts[suit] = (suitCounts[suit] || 0) + 1
    })
    const isFlush = Object.values(suitCounts).some((count) => count >= 5)
    const isStraight = checkStraight(ranks)

    // Royal flush
    if (isFlush && isStraight && ranks[0] === 14) return 1.0

    // Straight flush
    if (isFlush && isStraight) return 0.98

    // Four of a kind
    if (counts[0] >= 4) return 0.95

    // Full house
    if (counts[0] >= 3 && counts[1] >= 2) return 0.92

    // Flush
    if (isFlush) return 0.88

    // Straight
    if (isStraight) return 0.85

    // Three of a kind
    if (counts[0] >= 3) {
      const tripRank = Object.keys(rankCounts).find((rank) => rankCounts[Number(rank)] >= 3)
      if (Number(tripRank) >= 11) return 0.82 // High trips
      return 0.75 // Lower trips
    }

    // Two pair
    if (counts[0] >= 2 && counts[1] >= 2) {
      const pairs = Object.keys(rankCounts)
        .filter((rank) => rankCounts[Number(rank)] >= 2)
        .map((rank) => Number(rank))
        .sort((a, b) => b - a)
      if (pairs[0] >= 11) return 0.68 // High two pair
      return 0.58 // Lower two pair
    }

    // One pair
    if (counts[0] >= 2) {
      const pairRank = Object.keys(rankCounts).find((rank) => rankCounts[Number(rank)] >= 2)
      if (Number(pairRank) >= 13) return 0.65 // High pair (K+)
      if (Number(pairRank) >= 11) return 0.58 // Medium pair (J, Q)
      if (Number(pairRank) >= 8) return 0.48 // Low-medium pair
      return 0.35 // Low pair
    }

    // High card
    if (ranks[0] >= 14) return 0.32 // Ace high
    if (ranks[0] >= 13) return 0.28 // King high
    if (ranks[0] >= 12) return 0.24 // Queen high
    if (ranks[0] >= 11) return 0.2 // Jack high
    return 0.15 // Lower high card
  }

  const checkStraight = (ranks: number[]): boolean => {
    const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a)

    // Check for regular straight
    for (let i = 0; i <= uniqueRanks.length - 5; i++) {
      if (uniqueRanks[i] - uniqueRanks[i + 4] === 4) {
        return true
      }
    }

    // Check for A-2-3-4-5 straight (wheel)
    if (
      uniqueRanks.includes(14) &&
      uniqueRanks.includes(5) &&
      uniqueRanks.includes(4) &&
      uniqueRanks.includes(3) &&
      uniqueRanks.includes(2)
    ) {
      return true
    }

    return false
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

  // Handle poker actions with IMPROVED debugging and turn validation
  const handlePokerAction = (action: PokerAction, amount?: number) => {
    console.log(`=== BUTTON CLICKED: ${action} ===`)
    console.log("Current game state:", {
      gamePhase: gameState.gamePhase,
      currentPlayerId: gameState.currentPlayerId,
      humanPlayerId: gameState.players.find((p) => p.isHuman)?.id,
      isHumanTurn: gameState.currentPlayerId === gameState.players.find((p) => p.isHuman)?.id,
    })

    // Always show immediate feedback
    alert(`✅ ${action} button clicked! Processing...`)

    setLastAction(`You clicked ${action}! Processing...`)
    setActionCount((prev) => prev + 1)

    setGameState((prev) => {
      const newPlayers = [...prev.players]
      const humanIndex = newPlayers.findIndex((p) => p.isHuman)
      const humanPlayer = newPlayers[humanIndex]

      if (humanIndex === -1) {
        console.log("ERROR: Human player not found")
        alert("❌ Error: Human player not found")
        return prev
      }

      console.log("Human player found:", {
        id: humanPlayer.id,
        name: humanPlayer.name,
        chips: humanPlayer.chips,
        currentBet: humanPlayer.currentBet,
        status: humanPlayer.status,
      })

      // Force it to be the human's turn if they're clicking
      const isHumanTurn = prev.currentPlayerId === humanPlayer.id
      if (!isHumanTurn) {
        console.log("⚠️ Not human's turn, but processing anyway")
        console.log("Expected:", prev.currentPlayerId, "Got:", humanPlayer.id)
      }

      const human = { ...humanPlayer }
      let newPot = prev.pot
      let newCurrentBet = prev.currentBet
      let walletSpent = 0

      console.log("=== PROCESSING ACTION ===")
      console.log("Before action:", {
        action,
        humanChips: human.chips,
        humanCurrentBet: human.currentBet,
        gameCurrentBet: prev.currentBet,
        pot: prev.pot,
      })

      switch (action) {
        case "fold":
          human.status = "folded"
          human.lastAction = "Fold"
          human.lastActionAmount = 0
          console.log("✅ FOLD processed")
          break

        case "check":
          if (prev.currentBet > human.currentBet) {
            console.log("❌ Cannot check - there's a bet to call")
            alert("❌ Cannot check - there's a bet to call!")
            return prev
          }
          human.lastAction = "Check"
          human.lastActionAmount = 0
          console.log("✅ CHECK processed")
          break

        case "call":
          const callAmount = Math.min(prev.currentBet - human.currentBet, human.chips)
          console.log("Call amount calculated:", callAmount)
          if (callAmount > 0) {
            human.chips -= callAmount
            human.currentBet += callAmount
            newPot += callAmount
            walletSpent = callAmount
            human.lastAction = "Call"
            human.lastActionAmount = callAmount
            console.log("✅ CALL processed:", callAmount)
          } else {
            console.log("⚠️ Call amount is 0")
          }
          break

        case "raise":
          const raiseAmount = amount || prev.bigBlind * 3
          const additionalBet = Math.min(raiseAmount - human.currentBet, human.chips)
          console.log("Raise amount:", raiseAmount, "Additional bet:", additionalBet)
          if (additionalBet > 0) {
            human.chips -= additionalBet
            human.currentBet = raiseAmount
            newPot += additionalBet
            newCurrentBet = raiseAmount
            walletSpent = additionalBet
            human.lastAction = "Raise"
            human.lastActionAmount = raiseAmount
            console.log("✅ RAISE processed:", raiseAmount)
          } else {
            console.log("⚠️ Additional bet is 0")
          }
          break

        case "all-in":
          const allInAmount = human.chips
          console.log("All-in amount:", allInAmount)
          if (allInAmount > 0) {
            human.chips = 0
            human.currentBet += allInAmount
            newPot += allInAmount
            walletSpent = allInAmount
            human.isAllIn = true
            human.lastAction = "All In"
            human.lastActionAmount = allInAmount
            if (human.currentBet > newCurrentBet) {
              newCurrentBet = human.currentBet
            }
            console.log("✅ ALL-IN processed:", allInAmount)
          } else {
            console.log("⚠️ All-in amount is 0")
          }
          break

        default:
          console.log("❌ Unknown action:", action)
          alert(`❌ Unknown action: ${action}`)
          return prev
      }

      // Track wallet spending
      human.walletSpent = (human.walletSpent || 0) + walletSpent

      console.log("After action:", {
        humanChips: human.chips,
        humanCurrentBet: human.currentBet,
        newPot,
        newCurrentBet,
        walletSpentThisAction: walletSpent,
      })

      // Update wallet
      if (walletSpent > 0 && isSimulated) {
        try {
          spendFunds(walletSpent)
          console.log("✅ Wallet updated: spent", walletSpent, "ETH")
        } catch (error) {
          console.log("❌ Wallet error:", error)
        }
      }

      newPlayers[humanIndex] = human

      // Set next player or advance game
      let nextPlayerId = ""
      const activePlayers = newPlayers.filter((p) => p.status === "active" && !p.isAllIn)

      if (activePlayers.length > 1) {
        // Find next AI player
        const aiPlayers = activePlayers.filter((p) => !p.isHuman)
        if (aiPlayers.length > 0) {
          nextPlayerId = aiPlayers[0].id
        }
      }

      const newState = {
        ...prev,
        players: newPlayers,
        pot: newPot,
        currentBet: newCurrentBet,
        currentPlayerId: nextPlayerId,
        gamePhase: "betting" as const,
      }

      console.log("✅ New state created:", {
        pot: newState.pot,
        currentBet: newState.currentBet,
        currentPlayerId: newState.currentPlayerId,
        humanAction: human.lastAction,
      })

      return newState
    })

    // Process AI responses after a delay
    setTimeout(() => {
      console.log("⏰ Processing AI responses...")
      processAIResponses()
    }, 1500)
  }

  // Process AI responses with FIXED game progression
  const processAIResponses = () => {
    console.log("=== PROCESSING AI RESPONSES ===")

    setGameState((prev) => {
      const newPlayers = [...prev.players]
      const aiPlayers = newPlayers.filter((p) => !p.isHuman && p.status === "active" && p.chips > 0) // Add chips > 0 check
      let potIncrease = 0
      let newCurrentBet = prev.currentBet

      // If no AI players can act, advance to showdown
      if (aiPlayers.length === 0) {
        const playersInHand = newPlayers.filter((p) => p.status !== "folded" && p.chips > 0)
        if (playersInHand.length <= 1) {
          return handleShowdownImmediate(prev, newPlayers, prev.pot)
        }
      }

      aiPlayers.forEach((aiPlayer, aiIndex) => {
        const playerIndex = newPlayers.findIndex((p) => p.id === aiPlayer.id)
        if (playerIndex === -1 || newPlayers[playerIndex].status !== "active" || newPlayers[playerIndex].chips <= 0)
          return

        const ai = { ...newPlayers[playerIndex] }
        const decision = makeSmartAIDecision(ai, prev, aiIndex)

        console.log(`${ai.name} decision:`, decision)

        ai.lastAction = decision.action
        ai.lastActionAmount = decision.amount

        switch (decision.action) {
          case "Call":
            const callAmount = Math.min(prev.currentBet - ai.currentBet, ai.chips)
            if (callAmount > 0) {
              ai.chips -= callAmount
              ai.currentBet += callAmount
              potIncrease += callAmount
            }
            break
          case "Raise":
            const additionalBet = Math.min(decision.amount - ai.currentBet, ai.chips)
            if (additionalBet > 0) {
              ai.chips -= additionalBet
              ai.currentBet = decision.amount
              potIncrease += additionalBet
              newCurrentBet = decision.amount
            }
            break
          case "Fold":
            ai.status = "folded"
            break
          case "Check":
            break
          case "All In":
            const allInAmount = ai.chips
            if (allInAmount > 0) {
              ai.chips = 0
              ai.currentBet += allInAmount
              potIncrease += allInAmount
              ai.isAllIn = true
              if (ai.currentBet > newCurrentBet) {
                newCurrentBet = ai.currentBet
              }
            }
            break
        }

        newPlayers[playerIndex] = ai
      })

      const lastAI = aiPlayers[aiPlayers.length - 1]
      if (lastAI) {
        setLastAction(`${lastAI.name} ${lastAI.lastAction?.toLowerCase() || "acted"}`)
      }

      // Check if betting round is complete
      const shouldAdvanceRound = checkShouldAdvanceRound(newPlayers, newCurrentBet)

      if (shouldAdvanceRound) {
        console.log("Advancing to next round from:", prev.round)
        return advanceToNextRoundImmediate(prev, newPlayers, prev.pot + potIncrease, newCurrentBet)
      }

      return {
        ...prev,
        players: newPlayers,
        pot: prev.pot + potIncrease,
        currentBet: newCurrentBet,
      }
    })
  }

  // Check if round should advance
  const checkShouldAdvanceRound = (players: ExtendedPlayer[], currentBet: number) => {
    const activePlayers = players.filter((p) => p.status === "active")
    const playersInHand = players.filter((p) => p.status !== "folded")

    if (playersInHand.length <= 1) {
      return false
    }

    const playersWhoCanAct = activePlayers.filter((p) => !p.isAllIn)

    if (playersWhoCanAct.length === 0) {
      return true
    }

    const allMatched = playersWhoCanAct.every((p) => p.currentBet === currentBet)

    console.log("Round completion check:", {
      playersWhoCanAct: playersWhoCanAct.length,
      allMatched,
      currentBet,
      playerBets: playersWhoCanAct.map((p) => ({ name: p.name, bet: p.currentBet })),
    })

    return allMatched
  }

  // Advance to next round immediately
  const advanceToNextRoundImmediate = (
    prevState: ExtendedGameState,
    players: ExtendedPlayer[],
    pot: number,
    currentBet: number,
  ) => {
    const playersInHand = players.filter((p) => p.status !== "folded")

    if (playersInHand.length <= 1) {
      return handleShowdownImmediate(prevState, players, pot)
    }

    let newRound = prevState.round
    let newCommunityCards = [...prevState.communityCards]

    switch (prevState.round) {
      case "pre-flop":
        newRound = "flop"
        const flopDeck = shuffleDeck(createDeck())
        newCommunityCards = [flopDeck[0], flopDeck[1], flopDeck[2]]
        setLastAction("Flop dealt! 🃏🃏🃏")
        break
      case "flop":
        newRound = "turn"
        const turnDeck = shuffleDeck(createDeck())
        newCommunityCards = [...prevState.communityCards, turnDeck[0]]
        setLastAction("Turn dealt! 🃏")
        break
      case "turn":
        newRound = "river"
        const riverDeck = shuffleDeck(createDeck())
        newCommunityCards = [...prevState.communityCards, riverDeck[0]]
        setLastAction("River dealt! 🃏")
        break
      case "river":
        return handleShowdownImmediate(prevState, players, pot)
      default:
        return prevState
    }

    const newPlayers = players.map((p) => ({
      ...p,
      currentBet: 0,
      lastAction: "",
      lastActionAmount: 0,
    }))

    const humanPlayer = newPlayers.find((p) => p.isHuman)

    return {
      ...prevState,
      players: newPlayers,
      communityCards: newCommunityCards,
      round: newRound,
      currentBet: 0,
      currentPlayerId: humanPlayer?.id || "",
      pot: pot,
      gamePhase: "betting",
    }
  }

  // Handle showdown with CORRECTED wallet math
  const handleShowdownImmediate = (prevState: ExtendedGameState, players: ExtendedPlayer[], pot: number) => {
    const playersInHand = players.filter((p) => p.status !== "folded")

    const winner = playersInHand[0] // Simplified winner selection
    const newPlayers = players.map((p) => {
      if (p.id === winner.id) {
        return { ...p, chips: p.chips + pot, showCards: true }
      }
      return { ...p, showCards: true }
    })

    console.log("=== SHOWDOWN WALLET MATH ===")
    console.log("Winner:", winner.name)
    console.log("Pot won:", pot)

    // Handle wallet for human winner with CORRECTED math
    if (winner.isHuman && isSimulated) {
      const humanPlayer = players.find((p) => p.isHuman)
      const totalSpentThisHand = humanPlayer?.walletSpent || 0

      console.log("Human won! Wallet calculation:")
      console.log("- Pot won:", pot, "ETH")
      console.log("- Total spent this hand:", totalSpentThisHand, "ETH")
      console.log("- Net profit:", pot - totalSpentThisHand, "ETH")

      // Add the FULL pot to wallet (we already deducted spending during actions)
      addFunds(pot)
      console.log("✅ Added FULL pot to wallet:", pot, "ETH")
    }

    setWinner({
      name: winner.name,
      amount: pot,
      method: "Won at showdown",
    })

    // Instead of automatically starting new hand, reset to ready state
    setTimeout(() => {
      setWinner(null)

      // Check if human player has enough chips to continue
      const humanPlayer = newPlayers.find((p) => p.isHuman)
      const playersWithChips = newPlayers.filter((p) => p.chips > 0)

      if (playersWithChips.length <= 1 || !humanPlayer || humanPlayer.chips <= 0) {
        // Game over - reset completely
        console.log("Game over - resetting to lobby")
        resetGame()
      } else {
        // Continue with next hand
        console.log("Continuing game with remaining players")
        startNewHand()
      }
    }, 4000)

    return {
      ...prevState,
      players: newPlayers,
      pot: 0,
      gamePhase: "showdown",
      currentPlayerId: "",
    }
  }

  const joinGame = () => {
    console.log("Joining game...")
    setIsInGame(true)
    initializeGame()
  }

  const startGame = () => {
    console.log("Starting game...")
    startNewHand()
  }

  const resetGame = () => {
    console.log("Resetting game...")
    setIsInGame(false)
    setGameState((prev) => ({
      ...prev,
      gamePhase: "waiting",
      players: [],
      communityCards: [],
      pot: 0,
      currentBet: 0,
    }))
    setLastAction("Game reset")
    setActionCount(0)
  }

  // Auto-initialize when wallet connects
  useEffect(() => {
    if (isConnected && !isInGame) {
      console.log("Wallet connected, auto-joining game...")
      joinGame()
    }
  }, [isConnected])

  const humanPlayer = gameState.players.find((p) => p.isHuman)
  const callAmount = gameState.currentBet - (humanPlayer?.currentBet || 0)

  // Helper function to get action color
  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "fold":
        return "bg-red-500 text-white"
      case "call":
        return "bg-blue-500 text-white"
      case "raise":
        return "bg-green-500 text-white"
      case "check":
        return "bg-gray-500 text-white"
      case "all in":
        return "bg-purple-500 text-white"
      case "small blind":
      case "big blind":
        return "bg-yellow-500 text-black"
      default:
        return "bg-gray-400 text-white"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">♠</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Web3 Poker Game</h1>
              <p className="text-gray-300 text-sm">Play poker with AI opponents</p>
            </div>
          </div>
          {isConnected && <WalletConnection />}
        </div>

        {/* Game Status */}
        <Card className="mb-4 p-3 bg-slate-800/50 border-slate-700">
          <div className="text-center">
            <h3 className="text-white font-semibold">Game Status</h3>
            <p className="text-gray-300">Phase: {gameState.gamePhase}</p>
            <p className="text-blue-400">{lastAction}</p>
            {/* Debug info */}
            {humanPlayer && (
              <div className="text-xs text-gray-400 mt-2">
                <p>
                  Wallet Balance: {balance} ETH | Game Chips: {humanPlayer.chips.toFixed(3)} ETH
                </p>
                <p>Wallet spent this hand: {(humanPlayer.walletSpent || 0).toFixed(3)} ETH</p>
              </div>
            )}
          </div>
        </Card>

        {/* DEBUG INFO - Remove this later */}
        <Card className="mb-4 p-3 bg-red-900/20 border-red-600/50">
          <div className="text-center">
            <h3 className="text-red-400 font-semibold text-sm">🐛 DEBUG INFO</h3>
            <div className="text-xs text-red-200 mt-2 space-y-1">
              <p>Current Player ID: {gameState.currentPlayerId}</p>
              <p>Human Player ID: {gameState.players.find((p) => p.isHuman)?.id || "Not found"}</p>
              <p>
                Is Human Turn:{" "}
                {gameState.currentPlayerId === gameState.players.find((p) => p.isHuman)?.id ? "YES" : "NO"}
              </p>
              <p>Game Phase: {gameState.gamePhase}</p>
              <p>Players: {gameState.players.map((p) => `${p.name}(${p.status})`).join(", ")}</p>
              <p>Action Count: {actionCount}</p>
            </div>
          </div>
        </Card>

        {/* Simulation Notice */}
        {isConnected && isSimulated && (
          <Card className="mb-4 p-3 bg-yellow-900/20 border-yellow-600/50">
            <div className="flex items-center space-x-3">
              <Zap className="w-4 h-4 text-yellow-400" />
              <div>
                <h3 className="text-yellow-400 font-semibold text-sm">Simulation Mode Active</h3>
                <p className="text-yellow-200 text-xs">
                  You're using a simulated wallet for testing. All transactions are simulated.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Winner Announcement */}
        {winner && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="p-8 bg-gradient-to-br from-yellow-400 to-orange-500 border-4 border-yellow-300 shadow-2xl max-w-md mx-4">
              <div className="text-center space-y-4">
                <div className="text-6xl">🎉</div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">WINNER!</h2>
                  <h3 className="text-2xl font-semibold text-yellow-900">{winner.name}</h3>
                </div>
                <div className="bg-white/20 rounded-lg p-4">
                  <p className="text-yellow-900 font-semibold">Won</p>
                  <p className="text-4xl font-bold text-white">{winner.amount.toFixed(3)} ETH</p>
                </div>
                <div className="bg-white/20 rounded-lg p-3">
                  <p className="text-yellow-900 text-sm">{winner.method}</p>
                </div>
                <div className="text-white text-sm">New hand starting in 4 seconds...</div>
              </div>
            </Card>
          </div>
        )}

        {!isConnected ? (
          /* Wallet Selection */
          <Card className="p-8 text-center bg-slate-800/50 border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-4">Choose Your Wallet</h2>
            <p className="text-gray-300 mb-8">Connect your Coinbase wallet or use our simulation wallet for testing</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <Card className="p-6 bg-slate-700/50 border-slate-600 hover:border-blue-500 transition-colors">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto">
                    <Wallet className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Coinbase Wallet</h3>
                    <p className="text-gray-300 text-sm mb-4">
                      Connect your real Coinbase wallet to play with actual cryptocurrency
                    </p>
                  </div>
                  <Button
                    onClick={async () => {
                      const success = await connectRealWallet()
                      if (!success) {
                        alert("Failed to connect wallet. Please make sure you have Coinbase Wallet installed.")
                      }
                    }}
                    disabled={isConnecting}
                    size="lg"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isConnecting ? "Connecting..." : "Connect Coinbase Wallet"}
                  </Button>
                </div>
              </Card>

              <Card className="p-6 bg-slate-700/50 border-slate-600 hover:border-yellow-500 transition-colors">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-yellow-600 rounded-full flex items-center justify-center mx-auto">
                    <TestTube className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Simulation Wallet</h3>
                    <p className="text-gray-300 text-sm mb-4">
                      Perfect for testing. Play with simulated funds without real money
                    </p>
                  </div>
                  <Button
                    onClick={connectSimulationWallet}
                    disabled={isConnecting}
                    size="lg"
                    className="w-full bg-yellow-600 hover:bg-yellow-700"
                  >
                    {isConnecting ? "Setting up..." : "Use Simulation Wallet"}
                  </Button>
                </div>
              </Card>
            </div>
          </Card>
        ) : gameState.gamePhase === "ready" ? (
          /* Start Game Screen */
          <Card className="p-8 text-center bg-slate-800/50 border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-4">Ready to Start</h2>
            <p className="text-gray-300 mb-6">Players are seated. Let's deal the cards and begin playing!</p>
            <div className="mb-6">
              <div className="flex justify-center space-x-4">
                {gameState.players.map((player) => (
                  <div key={player.id} className="text-center">
                    <Avatar className="w-12 h-12 mx-auto mb-2">
                      <AvatarFallback className={`${player.isHuman ? "bg-blue-600" : "bg-purple-600"} text-white`}>
                        {player.isHuman ? <User size={20} /> : <Bot size={20} />}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-white text-sm">{player.name}</p>
                    <p className="text-yellow-400 text-xs">{player.chips.toFixed(3)} ETH</p>
                  </div>
                ))}
              </div>
            </div>
            <Button onClick={startGame} size="lg" className="bg-purple-600 hover:bg-purple-700">
              <Play className="w-5 h-5 mr-2" />
              Start Game
            </Button>
          </Card>
        ) : (
          /* MAIN POKER GAME */
          <div className="grid grid-cols-12 gap-4">
            {/* Game Status - Top */}
            <div className="col-span-12 grid grid-cols-4 gap-2">
              <Card className="p-2 bg-green-900/20 border-green-600/50">
                <div className="text-green-200 text-center">
                  <h3 className="font-semibold text-sm">Round</h3>
                  <Badge variant="outline" className="text-green-400 border-green-500 text-sm">
                    {gameState.round}
                  </Badge>
                </div>
              </Card>

              <Card className="p-2 bg-yellow-900/20 border-yellow-600/50">
                <div className="text-yellow-200 text-center">
                  <h3 className="font-semibold text-sm">Pot</h3>
                  <p className="text-lg font-bold">{gameState.pot.toFixed(3)} ETH</p>
                </div>
              </Card>

              <Card className="p-2 bg-purple-900/20 border-purple-600/50">
                <div className="text-purple-200 text-center">
                  <h3 className="font-semibold text-sm">Current Bet</h3>
                  <p className="text-lg font-bold">{gameState.currentBet.toFixed(3)} ETH</p>
                </div>
              </Card>

              <Card className="p-2 bg-blue-900/20 border-blue-600/50">
                <div className="text-blue-200 text-center">
                  <h3 className="font-semibold text-sm">Your Chips</h3>
                  <p className="text-lg font-bold">{(humanPlayer?.chips || 0).toFixed(3)} ETH</p>
                </div>
              </Card>
            </div>

            {/* POKER TABLE - LEFT SIDE */}
            <div className="col-span-8">
              <div className="relative w-full max-w-2xl mx-auto">
                <div className="bg-gradient-to-br from-green-700 to-green-800 rounded-full aspect-[4/3] border-4 border-amber-600 shadow-2xl relative overflow-hidden">
                  {/* AI Players - Top positions */}
                  {gameState.players
                    .filter((p) => !p.isHuman)
                    .map((player, index) => {
                      const positions = [
                        { top: "10%", left: "20%" }, // AI 1 - top left
                        { top: "10%", right: "20%" }, // AI 2 - top right
                      ]
                      const pos = positions[index]

                      return (
                        <div key={player.id} className="absolute" style={pos}>
                          <Card className="p-2 bg-slate-800/90 border-slate-600 w-20">
                            <div className="text-center space-y-1">
                              <Avatar className="w-6 h-6 mx-auto">
                                <AvatarFallback className="bg-purple-600 text-white text-xs">
                                  <Bot size={12} />
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-white font-semibold text-xs">{player.name}</p>
                                <p className="text-yellow-400 text-xs">{player.chips.toFixed(1)} ETH</p>
                              </div>
                              <div className="flex justify-center space-x-0.5">
                                {player.hand.map((card, cardIndex) => (
                                  <PokerCard key={cardIndex} card={card} size="xs" faceDown={true} />
                                ))}
                              </div>
                            </div>
                          </Card>

                          {/* Action Display - Positioned to the side to avoid overlap */}
                          {player.lastAction && (
                            <div className="absolute top-0 -right-16 transform">
                              <div
                                className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${getActionColor(player.lastAction)}`}
                              >
                                {player.lastAction}
                                {player.lastActionAmount && player.lastActionAmount > 0 && (
                                  <div className="text-xs">{player.lastActionAmount.toFixed(3)} ETH</div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Current Bet - Only show if different from last action */}
                          {player.currentBet > 0 && !player.lastAction && (
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1">
                              <div className="bg-yellow-500 text-black px-1 py-0.5 rounded text-xs font-bold">
                                Bet: {player.currentBet.toFixed(3)}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}

                  {/* Human Player - Bottom */}
                  {humanPlayer && (
                    <div className="absolute bottom-[10%] left-1/2 transform -translate-x-1/2">
                      <Card className="p-2 bg-slate-800/90 border-blue-600 w-20">
                        <div className="text-center space-y-1">
                          <Avatar className="w-6 h-6 mx-auto">
                            <AvatarFallback className="bg-blue-600 text-white text-xs">
                              <User size={12} />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-white font-semibold text-xs">{humanPlayer.name}</p>
                            <p className="text-yellow-400 text-xs">{humanPlayer.chips.toFixed(1)} ETH</p>
                          </div>
                          <div className="flex justify-center space-x-0.5">
                            {humanPlayer.hand.map((card, cardIndex) => (
                              <PokerCard key={cardIndex} card={card} size="xs" />
                            ))}
                          </div>
                        </div>
                      </Card>

                      {/* Action Display - Positioned above to avoid overlap */}
                      {humanPlayer.lastAction && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -mb-8">
                          <div
                            className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${getActionColor(humanPlayer.lastAction)}`}
                          >
                            {humanPlayer.lastAction}
                            {humanPlayer.lastActionAmount && humanPlayer.lastActionAmount > 0 && (
                              <div className="text-xs">{humanPlayer.lastActionAmount.toFixed(3)} ETH</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Current Bet - Only show if different from last action */}
                      {humanPlayer.currentBet > 0 && !humanPlayer.lastAction && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1">
                          <div className="bg-yellow-500 text-black px-1 py-0.5 rounded text-xs font-bold">
                            Bet: {humanPlayer.currentBet.toFixed(3)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Center - Pot and Community Cards */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="text-center space-y-3">
                      {/* Pot */}
                      <div className="bg-slate-900/80 rounded-lg p-3">
                        <div className="text-yellow-400 text-lg font-bold">💰 {gameState.pot.toFixed(3)} ETH</div>
                      </div>

                      {/* Community Cards */}
                      <div className="flex space-x-1 justify-center">
                        {gameState.communityCards.map((card, index) => (
                          <PokerCard key={index} card={card} size="sm" />
                        ))}
                        {Array.from({ length: 5 - gameState.communityCards.length }).map((_, index) => (
                          <div
                            key={`placeholder-${index}`}
                            className="w-12 h-16 border border-dashed border-gray-500 rounded bg-gray-800/30"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CONTROLS - RIGHT SIDE */}
            <div className="col-span-4 space-y-4">
              {/* Poker Actions - ALWAYS ENABLED FOR TESTING */}
              <Card className="p-4 bg-slate-800/50 border-slate-700">
                <h3 className="text-white font-semibold text-center mb-4">Your Actions</h3>

                <div className="mb-3 text-center">
                  <Badge
                    variant="outline"
                    className={
                      gameState.currentPlayerId === gameState.players.find((p) => p.isHuman)?.id
                        ? "text-green-400 border-green-500"
                        : "text-red-400 border-red-500"
                    }
                  >
                    {gameState.currentPlayerId === gameState.players.find((p) => p.isHuman)?.id
                      ? "YOUR TURN"
                      : "WAITING"}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => {
                      console.log("🔴 FOLD BUTTON CLICKED")
                      handlePokerAction("fold")
                    }}
                    variant="destructive"
                    className="w-full bg-red-600 hover:bg-red-700"
                    size="lg"
                  >
                    Fold
                  </Button>

                  <Button
                    onClick={() => {
                      console.log("⚪ CHECK BUTTON CLICKED")
                      handlePokerAction("check")
                    }}
                    variant="outline"
                    className="w-full border-gray-500 text-white hover:bg-gray-700 bg-slate-700"
                    size="lg"
                  >
                    Check
                  </Button>

                  <Button
                    onClick={() => {
                      console.log("🔵 CALL BUTTON CLICKED")
                      handlePokerAction("call", callAmount)
                    }}
                    variant="outline"
                    className="w-full border-blue-500 text-blue-400 hover:bg-blue-900 bg-slate-700"
                    size="lg"
                  >
                    Call {callAmount.toFixed(3)} ETH
                  </Button>

                  <Button
                    onClick={() => {
                      console.log("🟢 RAISE BUTTON CLICKED")
                      handlePokerAction("raise", gameState.bigBlind * 3)
                    }}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    Raise
                  </Button>

                  <Button
                    onClick={() => {
                      console.log("🟣 ALL-IN BUTTON CLICKED")
                      handlePokerAction("all-in", humanPlayer?.chips)
                    }}
                    className="w-full bg-red-600 hover:bg-red-700"
                    size="lg"
                  >
                    All In ({(humanPlayer?.chips || 0).toFixed(3)} ETH)
                  </Button>
                </div>

                {/* Test button */}
                <div className="mt-4 pt-4 border-t border-slate-600">
                  <Button
                    onClick={() => {
                      console.log("🧪 TEST BUTTON CLICKED")
                      alert("Test button works!")
                      setLastAction("Test button clicked at " + new Date().toLocaleTimeString())
                    }}
                    variant="outline"
                    className="w-full border-yellow-500 text-yellow-400"
                  >
                    🧪 Test Button (Click Me!)
                  </Button>
                </div>
              </Card>

              {/* Game Controls */}
              <Card className="p-4 bg-slate-800/50 border-slate-700">
                <h3 className="text-white font-semibold text-center mb-4">Game Controls</h3>
                <div className="space-y-3">
                  {gameState.players.length > 0 ? (
                    <>
                      <Button onClick={startNewHand} className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        New Hand
                      </Button>
                      <Button
                        onClick={resetGame}
                        variant="outline"
                        className="w-full border-gray-500 text-gray-400 bg-transparent"
                        size="lg"
                      >
                        Leave Game
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={initializeGame} className="w-full bg-green-600 hover:bg-green-700" size="lg">
                        <Play className="w-4 h-4 mr-2" />
                        Start New Game
                      </Button>
                      <Button
                        onClick={resetGame}
                        variant="outline"
                        className="w-full border-gray-500 text-gray-400 bg-transparent"
                        size="lg"
                      >
                        Back to Lobby
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
