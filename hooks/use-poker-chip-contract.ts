"use client"

import { useState, useEffect } from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { CONTRACTS } from '@/lib/wagmi-config'
import { POKER_CHIP_ABI } from '@/lib/contract-abis'

export interface PokerChip {
  tokenId: number
  value: bigint
  rarity: string
  createdAt: bigint
  isActive: boolean
}

export function usePokerChipContract() {
  const { address } = useAccount()
  const { writeContract, data: hash, error: writeError, isPending: isWritePending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // Read contract functions
  const { data: playerChips, refetch: refetchPlayerChips } = useReadContract({
    address: CONTRACTS.POKER_CHIP as `0x${string}`,
    abi: POKER_CHIP_ABI,
    functionName: 'getPlayerChips',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!CONTRACTS.POKER_CHIP,
    },
  })

  const { data: activeChips, refetch: refetchActiveChips } = useReadContract({
    address: CONTRACTS.POKER_CHIP as `0x${string}`,
    abi: POKER_CHIP_ABI,
    functionName: 'getActiveChips',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!CONTRACTS.POKER_CHIP,
    },
  })

  const { data: totalChipValue, refetch: refetchTotalValue } = useReadContract({
    address: CONTRACTS.POKER_CHIP as `0x${string}`,
    abi: POKER_CHIP_ABI,
    functionName: 'getPlayerChipValue',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!CONTRACTS.POKER_CHIP,
    },
  })

  // State for detailed chip information
  const [detailedChips, setDetailedChips] = useState<PokerChip[]>([])
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  // Fetch detailed chip information
  const fetchChipDetails = async (tokenIds: readonly bigint[]) => {
    if (!tokenIds.length || !CONTRACTS.POKER_CHIP) return []

    setIsLoadingDetails(true)
    try {
      const chipDetails: PokerChip[] = []
      
      for (const tokenId of tokenIds) {
        // This would need to be done with multicall in production for efficiency
        const { data: chipData } = await useReadContract({
          address: CONTRACTS.POKER_CHIP as `0x${string}`,
          abi: POKER_CHIP_ABI,
          functionName: 'getChip',
          args: [tokenId],
        }) as any

        if (chipData) {
          chipDetails.push({
            tokenId: Number(tokenId),
            value: chipData.value,
            rarity: chipData.rarity,
            createdAt: chipData.createdAt,
            isActive: chipData.isActive,
          })
        }
      }
      
      setDetailedChips(chipDetails)
      return chipDetails
    } catch (error) {
      console.error('Error fetching chip details:', error)
      return []
    } finally {
      setIsLoadingDetails(false)
    }
  }

  // Update detailed chips when playerChips changes
  useEffect(() => {
    if (playerChips) {
      fetchChipDetails(playerChips)
    }
  }, [playerChips])

  // Mint functions
  const mintChip = async (value: string) => {
    if (!CONTRACTS.POKER_CHIP) {
      throw new Error('Poker chip contract not configured')
    }

    try {
      await writeContract({
        address: CONTRACTS.POKER_CHIP as `0x${string}`,
        abi: POKER_CHIP_ABI,
        functionName: 'mintChip',
        value: parseEther(value),
      })
    } catch (error) {
      console.error('Error minting chip:', error)
      throw error
    }
  }

  const batchMintChips = async (quantity: number, totalValue: string) => {
    if (!CONTRACTS.POKER_CHIP) {
      throw new Error('Poker chip contract not configured')
    }

    try {
      await writeContract({
        address: CONTRACTS.POKER_CHIP as `0x${string}`,
        abi: POKER_CHIP_ABI,
        functionName: 'batchMintChips',
        args: [BigInt(quantity)],
        value: parseEther(totalValue),
      })
    } catch (error) {
      console.error('Error batch minting chips:', error)
      throw error
    }
  }

  const activateChip = async (tokenId: number) => {
    if (!CONTRACTS.POKER_CHIP) {
      throw new Error('Poker chip contract not configured')
    }

    try {
      await writeContract({
        address: CONTRACTS.POKER_CHIP as `0x${string}`,
        abi: POKER_CHIP_ABI,
        functionName: 'activateChip',
        args: [BigInt(tokenId)],
      })
    } catch (error) {
      console.error('Error activating chip:', error)
      throw error
    }
  }

  const deactivateChip = async (tokenId: number) => {
    if (!CONTRACTS.POKER_CHIP) {
      throw new Error('Poker chip contract not configured')
    }

    try {
      await writeContract({
        address: CONTRACTS.POKER_CHIP as `0x${string}`,
        abi: POKER_CHIP_ABI,
        functionName: 'deactivateChip',
        args: [BigInt(tokenId)],
      })
    } catch (error) {
      console.error('Error deactivating chip:', error)
      throw error
    }
  }

  // Refetch all data
  const refetchAll = () => {
    refetchPlayerChips()
    refetchActiveChips()
    refetchTotalValue()
    if (playerChips) {
      fetchChipDetails(playerChips)
    }
  }

  // Format values for display
  const formatChipValue = (value: bigint) => formatEther(value)
  const getTotalValueFormatted = () => totalChipValue ? formatEther(totalChipValue) : '0'

  return {
    // Data
    playerChips: playerChips as readonly bigint[] | undefined,
    activeChips: activeChips as readonly bigint[] | undefined,
    totalChipValue,
    detailedChips,
    
    // Loading states
    isLoadingDetails,
    isWritePending,
    isConfirming,
    isConfirmed,
    
    // Errors
    writeError,
    
    // Functions
    mintChip,
    batchMintChips,
    activateChip,
    deactivateChip,
    refetchAll,
    
    // Utilities
    formatChipValue,
    getTotalValueFormatted,
    
    // Transaction hash
    hash,
  }
}