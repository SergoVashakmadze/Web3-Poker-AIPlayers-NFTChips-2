"use client"

import { createConfig, http } from 'wagmi'
import { base, baseSepolia, mainnet, sepolia } from 'wagmi/chains'
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors'

// WalletConnect project ID - you'll need to get this from WalletConnect
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'your-project-id'

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia, mainnet, sepolia],
  connectors: [
    injected(),
    coinbaseWallet({
      appName: 'Web3 Poker Game',
      appLogoUrl: '/placeholder-logo.svg',
    }),
    walletConnect({
      projectId,
    }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})

// Contract addresses - will be set after deployment
export const CONTRACTS = {
  POKER_CHIP: process.env.NEXT_PUBLIC_POKER_CHIP_ADDRESS || '',
  POKER_GAME_FACTORY: process.env.NEXT_PUBLIC_POKER_GAME_FACTORY_ADDRESS || '',
} as const

// Default chain for deployment
export const DEFAULT_CHAIN = baseSepolia