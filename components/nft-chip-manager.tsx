"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { usePokerChipContract } from '@/hooks/use-poker-chip-contract'
import { Coins, Plus, Loader2 } from "lucide-react"

export function NFTChipManager() {
  const [mintValue, setMintValue] = useState('0.01')
  const [batchQuantity, setBatchQuantity] = useState(1)

  const {
    detailedChips,
    totalChipValue,
    isLoadingDetails,
    isWritePending,
    isConfirming,
    mintChip,
    batchMintChips,
    formatChipValue,
    getTotalValueFormatted,
    refetchAll,
  } = usePokerChipContract()

  const handleMintChip = async () => {
    try {
      await mintChip(mintValue)
      // Refetch data after successful mint
      setTimeout(() => refetchAll(), 2000)
    } catch (error) {
      console.error('Mint failed:', error)
    }
  }

  const handleBatchMint = async () => {
    try {
      const totalValue = (parseFloat(mintValue) * batchQuantity).toString()
      await batchMintChips(batchQuantity, totalValue)
      setTimeout(() => refetchAll(), 2000)
    } catch (error) {
      console.error('Batch mint failed:', error)
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'legendary':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500'
      case 'epic':
        return 'bg-purple-500/20 text-purple-400 border-purple-500'
      case 'rare':
        return 'bg-blue-500/20 text-blue-400 border-blue-500'
      case 'common':
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* Mint Section */}
      <Card className="p-6 bg-slate-800/50 border-slate-700">
        <h3 className="text-white font-semibold mb-4 flex items-center">
          <Coins className="w-5 h-5 mr-2" />
          Mint NFT Poker Chips
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Single Mint */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-300">Single Chip</h4>
            <div className="flex space-x-2">
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={mintValue}
                onChange={(e) => setMintValue(e.target.value)}
                placeholder="ETH Value"
                className="bg-slate-700 border-slate-600"
              />
              <Button
                onClick={handleMintChip}
                disabled={isWritePending || isConfirming}
                className="bg-green-600 hover:bg-green-700"
              >
                {isWritePending || isConfirming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Mint
              </Button>
            </div>
          </div>

          {/* Batch Mint */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-300">Batch Mint</h4>
            <div className="flex space-x-2">
              <Input
                type="number"
                min="1"
                max="10"
                value={batchQuantity}
                onChange={(e) => setBatchQuantity(parseInt(e.target.value) || 1)}
                placeholder="Quantity"
                className="bg-slate-700 border-slate-600 w-20"
              />
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={mintValue}
                onChange={(e) => setMintValue(e.target.value)}
                placeholder="ETH per chip"
                className="bg-slate-700 border-slate-600"
              />
              <Button
                onClick={handleBatchMint}
                disabled={isWritePending || isConfirming}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isWritePending || isConfirming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Batch
              </Button>
            </div>
            <p className="text-xs text-gray-400">
              Total: {(parseFloat(mintValue) * batchQuantity).toFixed(3)} ETH
            </p>
          </div>
        </div>

        {(isWritePending || isConfirming) && (
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-600/50 rounded">
            <p className="text-blue-400 text-sm flex items-center">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              {isWritePending ? 'Confirm transaction in wallet...' : 'Transaction confirming...'}
            </p>
          </div>
        )}
      </Card>

      {/* Chip Collection */}
      <Card className="p-6 bg-slate-800/50 border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center">
            <Coins className="w-5 h-5 mr-2" />
            Your NFT Chips ({detailedChips.length})
          </h3>
          <div className="text-right">
            <p className="text-sm text-gray-400">Total Value</p>
            <p className="text-lg font-semibold text-yellow-400">
              {getTotalValueFormatted()} ETH
            </p>
          </div>
        </div>

        {isLoadingDetails ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-400">Loading chips...</span>
          </div>
        ) : detailedChips.length === 0 ? (
          <div className="text-center py-8">
            <Coins className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No chips found</p>
            <p className="text-sm text-gray-500">Mint your first chip to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {detailedChips.map((chip) => (
              <Card
                key={chip.tokenId}
                className="p-4 bg-slate-700/50 border-slate-600 hover:border-slate-500 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge
                    variant="outline"
                    className={getRarityColor(chip.rarity)}
                  >
                    {chip.rarity}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={chip.isActive ? "text-green-400 border-green-500" : "text-red-400 border-red-500"}
                  >
                    {chip.isActive ? "Active" : "In Game"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">
                    Chip #{chip.tokenId}
                  </p>
                  <p className="text-lg font-semibold text-yellow-400">
                    {formatChipValue(chip.value)} ETH
                  </p>
                  <p className="text-xs text-gray-400">
                    Created: {new Date(Number(chip.createdAt) * 1000).toLocaleDateString()}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}