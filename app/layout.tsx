import type { Metadata } from 'next'
import './globals.css'
import { Web3Provider } from '@/components/providers/web3-provider'

export const metadata: Metadata = {
  title: 'Web3 Poker Game',
  description: 'Decentralized poker game with NFT chips on Base blockchain',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  )
}
