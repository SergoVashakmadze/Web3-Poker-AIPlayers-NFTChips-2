-- Create tables for the Web3 Poker Game

-- Players table
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    username VARCHAR(50),
    total_chips DECIMAL(18, 8) DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NFT Chips table
CREATE TABLE IF NOT EXISTS nft_chips (
    id SERIAL PRIMARY KEY,
    token_id INTEGER UNIQUE NOT NULL,
    contract_address VARCHAR(42) NOT NULL,
    owner_address VARCHAR(42) NOT NULL,
    chip_value DECIMAL(18, 8) NOT NULL,
    rarity VARCHAR(20) NOT NULL,
    is_tradeable BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_address) REFERENCES players(wallet_address)
);

-- Game Sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(36) UNIQUE NOT NULL,
    max_players INTEGER DEFAULT 8,
    current_players INTEGER DEFAULT 0,
    small_blind DECIMAL(18, 8) NOT NULL,
    big_blind DECIMAL(18, 8) NOT NULL,
    buy_in DECIMAL(18, 8) NOT NULL,
    status VARCHAR(20) DEFAULT 'waiting',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Game Participants table
CREATE TABLE IF NOT EXISTS game_participants (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    player_address VARCHAR(42) NOT NULL,
    seat_position INTEGER NOT NULL,
    chips_in_play DECIMAL(18, 8) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES game_sessions(session_id),
    FOREIGN KEY (player_address) REFERENCES players(wallet_address)
);

-- Chip Trades table
CREATE TABLE IF NOT EXISTS chip_trades (
    id SERIAL PRIMARY KEY,
    token_id INTEGER NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    trade_price DECIMAL(18, 8) NOT NULL,
    transaction_hash VARCHAR(66),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (token_id) REFERENCES nft_chips(token_id),
    FOREIGN KEY (from_address) REFERENCES players(wallet_address),
    FOREIGN KEY (to_address) REFERENCES players(wallet_address)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_players_wallet ON players(wallet_address);
CREATE INDEX IF NOT EXISTS idx_nft_chips_owner ON nft_chips(owner_address);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chip_trades_status ON chip_trades(status);
