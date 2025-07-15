"use client"

import { Card as UICard } from "@/components/ui/card"
import type { PokerCard as PokerCardType } from "@/types/poker"

interface PokerCardProps {
  card: PokerCardType
  size?: "xs" | "sm" | "md" | "lg"
  faceDown?: boolean
}

export function PokerCard({ card, size = "md", faceDown = false }: PokerCardProps) {
  const sizeClasses = {
    xs: "w-8 h-12",
    sm: "w-12 h-16",
    md: "w-16 h-24",
    lg: "w-20 h-28",
  }

  const textSizes = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  }

  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case "hearts":
        return "♥"
      case "diamonds":
        return "♦"
      case "clubs":
        return "♣"
      case "spades":
        return "♠"
      default:
        return ""
    }
  }

  const getSuitColor = (suit: string) => {
    return suit === "hearts" || suit === "diamonds" ? "text-red-500" : "text-black"
  }

  if (faceDown) {
    return (
      <UICard
        className={`${sizeClasses[size]} bg-gradient-to-br from-blue-800 to-purple-800 border-2 border-blue-600 flex items-center justify-center`}
      >
        <div className="text-white text-center">
          <div className="text-2xl">♠</div>
        </div>
      </UICard>
    )
  }

  return (
    <UICard
      className={`${sizeClasses[size]} bg-white border-2 border-gray-300 flex flex-col justify-between p-1 shadow-lg`}
    >
      <div className={`${textSizes[size]} font-bold ${getSuitColor(card.suit)} text-center`}>
        <div>{card.rank}</div>
        <div>{getSuitSymbol(card.suit)}</div>
      </div>
      <div className={`${textSizes[size]} font-bold ${getSuitColor(card.suit)} text-center rotate-180`}>
        <div>{card.rank}</div>
        <div>{getSuitSymbol(card.suit)}</div>
      </div>
    </UICard>
  )
}
