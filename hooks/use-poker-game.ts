"use client"

import { useState, useCallback, useEffect } from "react"
import type { GameState, Player, PokerAction } from "@/types/poker"
import { evaluateHand, compareHands } from "@/lib/poker-engine"
import { createDeck, shuffleDeck } from "@/lib/deck-utils"
import { useWallet } from "@/hooks/use-wallet"

export function usePokerGame() {
  const { spendFunds, addFunds, isSimulated } = useWallet()

  const [gameState, setGameState] = useState<GameState>({
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

  const initializeGame = useCallback(() => {
    const players: Player[] = [
      {
        id: "player1",
        name: "You",
        chips: 10,
        hand: [],
        currentBet: 0,
        totalBet: 0,
        isHuman: true,
        status: "active",
        isDealer: true, // Human player starts as dealer
        showCards: false,
        position: 0,
        isAllIn: false,
        handStrength: null,
      },
      {
        id: "ai1",
        name: "AI Shark",
        chips: 12,
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
      },
      {
        id: "ai2",
        name: "Poker Bot",
        chips: 8,
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
      },
    ]

    const deck = shuffleDeck(createDeck())

    setGameState({
      players,
      communityCards: [],
      pot: 0,
      currentBet: 0,
      smallBlind: 0.01,
      bigBlind: 0.02,
      round: "pre-flop",
      currentPlayerId: "",
      dealerPosition: 0,
      deck,
      gamePhase: "ready",
      sidePots: [],
      lastAction: null,
      actionHistory: [],
    })

    console.log("Game initialized with players:", players)
  }, [])

  const startNewHand = useCallback(() => {
    setGameState((prev) => {
      const activePlayers = prev.players.filter((p) => p.chips > 0)
      if (activePlayers.length < 2) return prev

      const deck = shuffleDeck(createDeck())
      let deckIndex = 0

      // Deal hole cards
      const playersWithCards = activePlayers.map((player) => ({
        ...player,
        hand: [deck[deckIndex++], deck[deckIndex++]],
        currentBet: 0,
        totalBet: 0,
        status: "active" as const,
        showCards: false,
        isAllIn: false,
        handStrength: null,
      }))

      // Post blinds - small blind is left of dealer, big blind is left of small blind
      let smallBlindIndex = (prev.dealerPosition + 1) % playersWithCards.length
      let bigBlindIndex = (prev.dealerPosition + 2) % playersWithCards.length

      // Handle heads-up (2 players) - dealer posts small blind
      if (playersWithCards.length === 2) {
        smallBlindIndex = prev.dealerPosition
        bigBlindIndex = (prev.dealerPosition + 1) % playersWithCards.length
      }

      playersWithCards[smallBlindIndex].currentBet = prev.smallBlind
      playersWithCards[smallBlindIndex].totalBet = prev.smallBlind
      playersWithCards[smallBlindIndex].chips -= prev.smallBlind

      playersWithCards[bigBlindIndex].currentBet = prev.bigBlind
      playersWithCards[bigBlindIndex].totalBet = prev.bigBlind
      playersWithCards[bigBlindIndex].chips -= prev.bigBlind

      // First to act is left of big blind (or dealer in heads-up after blinds)
      let firstToActIndex = (bigBlindIndex + 1) % playersWithCards.length
      if (playersWithCards.length === 2) {
        firstToActIndex = smallBlindIndex // Dealer acts first in heads-up pre-flop
      }

      const newState = {
        ...prev,
        players: playersWithCards,
        communityCards: [],
        pot: prev.smallBlind + prev.bigBlind,
        currentBet: prev.bigBlind,
        round: "pre-flop" as const,
        currentPlayerId: playersWithCards[firstToActIndex]?.id || "",
        deck: deck.slice(deckIndex),
        gamePhase: "betting" as const,
        actionHistory: [],
        lastAction: null,
      }

      console.log("New hand started:", {
        currentPlayer: newState.currentPlayerId,
        players: newState.players.map((p) => ({ id: p.id, name: p.name, chips: p.chips, currentBet: p.currentBet })),
        pot: newState.pot,
        currentBet: newState.currentBet,
      })

      return newState
    })
  }, [])

  const performAction = useCallback(
    (playerId: string, action: PokerAction, amount?: number) => {
      console.log("=== PERFORM ACTION CALLED ===")
      console.log("Player ID:", playerId)
      console.log("Action:", action)
      console.log("Amount:", amount)

      setGameState((prev) => {
        console.log("=== GAME STATE UPDATE ===")
        console.log("Previous state:", {
          currentPlayerId: prev.currentPlayerId,
          gamePhase: prev.gamePhase,
          players: prev.players.map((p) => ({
            id: p.id,
            name: p.name,
            chips: p.chips,
            currentBet: p.currentBet,
            status: p.status,
          })),
        })

        const playerIndex = prev.players.findIndex((p) => p.id === playerId)
        if (playerIndex === -1) {
          console.log("ERROR: Player not found:", playerId)
          return prev
        }

        if (prev.currentPlayerId !== playerId) {
          console.log("ERROR: Not player's turn")
          console.log("Expected:", prev.currentPlayerId, "Got:", playerId)
          return prev
        }

        if (prev.gamePhase !== "betting") {
          console.log("ERROR: Not in betting phase:", prev.gamePhase)
          return prev
        }

        const newPlayers = [...prev.players]
        const player = { ...newPlayers[playerIndex] }
        let newPot = prev.pot
        let newCurrentBet = prev.currentBet

        console.log("Before action:", {
          player: player.name,
          chips: player.chips,
          currentBet: player.currentBet,
          gameCurrentBet: prev.currentBet,
          action: action,
        })

        // Handle wallet integration for human player
        if (player.isHuman && isSimulated) {
          try {
            switch (action) {
              case "call":
                const callAmount = Math.min(prev.currentBet - player.currentBet, player.chips)
                if (callAmount > 0) {
                  spendFunds(callAmount)
                }
                break
              case "raise":
                const raiseAmount = amount || prev.bigBlind * 2
                const totalRaise = Math.min(raiseAmount, player.chips + player.currentBet)
                const additionalBet = totalRaise - player.currentBet
                if (additionalBet > 0) {
                  spendFunds(additionalBet)
                }
                break
              case "all-in":
                if (player.chips > 0) {
                  spendFunds(player.chips)
                }
                break
            }
          } catch (error) {
            console.log("Wallet error:", error)
          }
        }

        // Process the action
        switch (action) {
          case "fold":
            player.status = "folded"
            console.log("Player folded")
            break

          case "check":
            if (prev.currentBet > player.currentBet) {
              console.log("Cannot check - there's a bet to call")
              return prev
            }
            console.log("Player checked")
            break

          case "call":
            const callAmount = Math.min(prev.currentBet - player.currentBet, player.chips)
            if (callAmount > 0) {
              player.chips -= callAmount
              player.currentBet += callAmount
              player.totalBet += callAmount
              newPot += callAmount
              if (player.chips === 0) player.isAllIn = true
            }
            console.log("Player called:", callAmount)
            break

          case "raise":
            const raiseAmount = amount || prev.bigBlind * 2
            const totalRaise = Math.min(raiseAmount, player.chips + player.currentBet)
            const additionalBet = totalRaise - player.currentBet
            if (additionalBet > 0) {
              player.chips -= additionalBet
              player.currentBet = totalRaise
              player.totalBet += additionalBet
              newPot += additionalBet
              newCurrentBet = totalRaise
              if (player.chips === 0) player.isAllIn = true
            }
            console.log("Player raised to:", totalRaise)
            break

          case "all-in":
            const allInAmount = player.chips
            if (allInAmount > 0) {
              player.chips = 0
              player.currentBet += allInAmount
              player.totalBet += allInAmount
              newPot += allInAmount
              player.isAllIn = true
              if (player.currentBet > newCurrentBet) {
                newCurrentBet = player.currentBet
              }
            }
            console.log("Player went all-in:", allInAmount)
            break

          default:
            console.log("Unknown action:", action)
            return prev
        }

        newPlayers[playerIndex] = player

        console.log("After action:", {
          player: player.name,
          chips: player.chips,
          currentBet: player.currentBet,
          status: player.status,
          newPot: newPot,
          newCurrentBet: newCurrentBet,
        })

        // Find next active player
        const currentIndex = newPlayers.findIndex((p) => p.id === prev.currentPlayerId)
        let nextPlayerIndex = (currentIndex + 1) % newPlayers.length
        let attempts = 0

        while (attempts < newPlayers.length) {
          const nextPlayer = newPlayers[nextPlayerIndex]
          if (nextPlayer.status === "active" && !nextPlayer.isAllIn) {
            break
          }
          nextPlayerIndex = (nextPlayerIndex + 1) % newPlayers.length
          attempts++
        }

        // Check if betting round is complete
        const bettingComplete = checkBettingComplete(newPlayers, newCurrentBet)
        const nextPlayerId = bettingComplete ? "" : newPlayers[nextPlayerIndex]?.id || ""

        console.log("Next player:", nextPlayerId, "Betting complete:", bettingComplete)

        const actionHistory = [...prev.actionHistory, { playerId, action, amount: amount || 0, timestamp: Date.now() }]

        const newState = {
          ...prev,
          players: newPlayers,
          pot: newPot,
          currentBet: newCurrentBet,
          currentPlayerId: nextPlayerId,
          lastAction: { playerId, action, amount },
          actionHistory,
          gamePhase: bettingComplete ? "transition" : "betting",
        }

        console.log("New state:", {
          currentPlayerId: newState.currentPlayerId,
          gamePhase: newState.gamePhase,
          pot: newState.pot,
          currentBet: newState.currentBet,
        })

        return newState
      })
    },
    [spendFunds, isSimulated],
  )

  const checkBettingComplete = (players: Player[], currentBet: number): boolean => {
    const activePlayers = players.filter((p) => p.status === "active")
    const playersInHand = activePlayers.filter((p) => p.status !== "folded")

    console.log("Checking betting complete:", {
      activePlayers: activePlayers.length,
      playersInHand: playersInHand.length,
      currentBet,
    })

    if (playersInHand.length <= 1) return true

    const playersCanAct = activePlayers.filter((p) => !p.isAllIn && p.status === "active")
    if (playersCanAct.length === 0) return true

    // Check if all active players have matched the current bet
    const allMatched = playersCanAct.every((p) => p.currentBet === currentBet)

    console.log(
      "Players can act:",
      playersCanAct.map((p) => ({
        name: p.name,
        currentBet: p.currentBet,
        needsToMatch: currentBet,
      })),
    )
    console.log("All matched:", allMatched)

    return allMatched
  }

  const advanceToNextRound = useCallback(() => {
    setGameState((prev) => {
      const playersInHand = prev.players.filter((p) => p.status !== "folded")
      if (playersInHand.length <= 1) {
        return handleShowdown(prev)
      }

      let newRound: GameState["round"]
      let newCommunityCards = [...prev.communityCards]
      let deckIndex = 0

      switch (prev.round) {
        case "pre-flop":
          newRound = "flop"
          newCommunityCards = [...newCommunityCards, ...prev.deck.slice(0, 3)]
          deckIndex = 3
          break
        case "flop":
          newRound = "turn"
          newCommunityCards = [...newCommunityCards, prev.deck[0]]
          deckIndex = 1
          break
        case "turn":
          newRound = "river"
          newCommunityCards = [...newCommunityCards, prev.deck[0]]
          deckIndex = 1
          break
        case "river":
          return handleShowdown(prev)
        default:
          return prev
      }

      // Reset betting for new round
      const newPlayers = prev.players.map((p) => ({
        ...p,
        currentBet: 0,
      }))

      // First to act post-flop is first active player left of dealer
      let firstToActIndex = (prev.dealerPosition + 1) % newPlayers.length
      while (newPlayers[firstToActIndex].status !== "active" || newPlayers[firstToActIndex].isAllIn) {
        firstToActIndex = (firstToActIndex + 1) % newPlayers.length
      }

      return {
        ...prev,
        players: newPlayers,
        communityCards: newCommunityCards,
        round: newRound,
        currentBet: 0,
        currentPlayerId: newPlayers[firstToActIndex]?.id || "",
        deck: prev.deck.slice(deckIndex),
        gamePhase: "betting",
      }
    })
  }, [])

  const handleShowdown = (gameState: GameState): GameState => {
    const playersInHand = gameState.players.filter((p) => p.status !== "folded")

    if (playersInHand.length === 1) {
      // Single winner
      const winner = playersInHand[0]
      const newPlayers = gameState.players.map((p) => {
        if (p.id === winner.id) {
          const winnings = gameState.pot
          if (p.isHuman && isSimulated) {
            addFunds(winnings)
          }
          return { ...p, chips: p.chips + winnings }
        }
        return p
      })

      return {
        ...gameState,
        players: newPlayers,
        pot: 0,
        gamePhase: "showdown",
        currentPlayerId: "",
      }
    }

    // Evaluate hands and determine winner(s)
    const playersWithHands = playersInHand.map((player) => ({
      ...player,
      handStrength: evaluateHand([...player.hand, ...gameState.communityCards]),
      showCards: true,
    }))

    playersWithHands.sort((a, b) => compareHands(b.handStrength!, a.handStrength!))

    const winner = playersWithHands[0]
    const newPlayers = gameState.players.map((p) => {
      const playerWithHand = playersWithHands.find((ph) => ph.id === p.id)
      if (playerWithHand) {
        if (p.id === winner.id) {
          const winnings = gameState.pot
          if (p.isHuman && isSimulated) {
            addFunds(winnings)
          }
          return { ...playerWithHand, chips: p.chips + winnings }
        }
        return playerWithHand
      }
      return p
    })

    return {
      ...gameState,
      players: newPlayers,
      pot: 0,
      gamePhase: "showdown",
      currentPlayerId: "",
    }
  }

  const joinGame = useCallback(() => {
    setIsInGame(true)
    initializeGame()
  }, [initializeGame])

  const leaveGame = useCallback(() => {
    setIsInGame(false)
    setGameState((prev) => ({ ...prev, gamePhase: "waiting" }))
  }, [])

  const startGame = useCallback(() => {
    startNewHand()
  }, [startNewHand])

  const nextHand = useCallback(() => {
    setGameState((prev) => {
      const newDealerPosition = (prev.dealerPosition + 1) % prev.players.length
      const newPlayers = prev.players.map((p, i) => ({
        ...p,
        isDealer: i === newDealerPosition,
      }))

      return {
        ...prev,
        players: newPlayers,
        dealerPosition: newDealerPosition,
        gamePhase: "ready",
      }
    })
  }, [])

  // Auto-advance game phases
  useEffect(() => {
    if (gameState.gamePhase === "transition") {
      const timer = setTimeout(() => {
        advanceToNextRound()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [gameState.gamePhase, advanceToNextRound])

  return {
    gameState,
    isInGame,
    joinGame,
    leaveGame,
    startGame,
    performAction,
    nextHand,
  }
}
