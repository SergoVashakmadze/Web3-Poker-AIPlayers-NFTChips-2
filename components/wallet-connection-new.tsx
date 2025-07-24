"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi'
import { usePokerChipContract } from '@/hooks/use-poker-chip-contract'
import { Wallet, Plus, ExternalLink } from "lucide-react"
import { formatEther } from 'viem'

export function WalletConnectionNew() {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  
  const { data: balance } = useBalance({
    address,
  })

  const { 
    totalChipValue, 
    getTotalValueFormatted, 
    mintChip, 
    isWritePending,
    hash 
  } = usePokerChipContract()

  if (!isConnected) {
    return (
      <Card className="p-6 bg-slate-800/50 border-slate-700">
        <h3 className="text-white font-semibold mb-4">Connect Wallet</h3>
        <div className="space-y-3">
          {connectors.map((connector) => (
            <Button
              key={connector.uid}
              onClick={() => connect({ connector })}
              disabled={isPending}
              className="w-full justify-start"
              variant="outline"
            >
              <Wallet className="w-4 h-4 mr-2" />
              {isPending ? 'Connecting...' : `Connect ${connector.name}`}
            </Button>
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 bg-slate-800/50 border-slate-700">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
          <Wallet className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <Badge variant="outline" className="text-green-400 border-green-500">
              Connected
            </Badge>
            <Badge variant="outline" className="text-blue-400 border-blue-500">
              {chain?.name || 'Unknown'}
            </Badge>
          </div>
          <p className="text-sm text-gray-300 mb-1">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-yellow-400">
              {balance ? `${Number(formatEther(balance.value)).toFixed(4)} ETH` : '0 ETH'}
            </span>
            <span className="text-purple-400">
              {getTotalValueFormatted()} ETH in chips
            </span>
          </div>
        </div>
        <div className="flex flex-col space-y-2">
          <Button
            size="sm"
            onClick={() => mintChip('0.01')}
            disabled={isWritePending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-3 h-3 mr-1" />
            Mint Chip
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => disconnect()}
            className="border-gray-500 text-gray-300 hover:bg-gray-700"
          >
            Disconnect
          </Button>
        </div>
      </div>

      {hash && (
        <div className="mt-3 pt-3 border-t border-slate-600">
          <div className="flex items-center space-x-2">
            <p className="text-xs text-gray-400">Last transaction:</p>
            <a
              href={`${chain?.blockExplorers?.default?.url}/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center"
            >
              View on Explorer
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
        </div>
      )}
    </Card>
  )
}