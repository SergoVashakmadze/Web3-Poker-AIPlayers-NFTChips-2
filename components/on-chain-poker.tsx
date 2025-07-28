"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { SIMPLE_POKER_CHIP_ABI, SIMPLE_POKER_GAME_ABI, POKER_GAME_FACTORY_ABI } from '@/lib/contract-abis'
import { Coins, GamepadIcon, Users, Zap, CheckCircle, AlertCircle, Loader2 } from "lucide-react"

const CONTRACTS = {
  SIMPLE_POKER_CHIP: process.env.NEXT_PUBLIC_SIMPLE_POKER_CHIP_ADDRESS as `0x${string}`,
  SIMPLE_POKER_GAME: process.env.NEXT_PUBLIC_SIMPLE_POKER_GAME as `0x${string}`,
  SIMPLE_POKER_GAME_FACTORY: process.env.NEXT_PUBLIC_SIMPLE_POKER_GAME_FACTORY_ADDRESS as `0x${string}`,
}

interface ChipData {
  value: bigint
  rarity: string
  isActive: boolean
}

interface GameData {
  pot: bigint
  currentBet: bigint
  phase: number
  round: number
  currentPlayer: string
  players: string[]
}

export function OnChainPoker() {
  const { address, isConnected } = useAccount()
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = useWaitForTransactionReceipt({ hash })

  // Handle successful transaction to update game state
  useEffect(() => {
    if (isConfirmed && hash && receipt) {
      // Refresh contract data after successful transaction
      console.log('Transaction confirmed:', hash)
      console.log('Receipt:', receipt)
      
      // Try to extract game ID from logs for GameCreated event
      if (receipt.logs && receipt.logs.length > 0) {
        // Look for GameCreated event (first topic should match event signature)
        const gameCreatedLog = receipt.logs.find(log => 
          log.topics && log.topics.length > 1 && log.address?.toLowerCase() === CONTRACTS.SIMPLE_POKER_GAME?.toLowerCase()
        )
        
        if (gameCreatedLog && gameCreatedLog.topics && gameCreatedLog.topics[1]) {
          // The gameId is the first indexed parameter (topics[1])
          const extractedGameId = parseInt(gameCreatedLog.topics[1], 16).toString()
          console.log('Extracted game ID:', extractedGameId)
          setCreatedGameId(extractedGameId)
          setGameId(extractedGameId) // Auto-populate the join game field
        }
      }
      
      setShowGameCreated(true)
      // Hide the success message after 10 seconds
      setTimeout(() => setShowGameCreated(false), 10000)
      // The contract reads should automatically refetch due to wagmi's caching
    }
  }, [isConfirmed, hash, receipt])

  const [selectedChips, setSelectedChips] = useState<number[]>([])
  const [gameId, setGameId] = useState<string>('')
  const [mintTier, setMintTier] = useState<'common' | 'rare' | 'epic'>('common')
  const [showGameCreated, setShowGameCreated] = useState(false)
  const [createdGameId, setCreatedGameId] = useState<string>('')

  // Read user's chips
  const { data: userChips } = useReadContract({
    address: CONTRACTS.SIMPLE_POKER_CHIP,
    abi: SIMPLE_POKER_CHIP_ABI,
    functionName: 'getPlayerChips',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  })

  // Read active chips
  const { data: activeChips } = useReadContract({
    address: CONTRACTS.SIMPLE_POKER_CHIP,
    abi: SIMPLE_POKER_CHIP_ABI,
    functionName: 'getActiveChips',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  })

  // Read current game if player is in one
  const { data: playerCurrentGame } = useReadContract({
    address: CONTRACTS.SIMPLE_POKER_GAME,
    abi: SIMPLE_POKER_GAME_ABI,
    functionName: 'playerCurrentGame',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  })

  // Read game data if in a game
  const { data: gameData } = useReadContract({
    address: CONTRACTS.SIMPLE_POKER_GAME,
    abi: SIMPLE_POKER_GAME_ABI,
    functionName: 'getGame',
    args: playerCurrentGame && playerCurrentGame > BigInt(0) ? [playerCurrentGame] : undefined,
    query: { enabled: !!playerCurrentGame && playerCurrentGame > BigInt(0) }
  }) as { data: GameData | undefined }

  // Read player status in current game
  const { data: playerStatus } = useReadContract({
    address: CONTRACTS.SIMPLE_POKER_GAME,
    abi: SIMPLE_POKER_GAME_ABI,
    functionName: 'getPlayerStatus',
    args: playerCurrentGame && playerCurrentGame > BigInt(0) && address ? [playerCurrentGame, address] : undefined,
    query: { enabled: !!playerCurrentGame && playerCurrentGame > BigInt(0) && !!address }
  })

  // Mint a poker chip
  const mintChip = async () => {
    const values = {
      common: parseEther('0.01'),
      rare: parseEther('0.05'),
      epic: parseEther('0.1')
    }

    writeContract({
      address: CONTRACTS.SIMPLE_POKER_CHIP,
      abi: SIMPLE_POKER_CHIP_ABI,
      functionName: 'mintChip',
      value: values[mintTier]
    })
  }

  // Create a new game
  const createGame = async () => {
    writeContract({
      address: CONTRACTS.SIMPLE_POKER_GAME,
      abi: SIMPLE_POKER_GAME_ABI,
      functionName: 'createGame',
      args: [
        parseEther('0.001'), // smallBlind
        parseEther('0.002'), // bigBlind
        BigInt(4) // maxPlayers
      ]
    })
  }

  // Join a game
  const joinGame = async () => {
    if (!gameId || selectedChips.length === 0) return

    const chipIds = selectedChips.map(id => BigInt(id))
    
    writeContract({
      address: CONTRACTS.SIMPLE_POKER_GAME,
      abi: SIMPLE_POKER_GAME_ABI,
      functionName: 'joinGame',
      args: [BigInt(gameId), chipIds]
    })
  }

  // Perform poker action
  const performAction = async (action: number, amount?: bigint) => {
    if (!playerCurrentGame || playerCurrentGame === BigInt(0)) return

    writeContract({
      address: CONTRACTS.SIMPLE_POKER_GAME,
      abi: SIMPLE_POKER_GAME_ABI,
      functionName: 'performAction',
      args: [playerCurrentGame, action, amount || BigInt(0)]
    })
  }

  const getTierValue = (tier: 'common' | 'rare' | 'epic') => {
    const values = { common: '0.01', rare: '0.05', epic: '0.1' }
    return values[tier]
  }

  // Calculate total value of selected chips (assuming all chips are common for now)
  // In a real implementation, you'd need to fetch each chip's individual value
  const calculateSelectedChipsValue = () => {
    // Simplified: assume all chips are common (0.01 ETH each)
    // TODO: This should fetch actual chip values from contract
    return selectedChips.length * 0.01
  }

  const MINIMUM_BUY_IN = 0.002 * 20 // bigBlind * 20 = 0.04 ETH

  const getActionName = (actionNum: number) => {
    const actions = ['NONE', 'FOLD', 'CHECK', 'CALL', 'RAISE', 'ALL_IN']
    return actions[actionNum] || 'UNKNOWN'
  }

  const getPhaseName = (phaseNum: number) => {
    const phases = ['WAITING', 'ACTIVE', 'FINISHED']
    return phases[phaseNum] || 'UNKNOWN'
  }

  const getRoundName = (roundNum: number) => {
    const rounds = ['PRE_FLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN']
    return rounds[roundNum] || 'UNKNOWN'
  }

  if (!isConnected) {
    return (
      <Card className="p-8 text-center bg-slate-800/50 border-slate-700">
        <div className="space-y-4">
          <GamepadIcon className="w-16 h-16 mx-auto text-gray-400" />
          <h3 className="text-xl font-semibold text-white">Connect Wallet to Play On-Chain</h3>
          <p className="text-gray-300">
            Connect your wallet to mint NFT chips and play poker on the blockchain
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">⛓️ On-Chain Poker</h2>
        <p className="text-gray-300">Play poker with smart contracts and NFT chips</p>
      </div>

      {/* Transaction Status */}
      {(isPending || isConfirming || isConfirmed || error) && (
        <Card className="p-4 bg-slate-800/50 border-slate-700">
          <div className="flex items-center space-x-3">
            {isPending && (
              <>
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                <span className="text-blue-400">Waiting for wallet confirmation...</span>
              </>
            )}
            {isConfirming && (
              <>
                <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
                <span className="text-yellow-400">Transaction confirming...</span>
              </>
            )}
            {isConfirmed && (
              <>
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-400">Transaction confirmed!</span>
              </>
            )}
            {error && (
              <>
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-400">Error: {error.message}</span>
              </>
            )}
          </div>
        </Card>
      )}

      <Tabs defaultValue="chips" className="w-full">
        <TabsList className="grid grid-cols-3 w-full bg-slate-800">
          <TabsTrigger value="chips" className="data-[state=active]:bg-slate-700">
            <Coins className="w-4 h-4 mr-2" />
            My Chips
          </TabsTrigger>
          <TabsTrigger value="games" className="data-[state=active]:bg-slate-700">
            <GamepadIcon className="w-4 h-4 mr-2" />
            Games
          </TabsTrigger>
          <TabsTrigger value="play" className="data-[state=active]:bg-slate-700">
            <Users className="w-4 h-4 mr-2" />
            Play
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chips" className="space-y-4">
          <Card className="p-6 bg-slate-800/50 border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Mint Poker Chips</h3>
            
            <div className="space-y-4">
              <div>
                <Label className="text-white">Choose Chip Tier</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {(['common', 'rare', 'epic'] as const).map((tier) => (
                    <Button
                      key={tier}
                      variant={mintTier === tier ? "default" : "outline"}
                      onClick={() => setMintTier(tier)}
                      className={`p-4 h-auto ${
                        mintTier === tier ? 'bg-purple-600' : 'border-slate-600 text-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-lg font-bold capitalize">{tier}</div>
                        <div className="text-sm">{getTierValue(tier)} ETH</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              <Button 
                onClick={mintChip} 
                disabled={isPending}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {isPending ? 'Minting...' : `Mint ${mintTier} Chip (${getTierValue(mintTier)} ETH)`}
              </Button>
            </div>
          </Card>

          <Card className="p-6 bg-slate-800/50 border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Your NFT Chips</h3>
            
            {userChips && (userChips as readonly bigint[]).length > 0 ? (
              <div className="space-y-2">
                <p className="text-gray-300">Total Chips: {(userChips as readonly bigint[]).length}</p>
                <p className="text-gray-300">Active Chips: {activeChips ? (activeChips as readonly bigint[]).length : 0}</p>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {(userChips as readonly bigint[]).map((chipId, index) => (
                    <div key={`chip-${chipId.toString()}-${index}`} className="p-2 bg-slate-700 rounded text-sm">
                      <span className="text-yellow-400">Chip #{chipId.toString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-400">No chips yet. Mint some to get started!</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="games" className="space-y-4">
          <Card className="p-6 bg-slate-800/50 border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Game Management</h3>
            
            <div className="space-y-4">
              <Button 
                onClick={createGame}
                disabled={isPending}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {isPending ? 'Creating...' : 'Create New Game'}
              </Button>

              {showGameCreated && (
                <div className="p-3 bg-green-900/20 border border-green-600/50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <div>
                      <h4 className="text-green-400 font-semibold">Game Created Successfully!</h4>
                      <p className="text-green-200 text-sm">
                        {createdGameId ? (
                          <>Game ID <span className="font-bold text-green-300">#{createdGameId}</span> has been created and auto-populated below. Select your chips and click "Join Game" to start playing!</>
                        ) : (
                          <>Your game has been created. The Game ID should auto-populate below. Select your chips and join the game!</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-white">Join Existing Game</Label>
                <Input
                  placeholder="Enter Game ID"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              {activeChips && (activeChips as readonly bigint[]).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-white">Select Chips to Play With</Label>
                  <p className="text-gray-400 text-xs">
                    Minimum required: {MINIMUM_BUY_IN.toFixed(3)} ETH (4 Common, 1 Rare, or 1 Epic chip)
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {(activeChips as readonly bigint[]).map((chipId, index) => (
                      <label key={`active-chip-${chipId.toString()}-${index}`} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedChips.includes(Number(chipId))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedChips([...selectedChips, Number(chipId)])
                            } else {
                              setSelectedChips(selectedChips.filter(id => id !== Number(chipId)))
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-300">Chip #{chipId.toString()}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Minimum buy-in validation */}
              {selectedChips.length > 0 && calculateSelectedChipsValue() < MINIMUM_BUY_IN && (
                <div className="p-3 bg-red-900/20 border border-red-600/50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <div>
                      <h4 className="text-red-400 font-semibold">Insufficient Chip Value</h4>
                      <p className="text-red-200 text-sm">
                        Selected: {calculateSelectedChipsValue().toFixed(3)} ETH | Required: {MINIMUM_BUY_IN.toFixed(3)} ETH
                      </p>
                      <p className="text-red-200 text-xs mt-1">
                        You need at least 4 Common chips, 1 Rare chip, or 1 Epic chip to join.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button 
                onClick={joinGame}
                disabled={isPending || !gameId || selectedChips.length === 0 || calculateSelectedChipsValue() < MINIMUM_BUY_IN}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                size="lg"
              >
                {isPending ? 'Joining...' : `Join Game (Min: ${MINIMUM_BUY_IN.toFixed(3)} ETH)`}
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="play" className="space-y-4">
          {playerCurrentGame && playerCurrentGame > BigInt(0) ? (
            <Card className="p-6 bg-slate-800/50 border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Current Game #{playerCurrentGame.toString()}</h3>
              
              {gameData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Badge className="bg-green-600">
                        Phase: {getPhaseName(gameData.phase)}
                      </Badge>
                    </div>
                    <div>
                      <Badge className="bg-blue-600">
                        Round: {getRoundName(gameData.round)}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-slate-700 rounded">
                      <div className="text-yellow-400 font-bold text-xl">
                        {gameData.pot ? formatEther(gameData.pot) : '0.000'} ETH
                      </div>
                      <div className="text-gray-300 text-sm">Pot</div>
                    </div>
                    <div className="text-center p-3 bg-slate-700 rounded">
                      <div className="text-purple-400 font-bold text-xl">
                        {gameData.currentBet ? formatEther(gameData.currentBet) : '0.000'} ETH
                      </div>
                      <div className="text-gray-300 text-sm">Current Bet</div>
                    </div>
                  </div>

                  {playerStatus && (
                    <div className="p-3 bg-slate-700 rounded">
                      <h4 className="text-white font-semibold mb-2">Your Status</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-gray-300">
                          Chips: {formatEther((playerStatus as any)[0])} ETH
                        </div>
                        <div className="text-gray-300">
                          Current Bet: {formatEther((playerStatus as any)[1])} ETH
                        </div>
                        <div className="text-gray-300">
                          Last Action: {getActionName((playerStatus as any)[2])}
                        </div>
                        <div className="text-gray-300">
                          Folded: {(playerStatus as any)[3] ? 'Yes' : 'No'}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="text-white font-semibold">Actions</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        onClick={() => performAction(1)} // FOLD
                        variant="destructive"
                        disabled={isPending}
                      >
                        Fold
                      </Button>
                      <Button 
                        onClick={() => performAction(2)} // CHECK
                        variant="outline"
                        disabled={isPending}
                      >
                        Check
                      </Button>
                      <Button 
                        onClick={() => performAction(3)} // CALL
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={isPending}
                      >
                        Call
                      </Button>
                      <Button 
                        onClick={() => performAction(4, parseEther('0.005'))} // RAISE
                        className="bg-green-600 hover:bg-green-700"
                        disabled={isPending}
                      >
                        Raise
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-6 bg-slate-800/50 border-slate-700 text-center">
              <div className="space-y-4">
                <Users className="w-16 h-16 mx-auto text-gray-400" />
                <h3 className="text-lg font-semibold text-white">Not in a Game</h3>
                <p className="text-gray-300">Create a new game or join an existing one to start playing</p>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}