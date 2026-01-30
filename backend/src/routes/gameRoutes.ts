import { Router } from 'express';
import { gameController } from '../controllers/GameController';

const router = Router();

router.post('/start', (req, res) => gameController.startGame(req, res));
router.get('/config', (req, res) => gameController.getConfig(req, res));
router.get('/:gameId/state', (req, res) => gameController.getGameState(req, res));
router.post('/:gameId/tower', (req, res) => gameController.buildTower(req, res));
router.post('/:gameId/tower/:towerId/upgrade', (req, res) => gameController.upgradeTower(req, res));
router.delete('/:gameId/tower/:towerId', (req, res) => gameController.sellTower(req, res));
router.post('/:gameId/wave', (req, res) => gameController.startWave(req, res));
router.post('/:gameId/end', (req, res) => gameController.endGame(req, res));
router.post('/:gameId/coins', (req, res) => gameController.addCoins(req, res));
router.post('/:gameId/life/lose', (req, res) => gameController.loseLife(req, res));

export default router;
