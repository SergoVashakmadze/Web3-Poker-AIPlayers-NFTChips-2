# 🎯 SIMPLE POKER CONTRACTS - REMIX DEPLOYMENT GUIDE

## 🚀 Simplified On-Chain Poker Game

I've created **3 streamlined smart contracts** focusing on core poker functionality to demonstrate on-chain gameplay without complexity:

### **1. SimplePokerChip.sol** - Basic NFT Chips
- ✅ **ERC721** poker chip NFTs
- ✅ **3 Rarity Tiers**: Common (0.01 ETH), Rare (0.05 ETH), Epic (0.1 ETH)
- ✅ **Game Integration**: Activate/deactivate chips for games
- ✅ **Core Functions**: Mint, track ownership, manage game usage

### **2. SimplePokerGame.sol** - Essential Poker Logic
- ✅ **Game Phases**: WAITING, ACTIVE, FINISHED
- ✅ **Player Actions**: FOLD, CHECK, CALL, RAISE, ALL_IN
- ✅ **Betting Rounds**: PRE_FLOP, FLOP, TURN, RIVER, SHOWDOWN
- ✅ **Core Mechanics**: Blinds, pot management, winner determination
- ✅ **Multi-Player**: 2-6 players per game

### **3. PokerGameFactory.sol** - Game Management
- ✅ **Game Deployment**: Create multiple game instances
- ✅ **Game Discovery**: Find active public games
- ✅ **Player Tracking**: Track games per player

## 📋 Deployment Order (Remix)

### **Step 1: Deploy SimplePokerChip**
```solidity
// Constructor parameter:
initialOwner: YOUR_WALLET_ADDRESS
```

### **Step 2: Deploy SimplePokerGame**
```solidity
// Constructor parameters:
_pokerChip: SIMPLE_POKER_CHIP_ADDRESS (from Step 1)
initialOwner: YOUR_WALLET_ADDRESS
```

### **Step 3: Deploy PokerGameFactory**
```solidity
// Constructor parameters:
_pokerChip: SIMPLE_POKER_CHIP_ADDRESS (from Step 1)
initialOwner: YOUR_WALLET_ADDRESS
```

### **Step 4: Authorize Game Contracts**
Call on SimplePokerChip contract:
```solidity
setGameAuthorization(SIMPLE_POKER_GAME_ADDRESS, true)
setGameAuthorization(POKER_GAME_FACTORY_ADDRESS, true)
```

## 🎮 Key Features

### **Simple NFT Chips**
- **3 Value Tiers**: 0.01, 0.05, 0.1 ETH
- **Active/Inactive States**: Chips deactivated during games
- **Player Tracking**: Track all chips owned by each player

### **Basic Poker Game**
- **Real Poker Actions**: Fold, check, call, raise, all-in
- **Betting Rounds**: Pre-flop through river
- **Pot Management**: Accumulate bets, distribute winnings
- **Winner Determination**: Simplified last-player-standing logic

### **Game Factory**
- **Multiple Games**: Deploy separate game instances
- **Game Discovery**: Find active public games
- **Access Control**: Support for private games

## 💡 Testing Functions

### **Test SimplePokerChip:**
```solidity
// Mint a common chip (send 0.01 ETH)
mintChip() payable

// Mint a rare chip (send 0.05 ETH)
mintChip() payable

// Mint an epic chip (send 0.1 ETH)
mintChip() payable

// Check player's chips
getPlayerChips(playerAddress)

// Get active chips only
getActiveChips(playerAddress)

// Get total chip value
getPlayerChipValue(playerAddress)
```

### **Test SimplePokerGame:**
```solidity
// Create a simple game
createGame(
    0.001 ether,    // smallBlind
    0.002 ether,    // bigBlind
    4               // maxPlayers
)

// Join with chip NFTs
joinGame(gameId, [tokenId1, tokenId2])

// Perform actions
performAction(gameId, 1, 0)          // FOLD
performAction(gameId, 2, 0)          // CHECK
performAction(gameId, 3, 0)          // CALL
performAction(gameId, 4, 0.005 ether) // RAISE
performAction(gameId, 5, 0)          // ALL_IN

// Check game status
getGame(gameId)

// Check player status
getPlayerStatus(gameId, playerAddress)
```

### **Test PokerGameFactory:**
```solidity
// Deploy a new game
deployGame(
    0.001 ether,    // smallBlind
    0.002 ether,    // bigBlind
    6,              // maxPlayers
    false           // isPrivate
) payable // send deployment fee (0.001 ETH)

// Get active games
getActivePublicGames()

// Get player's games
getPlayerGames(playerAddress)
```

## 🔧 Game Flow Example

1. **Deploy Contracts** in order above
2. **Mint Chips**: Players mint NFT chips with ETH
3. **Create Game**: Someone creates a game via factory
4. **Join Game**: Players join with their chip NFTs
5. **Play Poker**: Players perform actions (fold, call, raise)
6. **Game Ends**: Last player standing wins the pot
7. **Chips Reactivated**: Players can use chips in new games

## 📊 Contract Addresses Template

After deployment, save these addresses:

```
SimplePokerChip: 0x...
SimplePokerGame: 0x...
PokerGameFactory: 0x...

Network: Base Sepolia (84532) or your preferred testnet
Deployed By: YOUR_ADDRESS
```

## 🎯 Frontend Integration

Update your contract addresses in the app:
```typescript
// In your Web3 config
const SIMPLE_POKER_CHIP_ADDRESS = "0x..."
const SIMPLE_POKER_GAME_ADDRESS = "0x..."
const POKER_GAME_FACTORY_ADDRESS = "0x..."
```

## 🚨 Key Simplifications

- **No Complex Tournament System**: Just basic games
- **Simplified Winner Logic**: Last active player wins
- **Basic Chip System**: 3 tiers only
- **Minimal Access Controls**: Core authorization only
- **No Advanced Features**: Focus on core poker mechanics

## ✅ What This Demonstrates

- **True On-Chain Gaming**: All game state on blockchain
- **NFT Integration**: Chips as tradeable NFTs
- **Multi-Player Games**: Real multiplayer poker
- **Smart Contract Interaction**: Factory pattern deployment
- **Web3 Integration**: Ready for frontend connection

This simplified version proves the concept of on-chain poker while keeping complexity minimal. Perfect for demonstrating Web3 gaming capabilities! 🎲

---

**Ready for Remix deployment!** 🚀 Copy the 3 contract files and follow the deployment steps above.