import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../state/gameStore';
import { VersionDisplay } from '../common/VersionDisplay';
import './GameEndScreen.css';

export const GameEndScreen = () => {
  const navigate = useNavigate();
  const wavesSurvived = useGameStore((state) => state.wavesSurvived);
  const enemiesKilled = useGameStore((state) => state.enemiesKilled);
  const gameResult = useGameStore((state) => state.gameResult);
  const startGame = useGameStore((state) => state.startGame);
  const resetGame = useGameStore((state) => state.resetGame);

  const isVictory = gameResult === 'win';

  const handlePlayAgain = async () => {
    const newGameId = await startGame();
    if (newGameId) {
      navigate(`/game/${newGameId}`);
    }
  };

  const handleReturnHome = () => {
    resetGame();
    navigate('/');
  };

  return (
    <div className={`game-end-screen ${isVictory ? 'victory' : 'defeat'}`}>
      <div className="game-end-content">
        <div className="screen-header">
          <img src="/assets/logo/Chess-tdf-logo.png" alt="Chess TDF" className="screen-logo" />
          <h1 className={`game-end-title ${isVictory ? 'victory' : 'defeat'}`}>
            {isVictory ? 'Victory!' : 'Checkmate!'}
          </h1>
        </div>

        <div className="game-end-stats">
          <h2>Final Stats</h2>
          <div className="stat-row">
            <span className="stat-label">Waves Survived:</span>
            <span className="stat-value">{wavesSurvived}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Enemies Killed:</span>
            <span className="stat-value">{enemiesKilled}</span>
          </div>
        </div>

        <div className="game-end-buttons">
          <button className="play-again-button" onClick={handlePlayAgain}>
            Play Again
          </button>
          <button className="home-button" onClick={handleReturnHome}>
            Return to Home
          </button>
        </div>
      </div>
      <VersionDisplay />
    </div>
  );
};
