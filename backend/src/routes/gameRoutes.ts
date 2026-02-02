import { Router } from 'express';
import { gameController } from '../controllers/GameController';

const router = Router();

router.post('/', (req, res) => gameController.startGame(req, res));
router.get('/config', (req, res) => gameController.getConfig(req, res));
router.get('/:gameId', (req, res) => gameController.getGameState(req, res));
router.post('/:gameId/towers', (req, res) => gameController.buildTower(req, res));
router.patch('/:gameId/towers/:towerId', (req, res) => gameController.upgradeTower(req, res));
router.delete('/:gameId/towers/:towerId', (req, res) => gameController.sellTower(req, res));
router.post('/:gameId/waves', (req, res) => gameController.startWave(req, res));
router.post('/:gameId/end', (req, res) => gameController.endGame(req, res));
router.patch('/:gameId/coins', (req, res) => gameController.addCoins(req, res));
router.patch('/:gameId/lives', (req, res) => gameController.loseLife(req, res));

export default router;
