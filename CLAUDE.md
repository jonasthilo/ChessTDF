Chess Tower Defense — Web 2D chess-themed TD in TypeScript. Place towers, spawn waves, enemies move left→right, protect lives.

## Tech Stack
Frontend: React 19, TypeScript, PixiJS 8, Zustand 5, React Router 7, Vite 7
Backend: Node 24, Express 5, TypeScript, PostgreSQL 16 (Docker)

## Principles
TS strict: strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, noPropertyAccessFromIndexSignature, useUnknownInCatchVariables
KISS, YAGNI, DRY. Auto-reload on code changes. Only restart containers for DB schema, deps, or debugging.

## File Mapping

| Area | Location |
|------|----------|
| Game state + API calls | `state/gameStore.ts` (single source of truth) |
| Game loop + systems | `game/GameEngine.ts` → systems/ (Enemy, Tower, Projectile, Collision) |
| Grid/path math | `game/managers/GridManager.ts`, `PathManager.ts` |
| Rendering | `game/rendering/PixiRenderer.ts`, `SpriteFactory.ts`, `HealthBarRenderer.ts` |
| Assets | `game/managers/AssetLoader.ts` (chess piece SVGs) |
| Game config | `config/gameConfig.ts` (grid 20x10, restricted rows [4,5], canvas 1200x600) |
| Routing | `App.tsx` (`/`→Main, `/settings`, `/statistics`, `/game/:gameId`, `*`→redirect) |
| Screens | `components/screens/` (MainScreen, GameScreen, SettingsScreen, StatisticsScreen) |
| HUD | `components/hud/` (TowerPanel, TowerModal, EnemyStatsPanel, GameControls, PlayerStats, WaveInfo, EndGameModal, ViewportWarning) |
| Common UI | `components/common/` (ScreenLayout, AppNav, DifficultySelector, VersionDisplay, NumberField, TextField) |
| Settings editors | `components/screens/settings/` (TowerEditor, EnemyEditor, SettingsEditor, TowerLevelEditor) |
| Styles | `styles/variables.css`, `styles/shared.css` (`.btn` + `.btn-gold`/`.btn-dark`/`.btn-danger`/`.btn-ghost`, `.btn-sm`/`.btn-lg`), `styles/animations.css` |
| Types | `types/index.ts` (frontend), `backend/src/types/index.ts` |
| Utils | `utils/pieceAssets.ts` (piece maps, images), `utils/math.ts` (distance), `utils/string.ts` (capitalize) |
| API client | `services/gameApi.ts` (axios) |
| DB schema + seed | `backend/src/database/init.sql` |
| Repositories | `backend/src/database/repositories/` (Tower, Enemy, Settings, GameSession, Statistics, Wave) |
| DB helpers | `backend/src/database/helpers.ts` (buildUpdateFields) |
| Services | `backend/src/services/` (GameService, ConfigService, WaveService, StatisticsService) |
| Controllers | `backend/src/controllers/` (GameController, ConfigController, StatisticsController, helpers.ts) |
| Routes + Swagger | `backend/src/routes/` + `routes/swagger/` |
| Docs | `frontend/COORDINATE_SYSTEM.md`, `frontend/BUTTON_SYSTEM.md` |

## Data Model
Tables: tower_definitions, tower_levels, enemy_definitions, wave_definitions, game_settings, game_sessions, game_statistics
Tower IDs: 1=Morphy(pawn/single), 2=Carlsen(rook/pierce), 3=Tal(knight/slow+splash), 4=Kasparov(bishop/chain+poison), 5=Fischer(queen/multi+mark), 6=Petrosian(king/aura)
Enemy IDs: 1=Pawn, 2=Knight, 3=Bishop, 4=Rook, 5=Queen, 6=King
Game modes: `10waves | 20waves | endless` | Difficulty: `easy | normal | hard | custom`
Waves defined up to 11; beyond 11 reuses wave 11 composition. Sell refund = 70% total invested.
Flow: DB → repository → service → controller → API → frontend store → systems → renderer

## API Endpoints

| Route | Methods |
|-------|---------|
| `/api/game/start` | POST (gameMode, difficulty) |
| `/api/game/config` | GET (towers + enemies) |
| `/api/game/:gameId/state` | GET |
| `/api/game/:gameId/tower` | POST (build) |
| `/api/game/:gameId/tower/:id/upgrade` | POST |
| `/api/game/:gameId/tower/:id` | DELETE (sell) |
| `/api/game/:gameId/wave` | POST (start wave) |
| `/api/game/:gameId/end` | POST |
| `/api/game/:gameId/coins` | POST (add) |
| `/api/game/:gameId/life/lose` | POST |
| `/api/config/towers` | GET, PATCH `:id` |
| `/api/config/towers/:towerId/levels` | GET, PUT `:level`, DELETE `:level` |
| `/api/config/enemies` | GET, GET `:id`, PATCH `:id` |
| `/api/config/settings` | GET, POST, GET `:mode`, GET `id/:id`, PATCH `:id` |
| `/api/statistics` | GET, POST, `/summary`, `/recent`, `/top-scores`, `/game/:gameId`, `/outcome/:o`, `/mode/:m`, `/period` |
| `/health` | GET (status, db latency; 503 if down) |
| `/api-docs` | Swagger UI |

## Docker
Env: Node 24, PostgreSQL 16, network `chess-tdf-network`. Copy `.env.example` → `.env`.
```
docker-compose up -d                              # start
docker-compose logs -f                            # logs
docker-compose down -v                            # stop + remove volumes
docker-compose exec backend npm install <pkg>     # install backend dep
docker-compose exec frontend npm install <pkg>    # install frontend dep
docker-compose exec postgres psql -U chess_user -d chess_tdf  # DB shell
docker-compose exec frontend npm run lint         # lint frontend
docker-compose exec backend npm run lint          # lint backend
docker-compose exec frontend npm run format       # format frontend
docker-compose exec backend npm run format        # format backend
npm run knip                                      # dead code (project root)
```
Frontend: http://localhost:3002 | Backend: http://localhost:3001 | Postgres: localhost:5432

## Testing
Playwright MCP (standalone, visible browser) for frontend. Docker Toolkit Playwright only when explicitly asked.
Backend: `docker-compose exec backend npm test` — 110 tests in `backend/src/tests/backend-test.ts`
Covers: DB, repositories, services, API endpoints (incl. error cases). Dynamic DB lookups, no hardcoded values.
Frontend unit test: `frontend/src/game/managers/GridManager.test.ts`

## Versioning
Git short hash via Vite `__GIT_HASH__` define. package.json versions = 0.0.0 (unused). Status: fully functional.

## Open Tasks
- Test 50+ enemies, add object pooling
- Tune tower costs + enemy stats
- Post-MVP: area effects, curved paths, maps, achievements, graphics, audio, auto waves
