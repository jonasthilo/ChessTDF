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
    attack_type VARCHAR(20) NOT NULL DEFAULT 'single', -- single | pierce | splash | chain | multi | aura
    projectile_type VARCHAR(20) NOT NULL DEFAULT 'homing', -- homing | ballistic | lob
    default_targeting VARCHAR(20) NOT NULL DEFAULT 'first', -- first | last | nearest | strongest | weakest
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
    -- Projectile properties
    projectile_speed INTEGER NOT NULL DEFAULT 400,
    -- Splash properties (for splash/single with splash_chance)
    splash_radius INTEGER NOT NULL DEFAULT 0,
    splash_chance INTEGER NOT NULL DEFAULT 0, -- 0-100%
    -- Multi-target properties
    chain_count INTEGER NOT NULL DEFAULT 0,
    pierce_count INTEGER NOT NULL DEFAULT 0,
    target_count INTEGER NOT NULL DEFAULT 1,
    -- Status effect properties
    status_effect VARCHAR(20) NOT NULL DEFAULT 'none', -- none | slow | poison | armor_shred | mark
    effect_duration INTEGER NOT NULL DEFAULT 0, -- milliseconds
    effect_strength INTEGER NOT NULL DEFAULT 0, -- percentage (e.g., 20 = 20% slow, or DPS for poison)
    -- Aura properties (for King tower)
    aura_radius INTEGER NOT NULL DEFAULT 0,
    aura_effect VARCHAR(20) NOT NULL DEFAULT 'none', -- none | damage_buff | speed_buff | range_buff
    aura_strength INTEGER NOT NULL DEFAULT 0, -- percentage (e.g., 15 = 1.15x multiplier)
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
-- Tower IDs map to chess pieces: 1=Pawn, 2=Rook, 3=Knight, 4=Bishop, 5=Queen, 6=King
INSERT INTO tower_definitions (name, color, description, max_level, attack_type, projectile_type, default_targeting)
VALUES
    ('Morphy Tower', '#607D8B', 'The foundation of any defense. Balanced and reliable, like the father of modern chess.', 5, 'single', 'homing', 'first'),
    ('Carlsen Tower', '#1565C0', 'Precise piercing shots that see far ahead and pass through multiple enemies.', 3, 'pierce', 'homing', 'first'),
    ('Tal Tower', '#7CB342', 'The Magician strikes fast with tactical slows and surprising splash damage.', 4, 'single', 'homing', 'nearest'),
    ('Kasparov Tower', '#9C27B0', 'Powerful chain attacks bounce between enemies, leaving poison in their wake.', 4, 'chain', 'homing', 'nearest'),
    ('Fischer Tower', '#F44336', 'Dominant multi-target attacks mark enemies for devastating follow-up damage.', 3, 'multi', 'homing', 'strongest'),
    ('Petrosian Tower', '#FFC107', 'Iron defense that buffs nearby towers with a powerful damage aura.', 3, 'aura', 'homing', 'nearest')
ON CONFLICT (name) DO NOTHING;

-- Insert default tower levels (level 1 = base, level 2+ = upgrades)
-- Design philosophy: Rock-paper-scissors trade-offs, not all stats increase every level
-- Columns: tower_id, level, cost, damage, range, fire_rate, projectile_speed,
--          splash_radius, splash_chance, chain_count, pierce_count, target_count,
--          status_effect, effect_duration, effect_strength, aura_radius, aura_effect, aura_strength
INSERT INTO tower_levels (tower_id, level, cost, damage, range, fire_rate, projectile_speed,
    splash_radius, splash_chance, chain_count, pierce_count, target_count,
    status_effect, effect_duration, effect_strength, aura_radius, aura_effect, aura_strength)
VALUES
    -- Morphy Tower (Pawn) - Balanced foundation, cheap & reliable
    -- Trade-off: Jack of all trades, master of none. No special effects.
    (1, 1, 30, 20, 120, 1.00, 400, 0, 0, 0, 0, 1, 'none', 0, 0, 0, 'none', 0),
    (1, 2, 40, 28, 120, 1.10, 400, 0, 0, 0, 0, 1, 'none', 0, 0, 0, 'none', 0),
    (1, 3, 60, 36, 130, 1.20, 400, 0, 0, 0, 0, 1, 'none', 0, 0, 0, 'none', 0),
    (1, 4, 90, 45, 130, 1.30, 400, 0, 0, 0, 0, 1, 'none', 0, 0, 0, 'none', 0),
    (1, 5, 150, 70, 150, 1.50, 420, 0, 0, 0, 0, 1, 'none', 0, 0, 0, 'none', 0),
    -- Carlsen Tower (Rook) - Long range pierce, slow but devastating
    -- Trade-off: Overkills single weak enemies, shine against lines. Range stays high.
    (2, 1, 80, 70, 250, 0.45, 500, 0, 0, 0, 2, 1, 'none', 0, 0, 0, 'none', 0),
    (2, 2, 160, 90, 250, 0.50, 520, 0, 0, 0, 3, 1, 'none', 0, 0, 0, 'none', 0),
    (2, 3, 350, 120, 280, 0.55, 540, 0, 0, 0, 5, 1, 'none', 0, 0, 0, 'none', 0),
    -- Tal Tower (Knight) - Fast utility, slows & splashes, LOW damage
    -- Trade-off: Crowd control specialist, nearly useless vs bosses. Short range.
    (3, 1, 45, 8, 100, 2.50, 350, 45, 10, 0, 0, 1, 'slow', 2000, 15, 0, 'none', 0),
    (3, 2, 65, 10, 100, 2.80, 350, 55, 20, 0, 0, 1, 'slow', 2500, 20, 0, 'none', 0),
    (3, 3, 95, 12, 110, 3.10, 360, 65, 30, 0, 0, 1, 'slow', 3000, 25, 0, 'none', 0),
    (3, 4, 160, 15, 110, 3.50, 370, 80, 50, 0, 0, 1, 'slow', 4000, 35, 0, 'none', 0),
    -- Kasparov Tower (Bishop) - Chain lightning + poison DOT
    -- Trade-off: Great vs clusters, weak vs spread enemies. Poison is the real damage.
    (4, 1, 55, 20, 140, 0.75, 380, 0, 0, 2, 0, 1, 'poison', 2500, 4, 0, 'none', 0),
    (4, 2, 85, 25, 140, 0.80, 390, 0, 0, 3, 0, 1, 'poison', 3000, 6, 0, 'none', 0),
    (4, 3, 130, 30, 150, 0.85, 400, 0, 0, 4, 0, 1, 'poison', 3500, 10, 0, 'none', 0),
    (4, 4, 220, 40, 160, 0.95, 420, 0, 0, 6, 0, 1, 'poison', 4000, 15, 0, 'none', 0),
    -- Fischer Tower (Queen) - Multi-target + mark for team damage bonus
    -- Trade-off: Expensive force multiplier. Mediocre alone, devastating with allies.
    (5, 1, 110, 35, 150, 0.65, 400, 0, 0, 0, 0, 2, 'mark', 3500, 12, 0, 'none', 0),
    (5, 2, 220, 45, 160, 0.75, 420, 0, 0, 0, 0, 3, 'mark', 4000, 18, 0, 'none', 0),
    (5, 3, 450, 60, 170, 0.85, 440, 0, 0, 0, 0, 5, 'mark', 5000, 30, 0, 'none', 0),
    -- Petrosian Tower (King) - Support aura, VERY weak personal damage
    -- Trade-off: Does almost nothing alone. Multiplies nearby tower damage.
    (6, 1, 100, 10, 90, 0.40, 280, 0, 0, 0, 0, 1, 'none', 0, 0, 100, 'damage_buff', 12),
    (6, 2, 200, 12, 90, 0.45, 290, 0, 0, 0, 0, 1, 'none', 0, 0, 140, 'damage_buff', 20),
    (6, 3, 450, 18, 100, 0.50, 300, 0, 0, 0, 0, 1, 'none', 0, 0, 200, 'damage_buff', 35)
ON CONFLICT (tower_id, level) DO NOTHING;

-- Insert default enemy definitions
INSERT INTO enemy_definitions (name, description, health, speed, reward, color, size)
VALUES
    ('Pawn', 'Weak but numerous foot soldier', 49, 60, 8, '#4CAF50', 20),
    ('Bishop', 'Agile diagonal attacker', 80, 90, 15, '#9C27B0', 28),
    ('Knight', 'Fast moving cavalry unit', 100, 120, 18, '#2196F3', 25),
    ('Rook', 'Slow but heavily armored', 200, 50, 35, '#FF9800', 30),
    ('Queen', 'Powerful versatile unit', 300, 80, 60, '#F44336', 35),
    ('King', 'Ultimate boss unit', 800, 30, 200, '#FFC107', 40)
ON CONFLICT (name) DO NOTHING;

-- Insert default wave definitions
INSERT INTO wave_definitions (wave_number, enemy_id, count, spawn_delay_ms, difficulty_label) VALUES
    (1, 1, 8, 800, 'easy'),
    (2, 1, 3, 700, 'easy'),
    (2, 2, 5, 600, 'easy'),
    (3, 1, 3, 700, 'medium'),
    (3, 3, 5, 600, 'medium'),
    (4, 1, 2, 600, 'medium'),
    (4, 2, 2, 600, 'medium'),
    (4, 4, 4, 800, 'medium'),
    (5, 1, 4, 500, 'hard'),
    (5, 2, 2, 500, 'hard'),
    (5, 6, 1, 2000, 'hard'),
    (6, 2, 5, 450, 'hard'),
    (6, 3, 5, 450, 'hard'),
    (7, 4, 3, 700, 'hard'),
    (7, 5, 2, 1000, 'hard'),
    (8, 1, 3, 450, 'hard'),
    (8, 2, 3, 450, 'hard'),
    (8, 3, 3, 450, 'hard'),
    (8, 4, 3, 500, 'hard'),
    (9, 2, 2, 500, 'extreme'),
    (9, 4, 3, 600, 'extreme'),
    (9, 5, 3, 800, 'extreme'),
    (10, 4, 4, 600, 'extreme'),
    (10, 5, 2, 800, 'extreme'),
    (10, 6, 2, 2500, 'extreme'),
    (11, 1, 3, 400, 'extreme'),
    (11, 2, 3, 400, 'extreme'),
    (11, 3, 3, 400, 'extreme'),
    (11, 4, 3, 500, 'extreme'),
    (11, 5, 2, 600, 'extreme'),
    (11, 6, 3, 2000, 'extreme')
ON CONFLICT (wave_number, enemy_id) DO NOTHING;

-- Insert default game settings presets
INSERT INTO game_settings (mode, initial_coins, initial_lives, enemy_health_wave_multiplier, enemy_reward_wave_multiplier)
VALUES
    ('easy', 250, 15, 0.080, 0.040),
    ('normal', 200, 10, 0.100, 0.050),
    ('hard', 150, 5, 0.150, 0.060)
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
