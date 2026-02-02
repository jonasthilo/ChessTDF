import { Router } from 'express';
import { configController } from '../controllers/ConfigController';

const router = Router();

// Tower Definitions
router.get('/towers', (req, res) => configController.getTowerDefinitions(req, res));
router.patch('/towers/:id', (req, res) => configController.updateTowerDefinition(req, res));

// Tower Levels
router.get('/towers/:towerId/levels', (req, res) => configController.getTowerLevels(req, res));
router.get('/towers/:towerId/levels/:level', (req, res) =>
  configController.getTowerLevel(req, res)
);
router.put('/towers/:towerId/levels/:level', (req, res) =>
  configController.upsertTowerLevel(req, res)
);
router.delete('/towers/:towerId/levels/:level', (req, res) =>
  configController.deleteTowerLevel(req, res)
);

// Enemy Definitions
router.get('/enemies', (req, res) => configController.getAllEnemyDefinitions(req, res));
router.get('/enemies/:id', (req, res) => configController.getEnemyDefinition(req, res));
router.patch('/enemies/:id', (req, res) => configController.updateEnemyDefinition(req, res));

// Wave Definitions
router.get('/waves', (req, res) => configController.getWaves(req, res));
router.post('/waves', (req, res) => configController.createWave(req, res));
router.get('/waves/:waveNumber', (req, res) => configController.getWave(req, res));
router.put('/waves/:waveNumber', (req, res) => configController.replaceWave(req, res));
router.delete('/waves/:waveNumber', (req, res) => configController.deleteWave(req, res));

// Game Settings
router.get('/settings', (req, res) => configController.getAllSettings(req, res));
router.post('/settings', (req, res) => configController.createSettings(req, res));
router.get('/settings/default', (req, res) => configController.getDefaultSettings(req, res));
router.get('/settings/:mode', (req, res) => configController.getSettingsByMode(req, res));
router.get('/settings/id/:id', (req, res) => configController.getSettingsById(req, res));
router.patch('/settings/:id', (req, res) => configController.updateSettings(req, res));

export default router;
