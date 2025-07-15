"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useWallet } from "@/hooks/use-wallet"
import { Wallet, Plus, Minus, Zap } from "lucide-react"

export function WalletConnection() {
  const { isConnected, address, balance, network, isSimulated, isConnecting, disconnectWallet, addFunds, spendFunds } =
    useWallet()

  if (!isConnected) {
    return null // Wallet selection is now handled in the main page
  }

  return (
    <Card className="p-4 bg-slate-800/50 border-slate-700">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
          <Wallet className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-green-400 border-green-500">
              Connected
            </Badge>
            {isSimulated ? (
              <Badge variant="outline" className="text-yellow-400 border-yellow-500">
                <Zap className="w-3 h-3 mr-1" />
                Simulated
              </Badge>
            ) : (
              <Badge variant="outline" className="text-blue-400 border-blue-500">
                {network}
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-300">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>
          <div className="flex items-center space-x-2">
            <p className="text-sm font-semibold text-yellow-400">{balance} ETH</p>
            {isSimulated && (
              <div className="flex space-x-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addFunds(1)}
                  className="h-6 w-6 p-0 border-green-500 text-green-400 hover:bg-green-900"
                >
                  <Plus className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => spendFunds(0.5)}
                  className="h-6 w-6 p-0 border-red-500 text-red-400 hover:bg-red-900"
                  disabled={Number.parseFloat(balance) < 0.5}
                >
                  <Minus className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={disconnectWallet}
          className="border-gray-500 text-gray-300 hover:bg-gray-700 bg-transparent"
        >
          Disconnect
        </Button>
      </div>

      {isSimulated && (
        <div className="mt-3 pt-3 border-t border-slate-600">
          <p className="text-xs text-gray-400 mb-2">Simulation Controls:</p>
          <div className="flex space-x-2">
            <Button size="sm" onClick={() => addFunds(5)} className="bg-green-600 hover:bg-green-700 text-xs">
              Add 5 ETH
            </Button>
            <Button size="sm" onClick={() => addFunds(0.1)} className="bg-blue-600 hover:bg-blue-700 text-xs">
              Add 0.1 ETH
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
