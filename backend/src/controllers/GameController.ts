import { Request, Response } from 'express';
import { gameService } from '../services/GameService';
import { waveService } from '../services/WaveService';
import { configService } from '../services/ConfigService';
import {
  StartGameResponse,
  GameConfigResponse,
  BuildTowerRequest,
  BuildTowerResponse,
  StartWaveResponse,
  EndGameRequest,
  EndGameResponse,
  GameStateResponse
} from '../types';

export class GameController {
  // POST /api/game/start
  async startGame(req: Request, res: Response): Promise<void> {
    try {
      const { difficulty = 'normal', gameMode = '10waves' } = req.body;
      const game = await gameService.createGame(gameMode, difficulty);

      const response: StartGameResponse = {
        gameId: game.id,
        initialCoins: game.coins,
        lives: game.lives
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error starting game:', error);
      res.status(500).json({ error: 'Failed to start game' });
    }
  }

  // GET /api/game/config
  async getConfig(req: Request, res: Response): Promise<void> {
    try {
      const [towers, enemies] = await Promise.all([
        configService.getTowerDefinitionsWithLevels(),
        configService.getAllEnemyDefinitions()
      ]);

      const response: GameConfigResponse = {
        towers,
        enemies
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error getting config:', error);
      res.status(500).json({ error: 'Failed to get configuration' });
    }
  }

  // GET /api/game/:gameId/state
  async getGameState(req: Request, res: Response): Promise<void> {
    try {
      const gameId = req.params['gameId'] as string;
      const game = await gameService.getGame(gameId);

      if (!game) {
        res.status(404).json({ error: 'Game not found' });
        return;
      }

      const response: GameStateResponse = {
        coins: game.coins,
        lives: game.lives,
        wave: game.wave,
        towers: game.towers
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error getting game state:', error);
      res.status(500).json({ error: 'Failed to get game state' });
    }
  }

  // POST /api/game/:gameId/tower
  async buildTower(req: Request, res: Response): Promise<void> {
    try {
      const gameId = req.params['gameId'] as string;
      const request: BuildTowerRequest = req.body;

      const result = await gameService.buildTower(gameId, request);

      if (!result.success) {
        res.status(400).json({ error: result.message });
        return;
      }

      const response: BuildTowerResponse = {
        success: true,
        remainingCoins: result.remainingCoins ?? 0,
        ...(result.tower && { tower: result.tower }),
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error building tower:', error);
      res.status(500).json({ error: 'Failed to build tower' });
    }
  }

  // POST /api/game/:gameId/tower/:towerId/upgrade
  async upgradeTower(req: Request, res: Response): Promise<void> {
    try {
      const gameId = req.params['gameId'] as string;
      const towerId = req.params['towerId'] as string;

      const result = await gameService.upgradeTower(gameId, towerId);

      if (!result.success) {
        res.status(400).json({ error: result.message });
        return;
      }

      res.status(200).json({
        success: true,
        remainingCoins: result.remainingCoins ?? 0,
        ...(result.tower && { tower: result.tower }),
      });
    } catch (error) {
      console.error('Error upgrading tower:', error);
      res.status(500).json({ error: 'Failed to upgrade tower' });
    }
  }

  // DELETE /api/game/:gameId/tower/:towerId
  async sellTower(req: Request, res: Response): Promise<void> {
    try {
      const gameId = req.params['gameId'] as string;
      const towerId = req.params['towerId'] as string;

      const result = await gameService.sellTower(gameId, towerId);

      if (!result.success) {
        res.status(400).json({ error: result.message });
        return;
      }

      res.status(200).json({
        success: true,
        refundAmount: result.refundAmount ?? 0,
        remainingCoins: result.remainingCoins ?? 0,
      });
    } catch (error) {
      console.error('Error selling tower:', error);
      res.status(500).json({ error: 'Failed to sell tower' });
    }
  }

  // POST /api/game/:gameId/wave
  async startWave(req: Request, res: Response): Promise<void> {
    try {
      const gameId = req.params['gameId'] as string;

      const success = await gameService.startWave(gameId);
      if (!success) {
        res.status(404).json({ error: 'Game not found' });
        return;
      }

      const game = await gameService.getGame(gameId);
      if (!game) {
        res.status(404).json({ error: 'Game not found' });
        return;
      }

      const enemies = waveService.getWaveEnemies(game.wave);

      const response: StartWaveResponse = {
        waveNumber: game.wave,
        enemies
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error starting wave:', error);
      res.status(500).json({ error: 'Failed to start wave' });
    }
  }

  // POST /api/game/:gameId/end
  async endGame(req: Request, res: Response): Promise<void> {
    try {
      const gameId = req.params['gameId'] as string;
      const request: EndGameRequest = req.body;

      console.log(`Game ${gameId} ended - Wave: ${request.finalWave}, Enemies Killed: ${request.enemiesKilled}`);

      const success = await gameService.endGame(gameId, 'loss', {
        duration: 0,
        enemiesKilledTotal: request.enemiesKilled,
        enemiesKilledByType: {},
        towersBuiltTotal: 0,
        towersBuiltByType: {},
        coinsEarned: 0,
        coinsSpent: 0,
        damageDealt: 0,
      });

      const response: EndGameResponse = { success };
      res.status(200).json(response);
    } catch (error) {
      console.error('Error ending game:', error);
      res.status(500).json({ error: 'Failed to end game' });
    }
  }

  // POST /api/game/:gameId/coins
  async addCoins(req: Request, res: Response): Promise<void> {
    try {
      const gameId = req.params['gameId'] as string;
      const { amount } = req.body;

      if (typeof amount !== 'number' || amount <= 0) {
        res.status(400).json({ error: 'Invalid coin amount' });
        return;
      }

      const success = await gameService.addCoins(gameId, amount);
      if (!success) {
        res.status(404).json({ error: 'Game not found' });
        return;
      }

      const game = await gameService.getGame(gameId);
      res.status(200).json({ success: true, coins: game?.coins ?? 0 });
    } catch (error) {
      console.error('Error adding coins:', error);
      res.status(500).json({ error: 'Failed to add coins' });
    }
  }

  // POST /api/game/:gameId/life/lose
  async loseLife(req: Request, res: Response): Promise<void> {
    try {
      const gameId = req.params['gameId'] as string;

      const stillAlive = await gameService.loseLife(gameId);
      const game = await gameService.getGame(gameId);

      res.status(200).json({
        success: true,
        lives: game?.lives ?? 0,
        gameOver: !stillAlive
      });
    } catch (error) {
      console.error('Error losing life:', error);
      res.status(500).json({ error: 'Failed to lose life' });
    }
  }
}

// Export singleton instance
export const gameController = new GameController();
