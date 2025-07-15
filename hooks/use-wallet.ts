"use client"

import { useState, useEffect } from "react"

interface WalletState {
  isConnected: boolean
  address: string | null
  balance: string
  network: string
  isSimulated: boolean
}

export function useWallet() {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    balance: "0.0",
    network: "Base Testnet",
    isSimulated: false,
  })

  const [isConnecting, setIsConnecting] = useState(false)

  // Generate a random wallet address for simulation
  const generateSimulatedAddress = () => {
    const chars = "0123456789abcdef"
    let address = "0x"
    for (let i = 0; i < 40; i++) {
      address += chars[Math.floor(Math.random() * chars.length)]
    }
    return address
  }

  // Generate random balance between 1-10 ETH
  const generateSimulatedBalance = () => {
    return (1 + Math.random() * 9).toFixed(3)
  }

  const connectRealWallet = async () => {
    setIsConnecting(true)

    try {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const accounts = await (window as any).ethereum.request({
          method: "eth_requestAccounts",
        })

        if (accounts.length > 0) {
          // Get balance
          const balance = await (window as any).ethereum.request({
            method: "eth_getBalance",
            params: [accounts[0], "latest"],
          })

          // Convert from wei to ETH (simplified)
          const ethBalance = (Number.parseInt(balance, 16) / 1e18).toFixed(3)

          setWalletState({
            isConnected: true,
            address: accounts[0],
            balance: ethBalance,
            network: "Base Mainnet",
            isSimulated: false,
          })

          localStorage.setItem("wallet_connected", "true")
          localStorage.setItem("wallet_address", accounts[0])
          localStorage.setItem("wallet_balance", ethBalance)
          localStorage.setItem("wallet_simulated", "false")

          setIsConnecting(false)
          return true
        }
      } else {
        throw new Error("No wallet detected")
      }
    } catch (error) {
      console.error("Real wallet connection failed:", error)
      setIsConnecting(false)
      return false
    }

    setIsConnecting(false)
    return false
  }

  const connectSimulationWallet = async () => {
    setIsConnecting(true)

    // Simulate connection delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const simulatedAddress = generateSimulatedAddress()
    const simulatedBalance = generateSimulatedBalance()

    setWalletState({
      isConnected: true,
      address: simulatedAddress,
      balance: simulatedBalance,
      network: "Base Testnet (Simulated)",
      isSimulated: true,
    })

    // Store in localStorage for persistence
    localStorage.setItem("wallet_connected", "true")
    localStorage.setItem("wallet_address", simulatedAddress)
    localStorage.setItem("wallet_balance", simulatedBalance)
    localStorage.setItem("wallet_simulated", "true")

    setIsConnecting(false)
  }

  const disconnectWallet = () => {
    setWalletState({
      isConnected: false,
      address: null,
      balance: "0.0",
      network: "Base Testnet",
      isSimulated: false,
    })

    // Clear localStorage
    localStorage.removeItem("wallet_connected")
    localStorage.removeItem("wallet_address")
    localStorage.removeItem("wallet_balance")
    localStorage.removeItem("wallet_simulated")
  }

  const addFunds = (amount: number) => {
    if (walletState.isSimulated) {
      const newBalance = (Number.parseFloat(walletState.balance) + amount).toFixed(3)
      setWalletState((prev) => ({ ...prev, balance: newBalance }))
      localStorage.setItem("wallet_balance", newBalance)
    }
  }

  const spendFunds = (amount: number) => {
    if (walletState.isSimulated) {
      const newBalance = Math.max(0, Number.parseFloat(walletState.balance) - amount).toFixed(3)
      setWalletState((prev) => ({ ...prev, balance: newBalance }))
      localStorage.setItem("wallet_balance", newBalance)
    }
  }

  // Restore wallet state from localStorage on mount
  useEffect(() => {
    const connected = localStorage.getItem("wallet_connected")
    const address = localStorage.getItem("wallet_address")
    const balance = localStorage.getItem("wallet_balance")
    const simulated = localStorage.getItem("wallet_simulated")

    if (connected === "true" && address && balance) {
      setWalletState({
        isConnected: true,
        address,
        balance,
        network: simulated === "true" ? "Base Testnet (Simulated)" : "Base Mainnet",
        isSimulated: simulated === "true",
      })
    }
  }, [])

  return {
    isConnected: walletState.isConnected,
    address: walletState.address,
    balance: walletState.balance,
    network: walletState.network,
    isSimulated: walletState.isSimulated,
    isConnecting,
    connectRealWallet,
    connectSimulationWallet,
    disconnectWallet,
    addFunds,
    spendFunds,
  }
}
