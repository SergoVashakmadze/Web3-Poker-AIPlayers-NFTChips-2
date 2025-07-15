"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PokerCard } from "@/components/poker-card"
import { ChipStack } from "@/components/chip-stack"
import type { Player } from "@/types/poker"
import { Bot, User, Crown, Timer } from "lucide-react"

interface PlayerPositionProps {
  player: Player
  position: number
  totalPlayers: number
  isCurrentPlayer: boolean
  isAIThinking?: boolean
  gamePhase: string
}

export function PlayerPosition({
  player,
  position,
  totalPlayers,
  isCurrentPlayer,
  isAIThinking,
  gamePhase,
}: PlayerPositionProps) {
  // Calculate position around the table
  const angle = (position * 360) / totalPlayers
  const radius = 180
  const x = Math.cos(((angle - 90) * Math.PI) / 180) * radius
  const y = Math.sin(((angle - 90) * Math.PI) / 180) * radius

  const getStatusColor = () => {
    switch (player.status) {
      case "folded":
        return "border-red-500"
      case "all-in":
        return "border-purple-500"
      case "out":
        return "border-gray-500"
      default:
        return isCurrentPlayer ? "border-yellow-400 shadow-lg shadow-yellow-400/50" : "border-slate-600"
    }
  }

  const getStatusBadge = () => {
    if (player.status === "folded")
      return (
        <Badge variant="destructive" className="text-xs">
          Folded
        </Badge>
      )
    if (player.status === "all-in") return <Badge className="text-xs bg-purple-600">All In</Badge>
    if (player.status === "out")
      return (
        <Badge variant="secondary" className="text-xs">
          Out
        </Badge>
      )
    return null
  }

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
      }}
    >
      <Card className={`p-3 bg-slate-800/90 border-2 transition-all duration-300 ${getStatusColor()}`}>
        <div className="text-center space-y-2">
          {/* Player Avatar */}
          <div className="relative">
            <Avatar className="w-12 h-12 mx-auto">
              <AvatarFallback className={`${player.isHuman ? "bg-blue-600" : "bg-purple-600"} text-white`}>
                {player.isHuman ? <User size={20} /> : <Bot size={20} />}
              </AvatarFallback>
            </Avatar>
            {player.isDealer && <Crown className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400" />}
            {isAIThinking && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse">
                <Timer className="w-2 h-2 text-white" />
              </div>
            )}
          </div>

          {/* Player Name */}
          <div>
            <p className="text-white font-semibold text-sm">{player.name}</p>
            <div className="flex justify-center space-x-1">
              <Badge
                variant="outline"
                className={`text-xs ${
                  player.isHuman ? "border-blue-500 text-blue-400" : "border-purple-500 text-purple-400"
                }`}
              >
                {player.isHuman ? "Human" : "AI"}
              </Badge>
              {getStatusBadge()}
            </div>
          </div>

          {/* Player Cards */}
          {player.hand.length > 0 && (
            <div className="flex justify-center space-x-1">
              {player.hand.map((card, index) => (
                <PokerCard
                  key={index}
                  card={card}
                  size="xs"
                  faceDown={!player.isHuman && !player.showCards && gamePhase !== "showdown"}
                />
              ))}
            </div>
          )}

          {/* Hand Strength (shown during showdown) */}
          {player.handStrength && gamePhase === "showdown" && (
            <Badge variant="outline" className="text-xs text-purple-400 border-purple-500">
              {player.handStrength.name}
            </Badge>
          )}

          {/* Chips */}
          <div className="space-y-1">
            <ChipStack amount={player.chips} size="xs" />
            <p className="text-yellow-400 font-bold text-xs">{player.chips} ETH</p>
          </div>

          {/* Current Bet */}
          {player.currentBet > 0 && (
            <div className="bg-green-600 rounded px-2 py-1">
              <p className="text-white text-xs font-semibold">Bet: {player.currentBet} ETH</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
