"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChipStack } from "@/components/chip-stack"
import { useNFTChips } from "@/hooks/use-nft-chips"
import { Coins, TrendingUp, ArrowUpDown, Plus } from "lucide-react"

export function ChipTrading() {
  const { nftChips, createChip, tradeChip, loading } = useNFTChips()
  const [mintAmount, setMintAmount] = useState("")
  const [tradeAmount, setTradeAmount] = useState("")

  const handleMintChip = async () => {
    if (!mintAmount) return
    await createChip(Number.parseFloat(mintAmount))
    setMintAmount("")
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-slate-800/50 border-slate-700">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <Coins className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">NFT Poker Chips</h2>
            <p className="text-gray-300">Mint, trade, and manage your unique poker chips</p>
          </div>
        </div>

        <Tabs defaultValue="mint" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-700/50">
            <TabsTrigger value="mint" className="text-white data-[state=active]:bg-purple-600">
              Mint Chips
            </TabsTrigger>
            <TabsTrigger value="collection" className="text-white data-[state=active]:bg-purple-600">
              My Collection
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="text-white data-[state=active]:bg-purple-600">
              Marketplace
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mint" className="mt-6">
            <Card className="p-6 bg-slate-700/30 border-slate-600">
              <h3 className="text-xl font-semibold text-white mb-4">Mint New NFT Chips</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Chip Value (ETH)</label>
                  <Input
                    type="number"
                    placeholder="0.1"
                    value={mintAmount}
                    onChange={(e) => setMintAmount(e.target.value)}
                    className="bg-slate-800 border-slate-600 text-white"
                  />
                </div>
                <Button
                  onClick={handleMintChip}
                  disabled={loading || !mintAmount}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Mint NFT Chip
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="collection" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nftChips.map((chip) => (
                <Card key={chip.id} className="p-4 bg-slate-700/30 border-slate-600">
                  <div className="text-center space-y-3">
                    <ChipStack amount={chip.value} size="lg" />
                    <div>
                      <h4 className="text-white font-semibold">Chip #{chip.id}</h4>
                      <p className="text-yellow-400 font-bold">{chip.value} ETH</p>
                    </div>
                    <div className="flex space-x-2">
                      <Badge variant="outline" className="text-purple-400 border-purple-500">
                        {chip.rarity}
                      </Badge>
                      <Badge variant="outline" className="text-green-400 border-green-500">
                        Tradeable
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-blue-500 text-blue-400 hover:bg-blue-900 bg-transparent"
                    >
                      <ArrowUpDown className="w-4 h-4 mr-2" />
                      Trade
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="marketplace" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Mock marketplace items */}
              {[
                { id: 1, value: 0.5, price: 0.6, seller: "0x1234...5678", rarity: "Rare" },
                { id: 2, value: 1.0, price: 1.2, seller: "0x8765...4321", rarity: "Epic" },
                { id: 3, value: 0.25, price: 0.3, seller: "0xabcd...efgh", rarity: "Common" },
              ].map((item) => (
                <Card key={item.id} className="p-4 bg-slate-700/30 border-slate-600">
                  <div className="text-center space-y-3">
                    <ChipStack amount={item.value} size="lg" />
                    <div>
                      <h4 className="text-white font-semibold">Chip #{item.id}</h4>
                      <p className="text-yellow-400 font-bold">Value: {item.value} ETH</p>
                      <p className="text-green-400 font-semibold">Price: {item.price} ETH</p>
                    </div>
                    <div className="flex justify-center space-x-2">
                      <Badge variant="outline" className="text-purple-400 border-purple-500">
                        {item.rarity}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400">Seller: {item.seller}</p>
                    <Button size="sm" className="w-full bg-green-600 hover:bg-green-700">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Buy Now
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
