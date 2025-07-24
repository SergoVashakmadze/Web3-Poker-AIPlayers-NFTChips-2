"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useConnect, useDisconnect, useAccount, useBalance, useChainId } from 'wagmi'
import { Wallet, ExternalLink, AlertCircle, CheckCircle } from "lucide-react"

interface WalletOption {
  id: string
  name: string
  icon: string
  description: string
}

const walletOptions: WalletOption[] = [
  {
    id: 'injected',
    name: 'MetaMask',
    icon: '🦊',
    description: 'Connect using MetaMask browser extension'
  },
  {
    id: 'coinbaseWallet',
    name: 'Coinbase Wallet',
    icon: '🔵',
    description: 'Connect using Coinbase Wallet'
  },
  {
    id: 'walletConnect',
    name: 'WalletConnect',
    icon: '🔗',
    description: 'Connect using WalletConnect protocol'
  }
]

export function UniversalWalletConnect() {
  const [isOpen, setIsOpen] = useState(false)
  const { connectors, connect, status, error } = useConnect()
  const { disconnect } = useDisconnect()
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { data: balance } = useBalance({ address })

  const handleConnect = async (connectorId: string) => {
    const connector = connectors.find(c => c.id === connectorId)
    if (connector) {
      try {
        await connect({ connector })
        setIsOpen(false)
      } catch (err) {
        console.error('Failed to connect:', err)
      }
    }
  }

  const formatBalance = (balance: any) => {
    if (!balance) return '0.000'
    return parseFloat(balance.formatted).toFixed(3)
  }

  const getNetworkName = (chainId: number) => {
    switch (chainId) {
      case 1: return 'Ethereum'
      case 8453: return 'Base'
      case 84532: return 'Base Sepolia'
      case 11155111: return 'Sepolia'
      default: return `Chain ${chainId}`
    }
  }

  if (isConnected && address) {
    return (
      <Card className="p-4 bg-slate-800/50 border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-green-400 border-green-500">
                  Connected
                </Badge>
                <Badge variant="outline" className="text-blue-400 border-blue-500">
                  {getNetworkName(chainId)}
                </Badge>
              </div>
              <p className="text-sm text-gray-300">
                {address.slice(0, 6)}...{address.slice(-4)}
              </p>
              <p className="text-sm font-semibold text-yellow-400">
                {formatBalance(balance)} ETH
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => disconnect()}
            className="border-gray-500 text-gray-300 hover:bg-gray-700"
          >
            Disconnect
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        size="lg"
        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
      >
        <Wallet className="w-5 h-5 mr-2" />
        Connect Wallet
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Connect Your Wallet</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-gray-300 text-sm">
              Choose your preferred wallet to connect to the Web3 Poker game.
            </p>

            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-900/20 border border-red-600/50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <p className="text-red-400 text-sm">{error.message}</p>
              </div>
            )}

            <div className="space-y-2">
              {walletOptions.map((wallet) => {
                const connector = connectors.find(c => c.id === wallet.id)
                const isConnecting = status === 'pending'
                
                return (
                  <Button
                    key={wallet.id}
                    onClick={() => handleConnect(wallet.id)}
                    disabled={!connector || isConnecting}
                    variant="outline"
                    className="w-full h-auto p-4 border-slate-600 hover:border-slate-500 hover:bg-slate-700/50"
                  >
                    <div className="flex items-center space-x-3 w-full">
                      <div className="text-2xl">{wallet.icon}</div>
                      <div className="text-left flex-1">
                        <div className="font-semibold text-white">{wallet.name}</div>
                        <div className="text-sm text-gray-400">{wallet.description}</div>
                      </div>
                      {!connector && (
                        <div className="text-xs text-gray-500">Not Available</div>
                      )}
                      {isConnecting && (
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                  </Button>
                )
              })}
            </div>

            <div className="pt-4 border-t border-slate-600">
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <ExternalLink className="w-3 h-3" />
                <span>Make sure you're on Base Sepolia testnet (Chain ID: 84532)</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}