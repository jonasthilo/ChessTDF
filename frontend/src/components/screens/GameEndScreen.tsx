import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../state/gameStore';
import { ScreenLayout } from '../common/ScreenLayout';
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

  const statCards = (
    <>
      <div className="screen-card-item end-stat-card">
        <span className="end-stat-value">{wavesSurvived}</span>
        <h3 className="screen-card-title">Waves Survived</h3>
      </div>
      <div className="screen-card-item end-stat-card">
        <span className="end-stat-value">{enemiesKilled}</span>
        <h3 className="screen-card-title">Enemies Defeated</h3>
      </div>
    </>
  );

  return (
    <ScreenLayout
      className="game-end-screen"
      watermarks
      heading={isVictory ? 'Victory!' : 'Checkmate!'}
      headingClassName={`end-title ${isVictory ? 'victory' : 'defeat'}`}
      subtitle={isVictory ? 'You held the line against every wave' : 'The enemy army has broken through'}
      cards={statCards}
    >
      <button className="btn btn-primary" onClick={handlePlayAgain}>
        Play Again
      </button>

      <div className="btn-group">
        <button className="btn btn-secondary" onClick={handleReturnHome}>
          Return Home
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/statistics')}>
          Statistics
        </button>
      </div>
    </ScreenLayout>
  );
};
