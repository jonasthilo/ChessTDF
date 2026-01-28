Chess Tower Defense

---

## Overview
Web 2D chess‑themed tower defense in TypeScript.  
Core loop: place towers → spawn waves → enemies move left→right → protect lives.

---

## Tech Stack
Frontend: React, TypeScript, PixiJS (60 FPS), Zustand, Vite  
Backend: Node.js, Express, TypeScript  
Database: PostgreSQL 16 (Docker, persistent volumes)

---

## Principles
Maintain: KISS, YAGNI, DRY  
Team: ownership, initiative, collaboration  
Rules: no emojis in code  
TS strict: strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, noPropertyAccessFromIndexSignature, useUnknownInCatchVariables

---

## Dev Practices
- Group related edits per file
- Bump minor version in front/backend after breaking changes, patch after fixes/features
- Frontend/Backend auto-reload on code changes (no restart needed)
- Only restart containers for: database schema changes, dependency installs, or when debugging issues
- Test modified components: MCP Playwright for frontend, call API endpoints for backend
- Update this file after relevant changes  

---

## Architecture
Client: real‑time gameplay, input, rendering at 60 FPS  
Server: authoritative validation for placement, waves, rules  
Pattern: service layer + data‑driven design + simplified ECS  

---

## Project Layout
Frontend: components/, game/, state/gameStore, services/gameApi  
Backend: routes/, controllers/, services/, database/  

---

## Frontend Mapping

| Question | Location |
|----------|----------|
| Change game state | state/gameStore.ts |
| Call backend API | state/gameStore.ts |
| Validate rules | state/gameStore.ts |
| Loop timing | game/GameEngine.ts |
| Entity math | game/systems/ |
| Grid math | game/managers/ |
| UI | components/ |

state/gameStore.ts = single source of truth  
game/GameEngine.ts = loop timing + system execution  

---

## API Summary
Game: config, start, state, build/upgrade/sell towers, start wave, end session
Config: tower definitions with levels, enemy definitions, game settings (merged from Definitions + Settings)
Statistics: summary, recent, top scores  

---

## Game Systems
Entities: Tower, Enemy, Projectile (data only)  
Systems: EnemySystem, TowerSystem, ProjectileSystem, CollisionSystem  
Loop: 60 FPS → systems update → PixiJS renders  

---

## Data Model
Definitions stored in PostgreSQL
Tables: enemy_definitions, tower_definitions, tower_levels, game_settings, game_sessions, game_statistics
All IDs: Integer (SERIAL primary keys)
Tower IDs: 1=Basic, 2=Sniper, 3=Rapid
Enemy IDs: 1=Pawn, 2=Knight, 3=Bishop, 4=Rook, 5=Queen, 6=King
Flow: DB → repository → service → API → system → UI  

---

## Design Choices
Placement: click to select, click to place  
Path: left→right straight line  
Graphics: geometric shapes, color‑coded by piece  

---

## Docker Workflow
Environment: Node v24.13.0, PostgreSQL 16, Docker Compose network "chess-tdf-network"  
Copy .env.example → .env (never commit .env)

### Commands
docker-compose up -d
docker-compose logs -f
docker-compose down -v

### Install
docker-compose exec backend npm install <package>
docker-compose exec frontend npm install <package>

### DB tools
docker-compose exec postgres psql -U chess_user -d chess_tdf

### Testing
MCP Playwright for testing frotend
Test API endpoints by calling them
docker-compose exec backend npm test

Test suite: `backend/src/tests/backend-test.ts` (52 tests)
Covers: Database, Repositories, Services, API endpoints


### Health endpoint
GET /health - returns status, db connection, latency (503 if db down)

## Access
Frontend: http://localhost:3002
Backend: http://localhost:3001
Postgres: localhost:5432

## Current Version
Frontend: v1.2.0
Backend: v1.2.0
Status: Integer ID migration complete, fully functional

---

## Open Tasks
- Move wave config into DB (deprecate data/waveDefinitions.ts)
- Remove unused objects, clean data/
- Test 50+ enemies, add object pooling
- Tune tower costs + enemy stats
- Post‑MVP: area effects, curved paths, maps, achievements, graphics, audio, auto waves  

---

## Critical Files

### Backend
- `database/init.sql` - Database schema + tower_levels seed data
- `database/repositories/` - Data access layer
- `services/ConfigService.ts` - Tower/enemy/settings logic
- `services/GameService.ts` - Game session + tower building
- `services/WaveService.ts` - Wave progression
- `controllers/ConfigController.ts` - Config API endpoints
- `controllers/GameController.ts` - Game API endpoints

### Frontend
- `types/index.ts` - Type definitions (Tower, TowerLevel, TowerStats, etc.)
- `services/gameApi.ts` - Backend API client
- `state/gameStore.ts` - Zustand state management (single source of truth)
- `game/GameEngine.ts` - 60 FPS game loop
- `game/systems/TowerSystem.ts` - Tower combat logic
- `game/rendering/SpriteFactory.ts` - PixiJS sprite creation
- `components/hud/TowerModal.tsx` - Tower upgrade UI
- `components/hud/TowerPanel.tsx` - Tower selection UI
- `components/screens/SettingsScreen.tsx` - Settings + Tower Levels editor

---

## Key Features

### Database-Driven Configuration
- Tower stats stored in PostgreSQL, fully editable
- Tower level progression (cost, damage, range, fire rate) configurable via Settings UI
- Enemy definitions and game settings editable in-game

### Tower System
- Integer-based IDs (1=Basic, 2=Sniper, 3=Rapid)
- Multi-level upgrades with database-stored stats
- Click to select, click to place
- Visual range indicators on hover
- Upgrade/sell via modal UI

### Enemy System
- Integer-based IDs (1=Pawn, 2=Knight, 3=Bishop, 4=Rook, 5=Queen, 6=King)
- Straight-line left-to-right pathing
- Wave-based spawning
- Collision detection with projectiles

### API Structure
- Unified Config API: `/api/config/towers`, `/api/config/enemies`, `/api/config/settings`
- Tower Levels CRUD: `/api/config/towers/:towerId/levels`
- Game Session API: `/api/game/start`, `/api/game/:gameId/tower`, `/api/game/:gameId/wave`
- Statistics API: `/api/statistics/summary`, `/api/statistics/recent`, `/api/statistics/top-scores`