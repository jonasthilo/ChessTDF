import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../state/gameStore';
import { VersionDisplay } from '../common/VersionDisplay';
import './StartScreen.css';

export const StartScreen = () => {
  const navigate = useNavigate();
  const startGame = useGameStore((state) => state.startGame);

  const handleStartGame = async () => {
    const gameId = await startGame();
    if (gameId) {
      navigate(`/game/${gameId}`);
    }
  };

  const handleShowSettings = () => {
    navigate('/settings');
  };

  const handleShowStatistics = () => {
    navigate('/statistics');
  };

  return (
    <div className="start-screen">
      <nav className="start-nav">
        <div className="start-nav-left">
          <img
            src="/assets/logo/Chess-tdf-logo.png"
            alt="Chess Tower Defense"
            className="start-logo"
          />
          <span className="start-nav-title">Chess Tower Defense</span>
        </div>
      </nav>

      <main className="start-hero">
        <img
          src="/assets/logo/Chess-tdf-logo.png"
          alt=""
          className="start-watermark start-watermark-left"
          aria-hidden="true"
        />
        <img
          src="/assets/logo/Chess-tdf-logo.png"
          alt=""
          className="start-watermark start-watermark-right"
          aria-hidden="true"
        />
        <h1 className="start-heading">Defend Your Kingdom</h1>
        <p className="start-subtitle">Strategic tower defense with chess pieces</p>

        <button className="start-play-btn" onClick={handleStartGame}>
          Play Game
        </button>

        <div className="start-secondary">
          <button className="start-sec-btn" onClick={handleShowSettings}>
            Settings
          </button>
          <button className="start-sec-btn" onClick={handleShowStatistics}>
            Statistics
          </button>
        </div>
      </main>

      <section className="start-features">
        <div className="start-feature-card">
          <h3 className="start-feature-title">Command Your Pieces</h3>
          <p className="start-feature-desc">
            Deploy rooks, bishops and knights as towers to hold the board against the enemy army
          </p>
        </div>
        <div className="start-feature-card">
          <h3 className="start-feature-title">Promote & Conquer</h3>
          <p className="start-feature-desc">
            Capture coins from fallen foes and upgrade your pieces to unleash devastating attacks
          </p>
        </div>
        <div className="start-feature-card">
          <h3 className="start-feature-title">Endgame Awaits</h3>
          <p className="start-feature-desc">
            Each wave brings tougher opponents from pawns to kings. Hold the line or face checkmate!
          </p>
        </div>
      </section>
      <VersionDisplay />
    </div>
  );
};
