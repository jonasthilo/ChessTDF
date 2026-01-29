import { useGameStore } from '../../state/gameStore';
import { VersionDisplay } from '../common/VersionDisplay';
import './StartScreen.css';

export const StartScreen = () => {
  const startGame = useGameStore((state) => state.startGame);
  const setScreen = useGameStore((state) => state.setScreen);

  const handleStartGame = async () => {
    await startGame();
  };

  const handleShowSettings = () => {
    setScreen('settings');
  };

  const handleShowStatistics = () => {
    setScreen('statistics');
  };

  return (
    <div className="start-screen">
      <div className="start-screen-content">
        <img
          src="/assets/logo/Chess-tdf-logo.png"
          alt="Chess Tower Defense"
          className="start-logo"
        />
        <h1 className="game-title">Chess Tower Defense</h1>
        <p className="game-subtitle">Defend against the chess army!</p>

        <div className="button-group">
          <button className="start-button" onClick={handleStartGame}>
            Quick Game
          </button>
        </div>

        <div className="secondary-buttons">
          <button className="settings-button" onClick={handleShowSettings}>
            Settings
          </button>
          <button className="statistics-button" onClick={handleShowStatistics}>
            Statistics
          </button>
        </div>

        <div className="game-instructions">
          <h3>Quick Info:</h3>
          <ul>
            <li>Place towers to defend against enemy chess pieces</li>
            <li>Each tower costs coins and has different stats</li>
            <li>Start waves to spawn enemies</li>
            <li>Enemies move from left to right</li>
            <li>Don't let enemies reach the right side!</li>
            <li>You have 10 lives - lose all and it's game over</li>
          </ul>
        </div>
      </div>
      <VersionDisplay />
    </div>
  );
};
