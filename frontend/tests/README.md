# Chess Tower Defense - Frontend Tests

This directory contains tests for the Chess Tower Defense frontend application.

## Test Files

### 1. `api-integration.test.ts`
Automated API integration tests that verify:
- Game configuration loading
- Game session creation
- Tower building
- Wave management
- Game state retrieval
- Error handling (invalid placements, insufficient coins)

### 2. `test-api.html`
Interactive browser-based API test page. Open this file in a browser to manually test all API endpoints with a visual interface.

## Running Tests

### Interactive Browser Tests

1. Ensure both backend and frontend servers are running:
   ```bash
   # Backend on port 3001
   docker ps | grep chess-backend

   # Frontend on port 3002
   docker ps | grep chess-frontend
   ```

2. Open the test page in your browser:
   - Navigate to: `http://localhost:3002/test-api.html`
   - Click individual test buttons or "Run All Tests" for full integration test

### Automated Tests

The TypeScript test file can be integrated with test runners like:
- **Vitest** (recommended for Vite projects)
- **Jest**
- **Mocha/Chai**

To set up Vitest:
```bash
npm install -D vitest
```

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest"
  }
}
```

## Test Coverage

### API Endpoints Tested
- ✅ `GET /api/game/config` - Load game configuration
- ✅ `POST /api/game/start` - Create new game session
- ✅ `POST /api/game/:id/tower` - Build tower
- ✅ `POST /api/game/:id/wave` - Start wave
- ✅ `GET /api/game/:id/state` - Get game state

### Validation Tests
- ✅ Invalid tower placement (restricted zones)
- ✅ Insufficient coins for tower building
- ✅ Occupied grid cell prevention
- ✅ Invalid game ID handling

## Expected Results

All tests should pass when:
1. Backend server is running on port 3001
2. Frontend server is running on port 3002
3. Docker containers are on the same network (`chess-network`)
4. API proxy is configured correctly in `vite.config.ts`

## Troubleshooting

### Tests Fail with Connection Refused
- Check that backend container is running: `docker ps | grep chess-backend`
- Verify backend logs: `docker logs chess-backend`
- Ensure containers are on same network: `docker network inspect chess-network`

### CORS Errors
- Verify Vite proxy configuration in `vite.config.ts`
- Check backend CORS settings in `backend/src/server.ts`

### API Returns 404
- Verify API base URL is correct (`/api`)
- Check backend route definitions in `backend/src/routes/gameRoutes.ts`
