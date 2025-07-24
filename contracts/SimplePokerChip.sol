// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SimplePokerChip
 * @dev Simple NFT contract for poker chips - core functionality only
 */
contract SimplePokerChip is ERC721, Ownable, ReentrancyGuard {
    struct Chip {
        uint256 value; // Chip value in wei
        string rarity; // Common, Rare, Epic
        bool isActive; // Can be used in games
    }

    mapping(uint256 => Chip) public chips;
    mapping(address => uint256[]) public playerChips;
    mapping(address => bool) public authorizedGames;
    
    uint256 private _nextTokenId = 1;
    
    // Chip values
    uint256 public constant COMMON_VALUE = 0.01 ether;
    uint256 public constant RARE_VALUE = 0.05 ether;
    uint256 public constant EPIC_VALUE = 0.1 ether;

    event ChipMinted(address indexed to, uint256 indexed tokenId, uint256 value, string rarity);
    event ChipActivated(uint256 indexed tokenId);
    event ChipDeactivated(uint256 indexed tokenId);

    constructor(address initialOwner) ERC721("PokerChip", "PCHIP") Ownable(initialOwner) {}

    /**
     * @dev Mint a poker chip
     */
    function mintChip() external payable nonReentrant {
        require(msg.value >= COMMON_VALUE, "Insufficient payment");

        uint256 tokenId = _nextTokenId++;
        string memory rarity = _determineRarity(msg.value);
        uint256 chipValue = _determineValue(msg.value);

        chips[tokenId] = Chip({
            value: chipValue,
            rarity: rarity,
            isActive: true
        });

        playerChips[msg.sender].push(tokenId);
        _safeMint(msg.sender, tokenId);

        emit ChipMinted(msg.sender, tokenId, chipValue, rarity);
    }

    /**
     * @dev Get player's chips
     */
    function getPlayerChips(address player) external view returns (uint256[] memory) {
        return playerChips[player];
    }

    /**
     * @dev Get active chips for a player
     */
    function getActiveChips(address player) external view returns (uint256[] memory) {
        uint256[] memory allChips = playerChips[player];
        uint256 activeCount = 0;

        for (uint256 i = 0; i < allChips.length; i++) {
            if (chips[allChips[i]].isActive && ownerOf(allChips[i]) == player) {
                activeCount++;
            }
        }

        uint256[] memory activeChips = new uint256[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allChips.length; i++) {
            if (chips[allChips[i]].isActive && ownerOf(allChips[i]) == player) {
                activeChips[index++] = allChips[i];
            }
        }

        return activeChips;
    }

    /**
     * @dev Get total value of player's active chips
     */
    function getPlayerChipValue(address player) external view returns (uint256) {
        uint256[] memory allChips = playerChips[player];
        uint256 totalValue = 0;

        for (uint256 i = 0; i < allChips.length; i++) {
            if (chips[allChips[i]].isActive && ownerOf(allChips[i]) == player) {
                totalValue += chips[allChips[i]].value;
            }
        }

        return totalValue;
    }

    /**
     * @dev Deactivate chip (for game use)
     */
    function deactivateChip(uint256 tokenId) external {
        require(
            ownerOf(tokenId) == msg.sender || authorizedGames[msg.sender] || msg.sender == owner(),
            "Not authorized"
        );
        require(chips[tokenId].isActive, "Already inactive");
        
        chips[tokenId].isActive = false;
        emit ChipDeactivated(tokenId);
    }

    /**
     * @dev Activate chip
     */
    function activateChip(uint256 tokenId) external {
        require(
            ownerOf(tokenId) == msg.sender || authorizedGames[msg.sender] || msg.sender == owner(),
            "Not authorized"
        );
        require(!chips[tokenId].isActive, "Already active");
        
        chips[tokenId].isActive = true;
        emit ChipActivated(tokenId);
    }

    /**
     * @dev Authorize game contract
     */
    function setGameAuthorization(address gameContract, bool authorized) external onlyOwner {
        authorizedGames[gameContract] = authorized;
    }

    /**
     * @dev Withdraw funds
     */
    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Transfer failed");
    }

    function _determineRarity(uint256 payment) internal pure returns (string memory) {
        if (payment >= EPIC_VALUE) return "Epic";
        if (payment >= RARE_VALUE) return "Rare";
        return "Common";
    }

    function _determineValue(uint256 payment) internal pure returns (uint256) {
        if (payment >= EPIC_VALUE) return EPIC_VALUE;
        if (payment >= RARE_VALUE) return RARE_VALUE;
        return COMMON_VALUE;
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        
        if (from != address(0)) {
            _removeChipFromPlayer(from, tokenId);
        }
        
        if (to != address(0)) {
            playerChips[to].push(tokenId);
        }
        
        return super._update(to, tokenId, auth);
    }

    function _removeChipFromPlayer(address player, uint256 tokenId) internal {
        uint256[] storage playerChipsArray = playerChips[player];
        for (uint256 i = 0; i < playerChipsArray.length; i++) {
            if (playerChipsArray[i] == tokenId) {
                playerChipsArray[i] = playerChipsArray[playerChipsArray.length - 1];
                playerChipsArray.pop();
                break;
            }
        }
    }
}