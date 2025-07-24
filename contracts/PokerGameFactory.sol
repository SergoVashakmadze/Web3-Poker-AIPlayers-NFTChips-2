// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SimplePokerGame.sol";
import "./SimplePokerChip.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PokerGameFactory
 * @dev Factory contract to deploy and manage poker games
 */
contract PokerGameFactory is Ownable {
    SimplePokerChip public immutable pokerChip;
    
    struct GameInfo {
        address gameContract;
        address creator;
        uint256 smallBlind;
        uint256 bigBlind;
        uint256 maxPlayers;
        uint256 createdAt;
        bool isActive;
        bool isPrivate;
    }

    mapping(uint256 => GameInfo) public games;
    mapping(address => uint256[]) public playerGames;
    
    uint256[] private activeGameIds;
    uint256 private nextGameId = 1;
    
    uint256 public constant MAX_CONCURRENT_GAMES = 100;
    uint256 public deploymentFee = 0.001 ether;

    event GameDeployed(
        uint256 indexed gameId,
        address indexed gameContract,
        address indexed creator,
        uint256 smallBlind,
        uint256 bigBlind,
        bool isPrivate
    );
    
    event GameFinished(uint256 indexed gameId, address indexed gameContract);

    constructor(address _pokerChip, address initialOwner) Ownable(initialOwner) {
        pokerChip = SimplePokerChip(_pokerChip);
    }

    /**
     * @dev Deploy a new poker game contract
     */
    function deployGame(
        uint256 smallBlind,
        uint256 bigBlind,
        uint256 maxPlayers,
        bool isPrivate
    ) external payable returns (uint256 gameId, address gameContract) {
        require(msg.value >= deploymentFee, "Insufficient deployment fee");
        require(activeGameIds.length < MAX_CONCURRENT_GAMES, "Too many active games");
        require(smallBlind > 0 && bigBlind >= smallBlind * 2, "Invalid blind structure");
        require(maxPlayers >= 2 && maxPlayers <= 8, "Invalid max players");

        gameId = nextGameId++;
        
        // Deploy new game contract
        SimplePokerGame newGame = new SimplePokerGame(address(pokerChip), address(this));
        gameContract = address(newGame);
        
        // Create game in the deployed contract
        uint256 contractGameId = newGame.createGame(smallBlind, bigBlind, maxPlayers);
        
        // Store game info
        games[gameId] = GameInfo({
            gameContract: gameContract,
            creator: msg.sender,
            smallBlind: smallBlind,
            bigBlind: bigBlind,
            maxPlayers: maxPlayers,
            createdAt: block.timestamp,
            isActive: true,
            isPrivate: isPrivate
        });

        activeGameIds.push(gameId);
        playerGames[msg.sender].push(gameId);

        emit GameDeployed(gameId, gameContract, msg.sender, smallBlind, bigBlind, isPrivate);

        return (gameId, gameContract);
    }

    /**
     * @dev Get all active public games
     */
    function getActivePublicGames() external view returns (
        uint256[] memory gameIds,
        GameInfo[] memory gameInfos
    ) {
        uint256 publicGameCount = 0;
        
        // Count public games
        for (uint256 i = 0; i < activeGameIds.length; i++) {
            uint256 gameId = activeGameIds[i];
            if (games[gameId].isActive && !games[gameId].isPrivate) {
                publicGameCount++;
            }
        }

        gameIds = new uint256[](publicGameCount);
        gameInfos = new GameInfo[](publicGameCount);
        
        uint256 index = 0;
        for (uint256 i = 0; i < activeGameIds.length; i++) {
            uint256 gameId = activeGameIds[i];
            if (games[gameId].isActive && !games[gameId].isPrivate) {
                gameIds[index] = gameId;
                gameInfos[index] = games[gameId];
                index++;
            }
        }

        return (gameIds, gameInfos);
    }

    /**
     * @dev Get games created by a player
     */
    function getPlayerGames(address player) external view returns (
        uint256[] memory gameIds,
        GameInfo[] memory gameInfos
    ) {
        uint256[] memory playerGameIds = playerGames[player];
        gameInfos = new GameInfo[](playerGameIds.length);
        
        for (uint256 i = 0; i < playerGameIds.length; i++) {
            gameInfos[i] = games[playerGameIds[i]];
        }

        return (playerGameIds, gameInfos);
    }

    /**
     * @dev Mark a game as finished
     */
    function finishGame(uint256 gameId) external {
        require(games[gameId].gameContract == msg.sender, "Only game contract can finish");
        require(games[gameId].isActive, "Game already finished");
        
        games[gameId].isActive = false;
        
        // Remove from active games array
        for (uint256 i = 0; i < activeGameIds.length; i++) {
            if (activeGameIds[i] == gameId) {
                activeGameIds[i] = activeGameIds[activeGameIds.length - 1];
                activeGameIds.pop();
                break;
            }
        }

        emit GameFinished(gameId, games[gameId].gameContract);
    }

    /**
     * @dev Get game details
     */
    function getGameInfo(uint256 gameId) external view returns (GameInfo memory) {
        require(games[gameId].gameContract != address(0), "Game does not exist");
        return games[gameId];
    }

    /**
     * @dev Get total number of active games
     */
    function getActiveGameCount() external view returns (uint256) {
        return activeGameIds.length;
    }

    /**
     * @dev Update deployment fee (owner only)
     */
    function updateDeploymentFee(uint256 newFee) external onlyOwner {
        deploymentFee = newFee;
    }

    /**
     * @dev Withdraw accumulated fees (owner only)
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Emergency pause a game (owner only)
     */
    function emergencyPauseGame(uint256 gameId) external onlyOwner {
        require(games[gameId].isActive, "Game not active");
        games[gameId].isActive = false;
        
        // Remove from active games
        for (uint256 i = 0; i < activeGameIds.length; i++) {
            if (activeGameIds[i] == gameId) {
                activeGameIds[i] = activeGameIds[activeGameIds.length - 1];
                activeGameIds.pop();
                break;
            }
        }
    }
}