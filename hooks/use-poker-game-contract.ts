"use client"

import { useState, useEffect } from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { CONTRACTS } from '@/lib/wagmi-config'
import { POKER_GAME_ABI, POKER_GAME_FACTORY_ABI } from '@/lib/contract-abis'

export interface GameInfo {
  gameContract: string
  creator: string
  smallBlind: bigint
  bigBlind: bigint
  maxPlayers: bigint
  createdAt: bigint
  isActive: boolean
  isPrivate: boolean
}

export interface GameState {
  pot: bigint
  currentBet: bigint
  phase: number // 0: WAITING, 1: ACTIVE, 2: FINISHED
  round: number // 0: PRE_FLOP, 1: FLOP, 2: TURN, 3: RIVER, 4: SHOWDOWN
  currentPlayer: string
  players: readonly string[]
}

export interface PlayerStatus {
  chips: bigint
  currentBet: bigint
  lastAction: number // 0: NONE, 1: FOLD, 2: CHECK, 3: CALL, 4: RAISE, 5: ALL_IN
  hasFolded: boolean
}

export function usePokerGameContract() {
  const { address } = useAccount()
  const { writeContract, data: hash, error: writeError, isPending: isWritePending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const [selectedGameId, setSelectedGameId] = useState<number | null>(null)
  const [selectedGameContract, setSelectedGameContract] = useState<string | null>(null)

  // Factory contract reads
  const { data: activeGames, refetch: refetchActiveGames } = useReadContract({
    address: CONTRACTS.POKER_GAME_FACTORY as `0x${string}`,
    abi: POKER_GAME_FACTORY_ABI,
    functionName: 'getActivePublicGames',
    query: {
      enabled: !!CONTRACTS.POKER_GAME_FACTORY,
    },
  })

  const { data: playerGames, refetch: refetchPlayerGames } = useReadContract({
    address: CONTRACTS.POKER_GAME_FACTORY as `0x${string}`,
    abi: POKER_GAME_FACTORY_ABI,
    functionName: 'getPlayerGames',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!CONTRACTS.POKER_GAME_FACTORY,
    },
  })

  // Game contract reads (for selected game)
  const { data: gameState, refetch: refetchGameState } = useReadContract({
    address: selectedGameContract as `0x${string}`,
    abi: POKER_GAME_ABI,
    functionName: 'getGame',
    args: selectedGameId ? [BigInt(selectedGameId)] : undefined,
    query: {
      enabled: !!selectedGameContract && selectedGameId !== null,
      refetchInterval: 5000, // Poll every 5 seconds during active games
    },
  })

  const { data: playerStatus, refetch: refetchPlayerStatus } = useReadContract({
    address: selectedGameContract as `0x${string}`,
    abi: POKER_GAME_ABI,
    functionName: 'getPlayerStatus',
    args: selectedGameId && address ? [BigInt(selectedGameId), address] : undefined,
    query: {
      enabled: !!selectedGameContract && selectedGameId !== null && !!address,
      refetchInterval: 5000,
    },
  })

  // Factory functions
  const deployGame = async (
    smallBlind: string,
    bigBlind: string,
    maxPlayers: number,
    isPrivate: boolean,
    deploymentFee: string = '0.001'
  ) => {
    if (!CONTRACTS.POKER_GAME_FACTORY) {
      throw new Error('Poker game factory contract not configured')
    }

    try {
      await writeContract({
        address: CONTRACTS.POKER_GAME_FACTORY as `0x${string}`,
        abi: POKER_GAME_FACTORY_ABI,
        functionName: 'deployGame',
        args: [
          parseEther(smallBlind),
          parseEther(bigBlind),
          BigInt(maxPlayers),
          isPrivate,
        ],
        value: parseEther(deploymentFee),
      })
    } catch (error) {
      console.error('Error deploying game:', error)
      throw error
    }
  }

  // Game functions
  const joinGame = async (gameContract: string, gameId: number, chipTokenIds: number[]) => {
    try {
      await writeContract({
        address: gameContract as `0x${string}`,
        abi: POKER_GAME_ABI,
        functionName: 'joinGame',
        args: [
          BigInt(gameId),
          chipTokenIds.map(id => BigInt(id)),
        ],
      })
    } catch (error) {
      console.error('Error joining game:', error)
      throw error
    }
  }

  const performAction = async (
    gameContract: string,
    gameId: number,
    action: number, // 0: NONE, 1: FOLD, 2: CHECK, 3: CALL, 4: RAISE, 5: ALL_IN
    amount: string = '0'
  ) => {
    try {
      await writeContract({
        address: gameContract as `0x${string}`,
        abi: POKER_GAME_ABI,
        functionName: 'performAction',
        args: [
          BigInt(gameId),
          action,
          parseEther(amount),
        ],
      })
    } catch (error) {
      console.error('Error performing action:', error)
      throw error
    }
  }

  const leaveGame = async (gameContract: string, gameId: number) => {
    try {
      await writeContract({
        address: gameContract as `0x${string}`,
        abi: POKER_GAME_ABI,
        functionName: 'leaveGame',
        args: [BigInt(gameId)],
      })
    } catch (error) {
      console.error('Error leaving game:', error)
      throw error
    }
  }

  // Utility functions
  const selectGame = (gameId: number, gameContract: string) => {
    setSelectedGameId(gameId)
    setSelectedGameContract(gameContract)
  }

  const formatEtherValue = (value: bigint) => formatEther(value)

  const getActionName = (action: number) => {
    const actions = ['None', 'Fold', 'Check', 'Call', 'Raise', 'All In']
    return actions[action] || 'Unknown'
  }

  const getPhaseName = (phase: number) => {
    const phases = ['Waiting', 'Active', 'Finished']
    return phases[phase] || 'Unknown'
  }

  const getRoundName = (round: number) => {
    const rounds = ['Pre-Flop', 'Flop', 'Turn', 'River', 'Showdown']
    return rounds[round] || 'Unknown'
  }

  // Parse active games data
  const parsedActiveGames = activeGames ? {
    gameIds: activeGames[0] as readonly bigint[],
    gameInfos: activeGames[1] as readonly GameInfo[],
  } : { gameIds: [], gameInfos: [] }

  // Parse player games data
  const parsedPlayerGames = playerGames ? {
    gameIds: playerGames[0] as readonly bigint[],
    gameInfos: playerGames[1] as readonly GameInfo[],
  } : { gameIds: [], gameInfos: [] }

  // Parse game state
  const parsedGameState = gameState ? {
    pot: gameState[0] as bigint,
    currentBet: gameState[1] as bigint,
    phase: gameState[2] as number,
    round: gameState[3] as number,
    currentPlayer: gameState[4] as string,
    players: gameState[5] as readonly string[],
  } : null

  // Parse player status
  const parsedPlayerStatus = playerStatus ? {
    chips: playerStatus[0] as bigint,
    currentBet: playerStatus[1] as bigint,
    lastAction: playerStatus[2] as number,
    hasFolded: playerStatus[3] as boolean,
  } : null

  // Check if it's the current player's turn
  const isPlayerTurn = parsedGameState?.currentPlayer === address

  // Refetch all data
  const refetchAll = () => {
    refetchActiveGames()
    refetchPlayerGames()
    if (selectedGameContract && selectedGameId !== null) {
      refetchGameState()
      refetchPlayerStatus()
    }
  }

  return {
    // Data
    activeGames: parsedActiveGames,
    playerGames: parsedPlayerGames,
    gameState: parsedGameState,
    playerStatus: parsedPlayerStatus,
    selectedGameId,
    selectedGameContract,
    
    // Loading states
    isWritePending,
    isConfirming,
    isConfirmed,
    
    // Errors
    writeError,
    
    // Functions
    deployGame,
    joinGame,
    performAction,
    leaveGame,
    selectGame,
    refetchAll,
    
    // Utilities
    formatEtherValue,
    getActionName,
    getPhaseName,
    getRoundName,
    isPlayerTurn,
    
    // Transaction hash
    hash,
  }
}