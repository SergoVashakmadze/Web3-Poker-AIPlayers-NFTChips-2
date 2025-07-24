// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SimplePokerChip.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SimplePokerGame
 * @dev Simple poker game contract - core functionality only
 */
contract SimplePokerGame is Ownable, ReentrancyGuard {
    SimplePokerChip public immutable pokerChip;

    enum GamePhase { WAITING, ACTIVE, FINISHED }
    enum PlayerAction { NONE, FOLD, CHECK, CALL, RAISE, ALL_IN }
    enum GameRound { PRE_FLOP, FLOP, TURN, RIVER, SHOWDOWN }

    struct Game {
        uint256 gameId;
        address[] players;
        mapping(address => uint256) playerChips;
        mapping(address => uint256) currentBets;
        mapping(address => PlayerAction) lastActions;
        mapping(address => bool) hasFolded;
        uint256 pot;
        uint256 currentBet;
        uint256 smallBlind;
        uint256 bigBlind;
        GamePhase phase;
        GameRound round;
        address currentPlayer;
        address dealer;
        uint256 maxPlayers;
    }

    mapping(uint256 => Game) public games;
    mapping(address => uint256) public playerCurrentGame;
    mapping(uint256 => address[]) public gamePlayersList;
    
    uint256 private _nextGameId = 1;
    uint256 public constant MIN_PLAYERS = 2;
    uint256 public constant MAX_PLAYERS = 6;
    uint256 public houseRake = 250; // 2.5%

    event GameCreated(uint256 indexed gameId, address indexed creator, uint256 buyIn);
    event PlayerJoined(uint256 indexed gameId, address indexed player, uint256 chipValue);
    event GameStarted(uint256 indexed gameId, address[] players);
    event PlayerActionPerformed(uint256 indexed gameId, address indexed player, PlayerAction action, uint256 amount);
    event RoundAdvanced(uint256 indexed gameId, GameRound newRound);
    event GameFinished(uint256 indexed gameId, address indexed winner, uint256 winnings);

    constructor(address _pokerChip, address initialOwner) Ownable(initialOwner) {
        pokerChip = SimplePokerChip(_pokerChip);
    }

    /**
     * @dev Create a new poker game
     */
    function createGame(
        uint256 smallBlind,
        uint256 bigBlind,
        uint256 maxPlayers
    ) external returns (uint256) {
        require(smallBlind > 0 && bigBlind >= smallBlind * 2, "Invalid blinds");
        require(maxPlayers >= MIN_PLAYERS && maxPlayers <= MAX_PLAYERS, "Invalid max players");
        require(playerCurrentGame[msg.sender] == 0, "Already in game");

        uint256 gameId = _nextGameId++;
        
        Game storage newGame = games[gameId];
        newGame.gameId = gameId;
        newGame.smallBlind = smallBlind;
        newGame.bigBlind = bigBlind;
        newGame.maxPlayers = maxPlayers;
        newGame.phase = GamePhase.WAITING;
        newGame.dealer = msg.sender;

        emit GameCreated(gameId, msg.sender, bigBlind * 50);
        return gameId;
    }

    /**
     * @dev Join a poker game with NFT chips
     */
    function joinGame(uint256 gameId, uint256[] calldata chipTokenIds) external nonReentrant {
        Game storage game = games[gameId];
        require(game.gameId != 0, "Game does not exist");
        require(game.phase == GamePhase.WAITING, "Game already started");
        require(gamePlayersList[gameId].length < game.maxPlayers, "Game full");
        require(playerCurrentGame[msg.sender] == 0, "Already in game");

        // Validate chips and calculate total value
        uint256 totalChipValue = 0;
        for (uint256 i = 0; i < chipTokenIds.length; i++) {
            require(pokerChip.ownerOf(chipTokenIds[i]) == msg.sender, "Not chip owner");
            (uint256 chipValue, string memory chipRarity, bool chipIsActive) = pokerChip.chips(chipTokenIds[i]);
            require(chipIsActive, "Chip not active");
            totalChipValue += chipValue;
            
            pokerChip.deactivateChip(chipTokenIds[i]);
        }

        require(totalChipValue >= game.bigBlind * 20, "Insufficient chip value");

        // Add player to game
        gamePlayersList[gameId].push(msg.sender);
        game.playerChips[msg.sender] = totalChipValue;
        playerCurrentGame[msg.sender] = gameId;

        emit PlayerJoined(gameId, msg.sender, totalChipValue);

        // Auto-start if we have enough players
        if (gamePlayersList[gameId].length >= MIN_PLAYERS) {
            _startGame(gameId);
        }
    }

    /**
     * @dev Start the poker game
     */
    function _startGame(uint256 gameId) internal {
        Game storage game = games[gameId];
        require(game.phase == GamePhase.WAITING, "Game not waiting");

        game.phase = GamePhase.ACTIVE;
        game.round = GameRound.PRE_FLOP;
        
        address[] memory players = gamePlayersList[gameId];
        
        // Post blinds
        if (players.length >= 2) {
            uint256 smallBlindIndex = 1 % players.length;
            uint256 bigBlindIndex = (smallBlindIndex + 1) % players.length;

            game.currentBets[players[smallBlindIndex]] = game.smallBlind;
            game.playerChips[players[smallBlindIndex]] -= game.smallBlind;
            game.pot += game.smallBlind;

            game.currentBets[players[bigBlindIndex]] = game.bigBlind;
            game.playerChips[players[bigBlindIndex]] -= game.bigBlind;
            game.pot += game.bigBlind;
            game.currentBet = game.bigBlind;

            // First to act is after big blind
            game.currentPlayer = players[(bigBlindIndex + 1) % players.length];
        }

        emit GameStarted(gameId, players);
    }

    /**
     * @dev Perform a poker action
     */
    function performAction(
        uint256 gameId,
        PlayerAction action,
        uint256 amount
    ) external nonReentrant {
        Game storage game = games[gameId];
        require(playerCurrentGame[msg.sender] == gameId, "Not in game");
        require(game.phase == GamePhase.ACTIVE, "Game not active");
        require(game.currentPlayer == msg.sender, "Not your turn");
        require(!game.hasFolded[msg.sender], "Already folded");

        if (action == PlayerAction.FOLD) {
            game.hasFolded[msg.sender] = true;
            
        } else if (action == PlayerAction.CHECK) {
            require(game.currentBets[msg.sender] == game.currentBet, "Cannot check");
            
        } else if (action == PlayerAction.CALL) {
            uint256 callAmount = game.currentBet - game.currentBets[msg.sender];
            require(game.playerChips[msg.sender] >= callAmount, "Insufficient chips");
            
            game.currentBets[msg.sender] += callAmount;
            game.playerChips[msg.sender] -= callAmount;
            game.pot += callAmount;
            
        } else if (action == PlayerAction.RAISE) {
            require(amount > game.currentBet, "Raise too low");
            uint256 totalBet = amount;
            uint256 additionalAmount = totalBet - game.currentBets[msg.sender];
            require(game.playerChips[msg.sender] >= additionalAmount, "Insufficient chips");
            
            game.currentBets[msg.sender] = totalBet;
            game.playerChips[msg.sender] -= additionalAmount;
            game.pot += additionalAmount;
            game.currentBet = totalBet;
            
        } else if (action == PlayerAction.ALL_IN) {
            uint256 allInAmount = game.playerChips[msg.sender];
            game.currentBets[msg.sender] += allInAmount;
            game.playerChips[msg.sender] = 0;
            game.pot += allInAmount;
            
            if (game.currentBets[msg.sender] > game.currentBet) {
                game.currentBet = game.currentBets[msg.sender];
            }
        }

        game.lastActions[msg.sender] = action;
        emit PlayerActionPerformed(gameId, msg.sender, action, amount);

        _nextPlayer(gameId);
    }

    /**
     * @dev Move to next player
     */
    function _nextPlayer(uint256 gameId) internal {
        Game storage game = games[gameId];
        address[] memory players = gamePlayersList[gameId];
        
        // Check if betting round is complete
        if (_isBettingRoundComplete(gameId)) {
            _advanceRound(gameId);
            return;
        }

        // Find next active player
        uint256 currentIndex;
        for (uint256 i = 0; i < players.length; i++) {
            if (players[i] == game.currentPlayer) {
                currentIndex = i;
                break;
            }
        }

        uint256 nextIndex = (currentIndex + 1) % players.length;
        uint256 attempts = 0;
        
        while (attempts < players.length) {
            address nextPlayer = players[nextIndex];
            if (!game.hasFolded[nextPlayer] && game.playerChips[nextPlayer] > 0) {
                game.currentPlayer = nextPlayer;
                return;
            }
            nextIndex = (nextIndex + 1) % players.length;
            attempts++;
        }

        _endGame(gameId);
    }

    /**
     * @dev Check if betting round is complete
     */
    function _isBettingRoundComplete(uint256 gameId) internal view returns (bool) {
        Game storage game = games[gameId];
        address[] memory players = gamePlayersList[gameId];
        
        uint256 activePlayers = 0;
        uint256 playersWithCurrentBet = 0;

        for (uint256 i = 0; i < players.length; i++) {
            address player = players[i];
            if (!game.hasFolded[player] && game.playerChips[player] > 0) {
                activePlayers++;
                if (game.currentBets[player] == game.currentBet) {
                    playersWithCurrentBet++;
                }
            }
        }

        return activePlayers <= 1 || playersWithCurrentBet == activePlayers;
    }

    /**
     * @dev Advance to next round
     */
    function _advanceRound(uint256 gameId) internal {
        Game storage game = games[gameId];
        
        address[] memory playersInHand = _getActivePlayers(gameId);
        if (playersInHand.length <= 1) {
            _endGame(gameId);
            return;
        }

        if (game.round == GameRound.PRE_FLOP) {
            game.round = GameRound.FLOP;
        } else if (game.round == GameRound.FLOP) {
            game.round = GameRound.TURN;
        } else if (game.round == GameRound.TURN) {
            game.round = GameRound.RIVER;
        } else if (game.round == GameRound.RIVER) {
            game.round = GameRound.SHOWDOWN;
            _endGame(gameId);
            return;
        }

        // Reset bets for new round
        address[] memory players = gamePlayersList[gameId];
        for (uint256 i = 0; i < players.length; i++) {
            game.currentBets[players[i]] = 0;
        }
        game.currentBet = 0;

        // First active player to act
        game.currentPlayer = _findFirstActivePlayer(gameId);
        
        emit RoundAdvanced(gameId, game.round);
    }

    /**
     * @dev Get active players
     */
    function _getActivePlayers(uint256 gameId) internal view returns (address[] memory) {
        Game storage game = games[gameId];
        address[] memory players = gamePlayersList[gameId];
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < players.length; i++) {
            if (!game.hasFolded[players[i]]) {
                activeCount++;
            }
        }
        
        address[] memory activePlayers = new address[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < players.length; i++) {
            if (!game.hasFolded[players[i]]) {
                activePlayers[index++] = players[i];
            }
        }
        
        return activePlayers;
    }

    /**
     * @dev Find first active player
     */
    function _findFirstActivePlayer(uint256 gameId) internal view returns (address) {
        Game storage game = games[gameId];
        address[] memory players = gamePlayersList[gameId];
        
        for (uint256 i = 0; i < players.length; i++) {
            if (!game.hasFolded[players[i]] && game.playerChips[players[i]] > 0) {
                return players[i];
            }
        }
        return address(0);
    }

    /**
     * @dev End game and determine winner
     */
    function _endGame(uint256 gameId) internal {
        Game storage game = games[gameId];
        game.phase = GamePhase.FINISHED;

        address[] memory activePlayers = _getActivePlayers(gameId);
        
        if (activePlayers.length > 0) {
            address winner = activePlayers[0]; // Simplified: first active player wins
            
            // Calculate rake
            uint256 rake = (game.pot * houseRake) / 10000;
            uint256 winnings = game.pot - rake;

            // Payout winner (simplified - send ETH)
            if (winnings > 0) {
                (bool success, ) = payable(winner).call{value: winnings}("");
                require(success, "Payout failed");
            }

            emit GameFinished(gameId, winner, winnings);
        }

        // Reset player game assignments
        address[] memory allPlayers = gamePlayersList[gameId];
        for (uint256 i = 0; i < allPlayers.length; i++) {
            playerCurrentGame[allPlayers[i]] = 0;
        }
    }

    /**
     * @dev Leave game
     */
    function leaveGame(uint256 gameId) external {
        require(playerCurrentGame[msg.sender] == gameId, "Not in game");
        
        Game storage game = games[gameId];
        game.hasFolded[msg.sender] = true;
        playerCurrentGame[msg.sender] = 0;

        if (game.phase == GamePhase.ACTIVE && game.currentPlayer == msg.sender) {
            _nextPlayer(gameId);
        }
    }

    /**
     * @dev Get game details
     */
    function getGame(uint256 gameId) external view returns (
        uint256 pot,
        uint256 currentBet,
        GamePhase phase,
        GameRound round,
        address currentPlayer,
        address[] memory players
    ) {
        Game storage game = games[gameId];
        return (
            game.pot,
            game.currentBet,
            game.phase,
            game.round,
            game.currentPlayer,
            gamePlayersList[gameId]
        );
    }

    /**
     * @dev Get player status in game
     */
    function getPlayerStatus(uint256 gameId, address player) external view returns (
        uint256 chips,
        uint256 currentBet,
        PlayerAction lastAction,
        bool hasFolded
    ) {
        Game storage game = games[gameId];
        return (
            game.playerChips[player],
            game.currentBets[player],
            game.lastActions[player],
            game.hasFolded[player]
        );
    }

    /**
     * @dev Set house rake (owner only)
     */
    function setHouseRake(uint256 newRake) external onlyOwner {
        require(newRake <= 1000, "Rake too high");
        houseRake = newRake;
    }

    /**
     * @dev Withdraw house earnings
     */
    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Transfer failed");
    }

    receive() external payable {}
}