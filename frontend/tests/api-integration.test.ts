/**
 * API Integration Tests for Chess Tower Defense
 *
 * These tests verify that the frontend can communicate with the backend API.
 * Run with: npm test (after setting up test framework)
 */

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  data?: any;
}

class APIIntegrationTests {
  private baseUrl = 'http://localhost:3002/api';
  private gameId: string | null = null;

  async runAll(): Promise<void> {
    console.log('🎮 Chess Tower Defense - API Integration Tests\n');
    console.log('═'.repeat(50));

    const tests = [
      () => this.testGetConfig(),
      () => this.testStartGame(),
      () => this.testBuildTower(),
      () => this.testStartWave(),
      () => this.testGetGameState(),
      () => this.testInvalidTowerPlacement(),
      () => this.testInsufficientCoins(),
    ];

    const results: TestResult[] = [];

    for (const test of tests) {
      const result = await test();
      results.push(result);
      this.logResult(result);
    }

    console.log('\n' + '═'.repeat(50));
    this.printSummary(results);
  }

  private async testGetConfig(): Promise<TestResult> {
    try {
      const response = await fetch(`${this.baseUrl}/game/config`);
      const data = await response.json();

      if (!data.towers || !data.enemies) {
        throw new Error('Missing towers or enemies in config');
      }

      if (data.towers.length === 0 || data.enemies.length === 0) {
        throw new Error('Config contains empty arrays');
      }

      return {
        name: 'GET /api/game/config',
        passed: true,
        data: {
          towers: data.towers.length,
          enemies: data.enemies.length,
        },
      };
    } catch (error: any) {
      return {
        name: 'GET /api/game/config',
        passed: false,
        error: error.message,
      };
    }
  }

  private async testStartGame(): Promise<TestResult> {
    try {
      const response = await fetch(`${this.baseUrl}/game/start`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!data.gameId) {
        throw new Error('No gameId returned');
      }

      if (typeof data.initialCoins !== 'number' || typeof data.lives !== 'number') {
        throw new Error('Invalid initial game state');
      }

      this.gameId = data.gameId;

      return {
        name: 'POST /api/game/start',
        passed: true,
        data: {
          gameId: data.gameId,
          initialCoins: data.initialCoins,
          lives: data.lives,
        },
      };
    } catch (error: any) {
      return {
        name: 'POST /api/game/start',
        passed: false,
        error: error.message,
      };
    }
  }

  private async testBuildTower(): Promise<TestResult> {
    if (!this.gameId) {
      return {
        name: 'POST /api/game/:id/tower',
        passed: false,
        error: 'No gameId available - start game first',
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/game/${this.gameId}/tower`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          towerType: 'basic',
          gridX: 5,
          gridY: 2,
        }),
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Tower build failed');
      }

      if (!data.tower) {
        throw new Error('No tower data returned');
      }

      return {
        name: 'POST /api/game/:id/tower',
        passed: true,
        data: {
          success: data.success,
          remainingCoins: data.remainingCoins,
          tower: data.tower.type,
        },
      };
    } catch (error: any) {
      return {
        name: 'POST /api/game/:id/tower',
        passed: false,
        error: error.message,
      };
    }
  }

  private async testStartWave(): Promise<TestResult> {
    if (!this.gameId) {
      return {
        name: 'POST /api/game/:id/wave',
        passed: false,
        error: 'No gameId available - start game first',
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/game/${this.gameId}/wave`, {
        method: 'POST',
      });
      const data = await response.json();

      if (typeof data.waveNumber !== 'number') {
        throw new Error('Invalid wave number');
      }

      if (!Array.isArray(data.enemies)) {
        throw new Error('Enemies is not an array');
      }

      return {
        name: 'POST /api/game/:id/wave',
        passed: true,
        data: {
          waveNumber: data.waveNumber,
          enemyCount: data.enemies.length,
        },
      };
    } catch (error: any) {
      return {
        name: 'POST /api/game/:id/wave',
        passed: false,
        error: error.message,
      };
    }
  }

  private async testGetGameState(): Promise<TestResult> {
    if (!this.gameId) {
      return {
        name: 'GET /api/game/:id/state',
        passed: false,
        error: 'No gameId available - start game first',
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/game/${this.gameId}/state`);
      const data = await response.json();

      if (
        typeof data.coins !== 'number' ||
        typeof data.lives !== 'number' ||
        typeof data.wave !== 'number'
      ) {
        throw new Error('Invalid game state data');
      }

      if (!Array.isArray(data.towers)) {
        throw new Error('Towers is not an array');
      }

      return {
        name: 'GET /api/game/:id/state',
        passed: true,
        data: {
          coins: data.coins,
          lives: data.lives,
          wave: data.wave,
          towers: data.towers.length,
        },
      };
    } catch (error: any) {
      return {
        name: 'GET /api/game/:id/state',
        passed: false,
        error: error.message,
      };
    }
  }

  private async testInvalidTowerPlacement(): Promise<TestResult> {
    if (!this.gameId) {
      return {
        name: 'Invalid Tower Placement',
        passed: false,
        error: 'No gameId available - start game first',
      };
    }

    try {
      // Try to place tower in restricted zone (enemy path)
      const response = await fetch(`${this.baseUrl}/game/${this.gameId}/tower`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          towerType: 'basic',
          gridX: 5,
          gridY: 4, // Restricted row
        }),
      });
      const data = await response.json();

      if (data.success) {
        throw new Error('Should not allow tower placement in restricted zone');
      }

      return {
        name: 'Invalid Tower Placement',
        passed: true,
        data: {
          message: data.message,
        },
      };
    } catch (error: any) {
      return {
        name: 'Invalid Tower Placement',
        passed: false,
        error: error.message,
      };
    }
  }

  private async testInsufficientCoins(): Promise<TestResult> {
    if (!this.gameId) {
      return {
        name: 'Insufficient Coins',
        passed: false,
        error: 'No gameId available - start game first',
      };
    }

    try {
      // Build towers until we run out of coins
      let coinsRemaining = 200;
      while (coinsRemaining >= 50) {
        const response = await fetch(`${this.baseUrl}/game/${this.gameId}/tower`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            towerType: 'basic',
            gridX: Math.floor(Math.random() * 20),
            gridY: Math.floor(Math.random() * 4), // Avoid restricted rows
          }),
        });
        const data = await response.json();

        if (!data.success) {
          // Expected to fail when coins run out or position occupied
          break;
        }

        coinsRemaining = data.remainingCoins;
      }

      // Now try to build with insufficient coins
      const response = await fetch(`${this.baseUrl}/game/${this.gameId}/tower`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          towerType: 'sniper', // Costs 150
          gridX: 18,
          gridY: 8,
        }),
      });
      const data = await response.json();

      if (data.success) {
        throw new Error('Should not allow tower build with insufficient coins');
      }

      return {
        name: 'Insufficient Coins',
        passed: true,
        data: {
          message: data.message,
        },
      };
    } catch (error: any) {
      return {
        name: 'Insufficient Coins',
        passed: false,
        error: error.message,
      };
    }
  }

  private logResult(result: TestResult): void {
    const icon = result.passed ? '✓' : '✗';
    const status = result.passed ? 'PASS' : 'FAIL';
    console.log(`\n${icon} ${result.name} - ${status}`);

    if (result.data) {
      console.log('  Data:', JSON.stringify(result.data, null, 2));
    }

    if (result.error) {
      console.log('  Error:', result.error);
    }
  }

  private printSummary(results: TestResult[]): void {
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const total = results.length;

    console.log('\n📊 Test Summary');
    console.log(`   Total:  ${total}`);
    console.log(`   Passed: ${passed} ✓`);
    console.log(`   Failed: ${failed} ✗`);
    console.log(`   Rate:   ${((passed / total) * 100).toFixed(1)}%`);

    if (failed === 0) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the errors above.');
    }
  }
}

// Export for use in other test runners
export { APIIntegrationTests };

// Run tests if executed directly
if (typeof window === 'undefined') {
  const tests = new APIIntegrationTests();
  tests.runAll().catch(console.error);
}
