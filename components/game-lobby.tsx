"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, Bot, Crown, Play, Plus } from "lucide-react"

interface GameRoom {
  id: string
  name: string
  players: number
  maxPlayers: number
  blinds: string
  buyIn: number
  hasAI: boolean
}

export function GameLobby() {
  const [gameRooms] = useState<GameRoom[]>([
    {
      id: "1",
      name: "Beginner Table",
      players: 3,
      maxPlayers: 6,
      blinds: "0.01/0.02",
      buyIn: 1,
      hasAI: true,
    },
    {
      id: "2",
      name: "High Stakes",
      players: 2,
      maxPlayers: 8,
      blinds: "0.1/0.2",
      buyIn: 10,
      hasAI: true,
    },
    {
      id: "3",
      name: "Tournament",
      players: 8,
      maxPlayers: 10,
      blinds: "0.05/0.1",
      buyIn: 5,
      hasAI: false,
    },
  ])

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-slate-800/50 border-slate-700">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Game Lobby</h2>
            <p className="text-gray-300">Join a poker table or create your own</p>
          </div>
        </div>

        <div className="grid gap-4">
          {gameRooms.map((room) => (
            <Card key={room.id} className="p-4 bg-slate-700/30 border-slate-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">{room.name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-300">
                      <span>Blinds: {room.blinds} ETH</span>
                      <span>Buy-in: {room.buyIn} ETH</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-white font-semibold">
                        {room.players}/{room.maxPlayers}
                      </span>
                      {room.hasAI && (
                        <Badge variant="outline" className="text-purple-400 border-purple-500">
                          <Bot className="w-3 h-3 mr-1" />
                          AI
                        </Badge>
                      )}
                    </div>
                    <div className="flex -space-x-2">
                      {Array.from({ length: Math.min(room.players, 4) }).map((_, i) => (
                        <Avatar key={i} className="w-8 h-8 border-2 border-slate-600">
                          <AvatarFallback className="bg-blue-600 text-white text-xs">
                            {i === 0 ? <Bot size={12} /> : `P${i}`}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {room.players > 4 && (
                        <div className="w-8 h-8 bg-slate-600 rounded-full border-2 border-slate-600 flex items-center justify-center">
                          <span className="text-xs text-white">+{room.players - 4}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button className="bg-green-600 hover:bg-green-700" disabled={room.players >= room.maxPlayers}>
                    <Play className="w-4 h-4 mr-2" />
                    {room.players >= room.maxPlayers ? "Full" : "Join"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-slate-600">
          <Button className="w-full bg-purple-600 hover:bg-purple-700" size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Create New Table
          </Button>
        </div>
      </Card>
    </div>
  )
}
