import { Request, Response } from 'express';
import { ConfigService } from '../services/ConfigService';
import { WaveService } from '../services/WaveService';
import { TowerLevel, EnemyDefinition, GameSettings } from '../types';
import { parseIntParam } from './helpers';

const configService = new ConfigService();
const waveService = new WaveService();

/**
 * ConfigController
 * Unified controller for all game configuration: towers, enemies, settings
 * Merged from DefinitionsController + SettingsController
 */
export class ConfigController {
  // ==================== Tower Definitions ====================

  /**
   * GET /api/config/towers
   * Get all tower definitions with levels
   * Query param: ?id=1 to get single tower by ID
   */
  async getTowerDefinitions(req: Request, res: Response): Promise<void> {
    try {
      const idParam = req.query['id'] as string | undefined;
      const id = idParam ? parseInt(idParam) : undefined;

      if (idParam !== undefined && isNaN(id as number)) {
        res.status(400).json({ error: 'Invalid tower ID' });
        return;
      }

      const towers = await configService.getTowerDefinitionsWithLevels(id);

      if (id && towers.length === 0) {
        res.status(404).json({ error: 'Tower definition not found' });
        return;
      }

      // If id provided, return single object; otherwise return array
      res.json(id ? towers[0] : towers);
    } catch (error) {
      console.error('Error fetching tower definitions:', error);
      res.status(500).json({ error: 'Failed to fetch tower definitions' });
    }
  }

  /**
   * PATCH /api/config/towers/:id
   * Update tower definition metadata (name, description, color, maxLevel)
   */
  async updateTowerDefinition(req: Request, res: Response): Promise<void> {
    try {
      const idParam = req.params['id'];
      const id = parseIntParam(idParam);

      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid tower ID' });
        return;
      }

      const updates = req.body;

      const success = await configService.updateTowerDefinition(id, updates);

      if (!success) {
        res.status(404).json({ error: 'Tower definition not found or update failed' });
        return;
      }

      const updatedTower = await configService.getTowerDefinitionsWithLevels(id);
      res.json(updatedTower[0]);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        console.error('Error updating tower definition:', error);
        res.status(500).json({ error: 'Failed to update tower definition' });
      }
    }
  }

  // ==================== Tower Levels ====================

  /**
   * GET /api/config/towers/:towerId/levels
   * Get all levels for a tower ID
   */
  async getTowerLevels(req: Request, res: Response): Promise<void> {
    try {
      const towerIdParam = req.params['towerId'];
      const towerId = parseIntParam(towerIdParam);

      if (isNaN(towerId)) {
        res.status(400).json({ error: 'Invalid tower ID' });
        return;
      }

      const levels = await configService.getTowerLevel(towerId);

      if (!Array.isArray(levels) || levels.length === 0) {
        res.status(404).json({ error: 'Tower levels not found' });
        return;
      }

      res.json(levels);
    } catch (error) {
      console.error('Error fetching tower levels:', error);
      res.status(500).json({ error: 'Failed to fetch tower levels' });
    }
  }

  /**
   * GET /api/config/towers/:towerId/levels/:level
   * Get specific level for a tower ID
   */
  async getTowerLevel(req: Request, res: Response): Promise<void> {
    try {
      const towerIdParam = req.params['towerId'];
      const towerId = parseIntParam(towerIdParam);
      const levelParam = req.params['level'];
      const level = parseIntParam(levelParam);

      if (isNaN(towerId)) {
        res.status(400).json({ error: 'Invalid tower ID' });
        return;
      }

      if (isNaN(level) || level < 1) {
        res.status(400).json({ error: 'Invalid level parameter. Must be at least 1' });
        return;
      }

      const towerLevel = await configService.getTowerLevel(towerId, level);

      if (!towerLevel) {
        res.status(404).json({ error: 'Tower level not found' });
        return;
      }

      res.json(towerLevel);
    } catch (error) {
      console.error('Error fetching tower level:', error);
      res.status(500).json({ error: 'Failed to fetch tower level' });
    }
  }

  /**
   * PUT /api/config/towers/:towerId/levels/:level
   * Create or update a tower level
   */
  async upsertTowerLevel(req: Request, res: Response): Promise<void> {
    try {
      const towerIdParam = req.params['towerId'];
      const towerId = parseIntParam(towerIdParam);
      const levelParam = req.params['level'];
      const level = parseIntParam(levelParam);

      if (isNaN(towerId)) {
        res.status(400).json({ error: 'Invalid tower ID' });
        return;
      }

      if (isNaN(level) || level < 1) {
        res.status(400).json({ error: 'Invalid level parameter. Must be at least 1' });
        return;
      }

      const { cost, damage, range, fireRate } = req.body;

      const towerLevel: TowerLevel = {
        towerId,
        level,
        cost,
        damage,
        range,
        fireRate,
      };

      await configService.upsertTowerLevel(towerLevel);

      const updated = await configService.getTowerLevel(towerId, level);
      res.json(updated);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        console.error('Error upserting tower level:', error);
        res.status(500).json({ error: 'Failed to upsert tower level' });
      }
    }
  }

  /**
   * DELETE /api/config/towers/:towerId/levels/:level
   * Delete a tower level
   */
  async deleteTowerLevel(req: Request, res: Response): Promise<void> {
    try {
      const towerIdParam = req.params['towerId'];
      const towerId = parseIntParam(towerIdParam);
      const levelParam = req.params['level'];
      const level = parseIntParam(levelParam);

      if (isNaN(towerId)) {
        res.status(400).json({ error: 'Invalid tower ID' });
        return;
      }

      if (isNaN(level) || level < 1) {
        res.status(400).json({ error: 'Invalid level parameter. Must be at least 1' });
        return;
      }

      const success = await configService.deleteTowerLevel(towerId, level);

      if (!success) {
        res.status(404).json({ error: 'Tower level not found' });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting tower level:', error);
      res.status(500).json({ error: 'Failed to delete tower level' });
    }
  }

  // ==================== Enemy Definitions ====================

  /**
   * GET /api/config/enemies
   * Get all enemy definitions
   */
  async getAllEnemyDefinitions(req: Request, res: Response): Promise<void> {
    try {
      const enemies = await configService.getAllEnemyDefinitions();
      res.json(enemies);
    } catch (error) {
      console.error('Error fetching enemy definitions:', error);
      res.status(500).json({ error: 'Failed to fetch enemy definitions' });
    }
  }

  /**
   * GET /api/config/enemies/:id
   * Get a specific enemy definition
   */
  async getEnemyDefinition(req: Request, res: Response): Promise<void> {
    try {
      const idParam = req.params['id'];
      const id = parseIntParam(idParam);

      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid enemy ID' });
        return;
      }

      const enemy = await configService.getEnemyDefinition(id);

      if (!enemy) {
        res.status(404).json({ error: 'Enemy definition not found' });
        return;
      }

      res.json(enemy);
    } catch (error) {
      console.error('Error fetching enemy definition:', error);
      res.status(500).json({ error: 'Failed to fetch enemy definition' });
    }
  }

  /**
   * PATCH /api/config/enemies/:id
   * Update an enemy definition (admin endpoint for game balance)
   */
  async updateEnemyDefinition(req: Request, res: Response): Promise<void> {
    try {
      const idParam = req.params['id'];
      const id = parseIntParam(idParam);

      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid enemy ID' });
        return;
      }

      const updates: Partial<EnemyDefinition> = req.body;

      const success = await configService.updateEnemyDefinition(id, updates);

      if (!success) {
        res.status(404).json({ error: 'Enemy definition not found or update failed' });
        return;
      }

      const updatedEnemy = await configService.getEnemyDefinition(id);
      res.json(updatedEnemy);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        console.error('Error updating enemy definition:', error);
        res.status(500).json({ error: 'Failed to update enemy definition' });
      }
    }
  }

  // ==================== Game Settings ====================

  /**
   * GET /api/config/settings
   * Get all available settings presets
   */
  async getAllSettings(req: Request, res: Response): Promise<void> {
    try {
      const settings = await configService.getAllSettings();
      res.json(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  }

  /**
   * GET /api/config/settings/:mode
   * Get settings for a specific mode (easy/normal/hard/custom)
   */
  async getSettingsByMode(req: Request, res: Response): Promise<void> {
    try {
      const { mode } = req.params;

      if (mode !== 'easy' && mode !== 'normal' && mode !== 'hard' && mode !== 'custom') {
        res.status(400).json({ error: 'Invalid mode. Must be easy, normal, hard, or custom' });
        return;
      }

      const settings = await configService.getSettingsByMode(mode);

      if (!settings) {
        res.status(404).json({ error: `Settings for mode '${mode}' not found` });
        return;
      }

      res.json(settings);
    } catch (error) {
      console.error('Error fetching settings by mode:', error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  }

  /**
   * GET /api/config/settings/id/:id
   * Get settings by ID
   */
  async getSettingsById(req: Request, res: Response): Promise<void> {
    try {
      const idParam = req.params['id'];
      const id = parseIntParam(idParam);

      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid settings ID' });
        return;
      }

      const settings = await configService.getSettingsById(id);

      if (!settings) {
        res.status(404).json({ error: 'Settings not found' });
        return;
      }

      res.json(settings);
    } catch (error) {
      console.error('Error fetching settings by ID:', error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  }

  /**
   * POST /api/config/settings
   * Create custom settings
   */
  async createSettings(req: Request, res: Response): Promise<void> {
    try {
      const settingsData: Partial<GameSettings> = req.body;

      // Validate required fields
      if (!settingsData.mode || !settingsData.initialCoins || !settingsData.initialLives) {
        res
          .status(400)
          .json({ error: 'Missing required fields: mode, initialCoins, initialLives' });
        return;
      }

      const newSettings = await configService.createCustomSettings(
        settingsData as Omit<GameSettings, 'id' | 'createdAt' | 'updatedAt'>
      );

      res.status(201).json(newSettings);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        console.error('Error creating settings:', error);
        res.status(500).json({ error: 'Failed to create settings' });
      }
    }
  }

  /**
   * PATCH /api/config/settings/:id
   * Update existing settings
   */
  async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const idParam = req.params['id'];
      const id = parseIntParam(idParam);

      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid settings ID' });
        return;
      }

      const updates: Partial<GameSettings> = req.body;

      const success = await configService.updateSettings(id, updates);

      if (!success) {
        res.status(404).json({ error: 'Settings not found or update failed' });
        return;
      }

      const updatedSettings = await configService.getSettingsById(id);
      res.json(updatedSettings);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
      }
    }
  }

  /**
   * GET /api/config/settings/default
   * Get default (normal) settings
   */
  async getDefaultSettings(req: Request, res: Response): Promise<void> {
    try {
      const settings = await configService.getDefaultSettings();

      if (!settings) {
        res.status(404).json({ error: 'Default settings not found' });
        return;
      }

      res.json(settings);
    } catch (error) {
      console.error('Error fetching default settings:', error);
      res.status(500).json({ error: 'Failed to fetch default settings' });
    }
  }

  // ==================== Wave Definitions ====================

  /**
   * GET /api/config/waves
   * Get all wave definitions grouped by wave number
   */
  async getWaves(req: Request, res: Response): Promise<void> {
    try {
      const waves = await waveService.getAllWaves();
      res.json(waves);
    } catch (error) {
      console.error('Error fetching wave definitions:', error);
      res.status(500).json({ error: 'Failed to fetch wave definitions' });
    }
  }
}

export const configController = new ConfigController();
