-- Seed data for the Web3 Poker Game

-- Insert sample players
INSERT INTO players (wallet_address, username, total_chips, games_played, games_won) VALUES
('0x1234567890123456789012345678901234567890', 'CryptoAce', 50.5, 25, 12),
('0x0987654321098765432109876543210987654321', 'BlockchainBob', 75.2, 18, 8),
('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', 'EthereumEve', 32.8, 15, 7),
('0x1111222233334444555566667777888899990000', 'PokerPro', 120.0, 40, 22)
ON CONFLICT (wallet_address) DO NOTHING;

-- Insert sample NFT chips
INSERT INTO nft_chips (token_id, contract_address, owner_address, chip_value, rarity) VALUES
(1001, '0x742d35Cc6634C0532925a3b8D4C9db96DfB3f681', '0x1234567890123456789012345678901234567890', 0.5, 'Common'),
(1002, '0x742d35Cc6634C0532925a3b8D4C9db96DfB3f681', '0x1234567890123456789012345678901234567890', 1.0, 'Rare'),
(1003, '0x742d35Cc6634C0532925a3b8D4C9db96DfB3f681', '0x0987654321098765432109876543210987654321', 2.5, 'Epic'),
(1004, '0x742d35Cc6634C0532925a3b8D4C9db96DfB3f681', '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', 5.0, 'Legendary'),
(1005, '0x742d35Cc6634C0532925a3b8D4C9db96DfB3f681', '0x1111222233334444555566667777888899990000', 0.25, 'Common')
ON CONFLICT (token_id) DO NOTHING;

-- Insert sample game sessions
INSERT INTO game_sessions (session_id, max_players, current_players, small_blind, big_blind, buy_in, status) VALUES
('game-001', 6, 3, 0.01, 0.02, 1.0, 'active'),
('game-002', 8, 2, 0.05, 0.1, 5.0, 'waiting'),
('game-003', 10, 8, 0.1, 0.2, 10.0, 'active')
ON CONFLICT (session_id) DO NOTHING;

-- Insert sample game participants
INSERT INTO game_participants (session_id, player_address, seat_position, chips_in_play) VALUES
('game-001', '0x1234567890123456789012345678901234567890', 1, 1.0),
('game-001', '0x0987654321098765432109876543210987654321', 3, 1.0),
('game-001', '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', 5, 1.0),
('game-002', '0x1111222233334444555566667777888899990000', 2, 5.0),
('game-002', '0x1234567890123456789012345678901234567890', 4, 5.0)
ON CONFLICT DO NOTHING;
