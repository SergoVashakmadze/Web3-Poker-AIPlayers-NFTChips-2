"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PlayerPosition } from "@/components/player-position"
import { PokerCard } from "@/components/poker-card"
import { ChipStack } from "@/components/chip-stack"
import { useAIPlayer } from "@/hooks/use-ai-player"
import type { GameState, PokerAction } from "@/types/poker"
import { Play, RotateCcw } from "lucide-react"

interface PokerTableProps {
  gameState: GameState
  onAction: (action: PokerAction, amount?: number) => void
  onStartGame: () => void
  onNextHand: () => void
}

export function PokerTable({ gameState, onAction, onStartGame, onNextHand }: PokerTableProps) {
  const [betAmount, setBetAmount] = useState(gameState.bigBlind * 2)
  const [showBetSlider, setShowBetSlider] = useState(false)
  const { processAITurn } = useAIPlayer()

  const currentPlayer = gameState.players.find((p) => p.id === gameState.currentPlayerId)
  const humanPlayer = gameState.players.find((p) => p.isHuman)
  const isPlayerTurn = currentPlayer?.isHuman && gameState.gamePhase === "betting"

  const minRaise = Math.max(gameState.currentBet * 2, gameState.bigBlind)
  const maxRaise = humanPlayer?.chips || 0

  // Handle AI turns
  useEffect(() => {
    if (currentPlayer && !currentPlayer.isHuman && gameState.gamePhase === "betting") {
      const timer = setTimeout(
        () => {
          processAITurn(gameState, onAction)
        },
        1500 + Math.random() * 1000,
      )
      return () => clearTimeout(timer)
    }
  }, [currentPlayer, gameState, processAITurn, onAction])

  // Using the working button structure
  const handleAction = (action: PokerAction, amount?: number) => {
    console.log("=== POKER TABLE BUTTON CLICKED ===")
    console.log("Action:", action, "Amount:", amount)

    // Immediate feedback like working buttons
    alert(`Button clicked: ${action} ${amount ? `(${amount} ETH)` : ""}`)

    onAction(action, amount)
    setShowBetSlider(false)
    setBetAmount(gameState.bigBlind * 2)
  }

  const canCheck = gameState.currentBet === (humanPlayer?.currentBet || 0)
  const callAmount = gameState.currentBet - (humanPlayer?.currentBet || 0)

  if (gameState.gamePhase === "waiting") {
    return (
      <Card className="p-8 text-center bg-slate-800/50 border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-4">Ready to Play?</h2>
        <p className="text-gray-300 mb-6">Start a new poker game with AI opponents</p>
        <Button onClick={onStartGame} size="lg" className="bg-green-600 hover:bg-green-700">
          <Play className="w-5 h-5 mr-2" />
          Start Game
        </Button>
      </Card>
    )
  }

  return (
    <div className="relative">
      {/* Game Status Bar */}
      <Card className="mb-6 p-4 bg-slate-800/50 border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div>
              <span className="text-gray-300 text-sm">Round:</span>
              <Badge variant="outline" className="ml-2 text-white border-purple-500">
                {gameState.round.charAt(0).toUpperCase() + gameState.round.slice(1)}
              </Badge>
            </div>
            <div>
              <span className="text-gray-300 text-sm">Phase:</span>
              <Badge variant="outline" className="ml-2 text-white border-blue-500">
                {gameState.gamePhase.charAt(0).toUpperCase() + gameState.gamePhase.slice(1)}
              </Badge>
            </div>
            <div>
              <span className="text-gray-300 text-sm">Current Bet:</span>
              <span className="ml-2 text-yellow-400 font-bold">{gameState.currentBet} ETH</span>
            </div>
          </div>

          {gameState.gamePhase === "showdown" && (
            <Button onClick={onNextHand} className="bg-purple-600 hover:bg-purple-700">
              <RotateCcw className="w-4 h-4 mr-2" />
              Next Hand
            </Button>
          )}
        </div>
      </Card>

      {/* Poker Table */}
      <div className="relative w-full max-w-6xl mx-auto">
        <div className="bg-gradient-to-br from-green-800 to-green-900 rounded-full p-8 border-8 border-amber-600 shadow-2xl">
          {/* Table Center - Community Cards & Pot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="flex justify-center space-x-2 mb-4">
                {gameState.communityCards.map((card, index) => (
                  <PokerCard key={index} card={card} />
                ))}
                {/* Placeholder cards for future rounds */}
                {Array.from({ length: 5 - gameState.communityCards.length }).map((_, index) => (
                  <div
                    key={`placeholder-${index}`}
                    className="w-16 h-24 border-2 border-dashed border-gray-500 rounded-lg bg-gray-800/30"
                  />
                ))}
              </div>
              <div className="bg-slate-900/80 rounded-lg p-4">
                <p className="text-white text-sm">Total Pot</p>
                <div className="flex items-center justify-center space-x-2">
                  <ChipStack amount={gameState.pot} size="sm" />
                  <span className="text-2xl font-bold text-yellow-400">{gameState.pot} ETH</span>
                </div>
              </div>
            </div>
          </div>

          {/* Player Positions */}
          <div className="relative w-full h-96">
            {gameState.players.map((player, index) => (
              <PlayerPosition
                key={player.id}
                player={player}
                position={index}
                totalPlayers={gameState.players.length}
                isCurrentPlayer={player.id === gameState.currentPlayerId}
                isAIThinking={
                  !player.isHuman && player.id === gameState.currentPlayerId && gameState.gamePhase === "betting"
                }
                gamePhase={gameState.gamePhase}
              />
            ))}
          </div>
        </div>

        {/* Game Info Cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-slate-800/50 border-slate-700">
            <h3 className="text-white font-semibold mb-2">Your Hand</h3>
            <div className="flex justify-center space-x-2 mb-3">
              {humanPlayer?.hand.map((card, index) => (
                <PokerCard key={index} card={card} size="sm" />
              ))}
            </div>
            {humanPlayer?.handStrength && gameState.gamePhase === "showdown" && (
              <div className="text-center">
                <Badge variant="outline" className="text-purple-400 border-purple-500">
                  {humanPlayer.handStrength.name}
                </Badge>
              </div>
            )}
          </Card>

          <Card className="p-4 bg-slate-800/50 border-slate-700">
            <h3 className="text-white font-semibold mb-2">Your Chips</h3>
            <div className="text-center">
              <ChipStack amount={humanPlayer?.chips || 0} size="md" />
              <p className="text-2xl font-bold text-yellow-400 mt-2">{humanPlayer?.chips || 0} ETH</p>
              <p className="text-sm text-gray-300">Bet: {humanPlayer?.currentBet || 0} ETH</p>
            </div>
          </Card>

          <Card className="p-4 bg-slate-800/50 border-slate-700">
            <h3 className="text-white font-semibold mb-2">Game Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Small Blind:</span>
                <span className="text-white">{gameState.smallBlind} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Big Blind:</span>
                <span className="text-white">{gameState.bigBlind} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Players:</span>
                <span className="text-white">{gameState.players.filter((p) => p.status !== "out").length}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Action Buttons - Using the exact working button structure */}
        {isPlayerTurn && (
          <Card className="mt-6 p-6 bg-slate-800/50 border-slate-700">
            <h3 className="text-white font-semibold mb-4">Your Turn</h3>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  console.log("FOLD CLICKED")
                  alert("Fold clicked!")
                  onAction("fold")
                }}
                variant="destructive"
                size="lg"
                className="bg-red-600 hover:bg-red-700"
              >
                Fold
              </Button>

              {canCheck ? (
                <Button
                  onClick={() => {
                    console.log("CHECK CLICKED")
                    alert("Check clicked!")
                    onAction("check")
                  }}
                  variant="outline"
                  size="lg"
                  className="border-gray-500 text-white hover:bg-gray-700 bg-slate-700"
                >
                  Check
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    console.log("CALL CLICKED")
                    alert("Call clicked!")
                    onAction("call")
                  }}
                  variant="outline"
                  size="lg"
                  className="border-blue-500 text-blue-400 hover:bg-blue-900 bg-slate-700"
                >
                  Call {callAmount.toFixed(3)} ETH
                </Button>
              )}

              <Button
                onClick={() => {
                  console.log("RAISE CLICKED")
                  alert("Raise clicked!")
                  onAction("raise", gameState.bigBlind * 3)
                }}
                className="bg-green-600 hover:bg-green-700"
                size="lg"
              >
                Raise
              </Button>

              <Button
                onClick={() => {
                  console.log("ALL IN CLICKED")
                  alert("All In clicked!")
                  onAction("all-in")
                }}
                className="bg-red-600 hover:bg-red-700"
                size="lg"
              >
                All In ({(humanPlayer?.chips || 0).toFixed(3)} ETH)
              </Button>
            </div>

            {/* Test button to verify onClick works */}
            <div className="mt-4 pt-4 border-t border-slate-600">
              <Button
                onClick={() => {
                  console.log("TEST BUTTON CLICKED")
                  alert("Test button works in poker table!")
                }}
                variant="outline"
                className="border-green-500 text-green-400"
              >
                Test Button
              </Button>
            </div>
          </Card>
        )}

        {/* Last Action Display */}
        {gameState.lastAction && (
          <Card className="mt-4 p-3 bg-slate-700/50 border-slate-600">
            <p className="text-center text-gray-300">
              <span className="text-white font-semibold">
                {gameState.players.find((p) => p.id === gameState.lastAction?.playerId)?.name}
              </span>{" "}
              <span className="text-yellow-400">{gameState.lastAction.action}</span>
              {gameState.lastAction.amount > 0 && (
                <span className="text-green-400"> {gameState.lastAction.amount} ETH</span>
              )}
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
