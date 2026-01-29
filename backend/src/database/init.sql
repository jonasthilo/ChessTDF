-- Chess Tower Defense Database Schema
-- PostgreSQL Initialization Script

-- Enable UUID extension (for game sessions)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: tower_definitions
-- Stores tower type metadata (no stats - those are in tower_levels)
CREATE TABLE IF NOT EXISTS tower_definitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(20) NOT NULL,
    description TEXT,
    max_level INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: tower_levels
-- Stores per-level stats for each tower type
-- Level 1 = base tower, Level 2+ = upgrades
CREATE TABLE IF NOT EXISTS tower_levels (
    id SERIAL PRIMARY KEY,
    tower_id INTEGER NOT NULL REFERENCES tower_definitions(id) ON DELETE CASCADE,
    level INTEGER NOT NULL,
    cost INTEGER NOT NULL,
    damage INTEGER NOT NULL,
    range INTEGER NOT NULL,
    fire_rate DECIMAL(4,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tower_id, level)
);

-- Table: enemy_definitions
-- Stores enemy type configurations
CREATE TABLE IF NOT EXISTS enemy_definitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    health INTEGER NOT NULL,
    speed INTEGER NOT NULL,
    reward INTEGER NOT NULL,
    color VARCHAR(20) NOT NULL,
    size INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: game_settings
-- Stores game configuration and balance settings
CREATE TABLE IF NOT EXISTS game_settings (
    id SERIAL PRIMARY KEY,
    mode VARCHAR(20) NOT NULL UNIQUE, -- 'easy', 'normal', 'hard', 'custom'
    initial_coins INTEGER NOT NULL DEFAULT 200,
    initial_lives INTEGER NOT NULL DEFAULT 10,
    tower_cost_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    enemy_health_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    enemy_speed_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    enemy_reward_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    enemy_health_wave_multiplier DECIMAL(4,3) NOT NULL DEFAULT 0.100,
    enemy_reward_wave_multiplier DECIMAL(4,3) NOT NULL DEFAULT 0.050,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: wave_definitions
-- Stores wave composition per wave number
CREATE TABLE IF NOT EXISTS wave_definitions (
    id SERIAL PRIMARY KEY,
    wave_number INTEGER NOT NULL,
    enemy_id INTEGER NOT NULL REFERENCES enemy_definitions(id),
    count INTEGER NOT NULL DEFAULT 1,
    spawn_delay_ms INTEGER NOT NULL DEFAULT 500,
    difficulty_label VARCHAR(20) NOT NULL DEFAULT 'normal',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wave_number, enemy_id)
);

-- Table: game_sessions
-- Stores active and completed game sessions
CREATE TABLE IF NOT EXISTS game_sessions (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(36) NOT NULL UNIQUE DEFAULT uuid_generate_v4()::text,
    settings_id INTEGER REFERENCES game_settings(id) ON DELETE SET NULL,
    game_mode VARCHAR(20) NOT NULL DEFAULT 'endless', -- '10waves', '20waves', 'endless'
    current_wave INTEGER NOT NULL DEFAULT 0,
    waves_completed INTEGER NOT NULL DEFAULT 0,
    coins INTEGER NOT NULL DEFAULT 200,
    lives INTEGER NOT NULL DEFAULT 10,
    towers JSONB DEFAULT '[]',
    enemies_killed INTEGER NOT NULL DEFAULT 0,
    coins_earned INTEGER NOT NULL DEFAULT 0,
    coins_spent INTEGER NOT NULL DEFAULT 0,
    damage_dealt INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'active' -- 'active', 'completed', 'abandoned'
);

-- Table: game_statistics
-- Stores completed game statistics for analytics
CREATE TABLE IF NOT EXISTS game_statistics (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(36) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duration INTEGER NOT NULL, -- milliseconds
    outcome VARCHAR(10) NOT NULL, -- 'win', 'loss'
    game_mode VARCHAR(20) NOT NULL, -- '10waves', '20waves', 'endless'
    final_wave INTEGER NOT NULL,
    waves_completed INTEGER NOT NULL,
    enemies_killed_total INTEGER NOT NULL,
    enemies_killed_by_type JSONB NOT NULL DEFAULT '{}',
    towers_built_total INTEGER NOT NULL,
    towers_built_by_type JSONB NOT NULL DEFAULT '{}',
    coins_earned INTEGER NOT NULL,
    coins_spent INTEGER NOT NULL,
    damage_dealt INTEGER NOT NULL,
    settings_id INTEGER REFERENCES game_settings(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tower_levels_tower_id ON tower_levels(tower_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_id ON game_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_game_statistics_game_id ON game_statistics(game_id);
CREATE INDEX IF NOT EXISTS idx_game_statistics_timestamp ON game_statistics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_game_statistics_outcome ON game_statistics(outcome);
CREATE INDEX IF NOT EXISTS idx_game_statistics_game_mode ON game_statistics(game_mode);
CREATE INDEX IF NOT EXISTS idx_wave_definitions_wave ON wave_definitions(wave_number);

-- Insert default tower definitions (metadata only)
INSERT INTO tower_definitions (name, color, description, max_level)
VALUES
    ('Basic Tower', '#607D8B', 'Balanced tower for general defense', 5),
    ('Sniper Tower', '#1565C0', 'Long range, high damage, slow firing', 3),
    ('Rapid Tower', '#7CB342', 'Fast firing, low damage, short range', 4)
ON CONFLICT (name) DO NOTHING;

-- Insert default tower levels (level 1 = base, level 2+ = upgrades)
-- Basic Tower: 5 levels (tower_id=1)
INSERT INTO tower_levels (tower_id, level, cost, damage, range, fire_rate)
VALUES
    (1, 1, 25, 20, 120, 1.00),
    (1, 2, 38, 30, 135, 1.10),
    (1, 3, 56, 40, 150, 1.20),
    (1, 4, 84, 50, 165, 1.30),
    (1, 5, 126, 60, 180, 1.40),
    -- Sniper Tower: 3 levels (tower_id=2)
    (2, 1, 75, 80, 250, 0.50),
    (2, 2, 150, 110, 275, 0.55),
    (2, 3, 300, 140, 300, 0.60),
    -- Rapid Tower: 4 levels (tower_id=3)
    (3, 1, 50, 10, 100, 3.00),
    (3, 2, 70, 15, 110, 3.30),
    (3, 3, 98, 20, 120, 3.60),
    (3, 4, 137, 25, 130, 3.90)
ON CONFLICT (tower_id, level) DO NOTHING;

-- Insert default enemy definitions
INSERT INTO enemy_definitions (name, description, health, speed, reward, color, size)
VALUES
    ('Pawn', 'Weak but numerous foot soldier', 50, 60, 15, '#4CAF50', 20),
    ('Knight', 'Fast moving cavalry unit', 100, 120, 35, '#2196F3', 25),
    ('Bishop', 'Agile diagonal attacker', 80, 90, 30, '#9C27B0', 28),
    ('Rook', 'Slow but heavily armored', 200, 50, 70, '#FF9800', 30),
    ('Queen', 'Powerful versatile unit', 300, 80, 120, '#F44336', 35),
    ('King', 'Ultimate boss unit', 500, 40, 250, '#FFC107', 40)
ON CONFLICT (name) DO NOTHING;

-- Insert default wave definitions
INSERT INTO wave_definitions (wave_number, enemy_id, count, spawn_delay_ms, difficulty_label) VALUES
    -- Wave 1: 7 pawns
    (1, 1, 7, 800, 'easy'),
    -- Wave 2: 9 pawns
    (2, 1, 9, 800, 'easy'),
    -- Wave 3: 11 pawns
    (3, 1, 11, 800, 'easy'),
    -- Wave 4: 8 pawns + 3 knights
    (4, 1, 8, 600, 'medium'),
    (4, 2, 3, 1000, 'medium'),
    -- Wave 5: 8 pawns + 3 knights
    (5, 1, 8, 600, 'medium'),
    (5, 2, 3, 1000, 'medium'),
    -- Wave 6: 8 pawns + 3 knights
    (6, 1, 8, 600, 'medium'),
    (6, 2, 3, 1000, 'medium'),
    -- Wave 7: mixed (4 of each basic type)
    (7, 1, 4, 500, 'hard'),
    (7, 2, 4, 500, 'hard'),
    (7, 3, 4, 500, 'hard'),
    (7, 4, 3, 500, 'hard'),
    -- Wave 8: similar mixed
    (8, 1, 4, 500, 'hard'),
    (8, 2, 4, 500, 'hard'),
    (8, 3, 4, 500, 'hard'),
    (8, 4, 3, 500, 'hard'),
    -- Wave 9: harder mixed
    (9, 1, 3, 450, 'hard'),
    (9, 2, 4, 450, 'hard'),
    (9, 3, 4, 450, 'hard'),
    (9, 4, 4, 450, 'hard'),
    -- Wave 10: introduce queen + king
    (10, 1, 3, 450, 'hard'),
    (10, 2, 3, 450, 'hard'),
    (10, 3, 3, 450, 'hard'),
    (10, 4, 3, 450, 'hard'),
    (10, 5, 2, 450, 'hard'),
    (10, 6, 1, 450, 'hard'),
    -- Wave 11+: all types, heavy (used for waves beyond max defined)
    (11, 1, 5, 400, 'extreme'),
    (11, 2, 4, 400, 'extreme'),
    (11, 3, 4, 400, 'extreme'),
    (11, 4, 4, 400, 'extreme'),
    (11, 5, 2, 400, 'extreme'),
    (11, 6, 1, 400, 'extreme')
ON CONFLICT (wave_number, enemy_id) DO NOTHING;

-- Insert default game settings presets
INSERT INTO game_settings (mode, initial_coins, initial_lives, tower_cost_multiplier, enemy_health_multiplier, enemy_speed_multiplier, enemy_reward_multiplier, enemy_health_wave_multiplier, enemy_reward_wave_multiplier)
VALUES
    ('easy', 400, 15, 0.80, 0.80, 0.80, 1.50, 0.080, 0.040),
    ('normal', 300, 10, 1.00, 1.00, 1.00, 1.00, 0.100, 0.050),
    ('hard', 200, 7, 1.20, 1.50, 1.20, 0.75, 0.150, 0.070)
ON CONFLICT (mode) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update last_updated timestamp (for game_sessions)
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at timestamps
CREATE TRIGGER update_tower_definitions_updated_at
BEFORE UPDATE ON tower_definitions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tower_levels_updated_at
BEFORE UPDATE ON tower_levels
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enemy_definitions_updated_at
BEFORE UPDATE ON enemy_definitions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_settings_updated_at
BEFORE UPDATE ON game_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wave_definitions_updated_at
BEFORE UPDATE ON wave_definitions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_sessions_last_updated
BEFORE UPDATE ON game_sessions
FOR EACH ROW
EXECUTE FUNCTION update_last_updated_column();

-- Grant permissions (adjust if needed for production)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO chess_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO chess_user;
