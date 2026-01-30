import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../state/gameStore';
import { gameApi } from '../../services/gameApi';
import { ScreenLayout } from '../common/ScreenLayout';
import { DifficultySelector, capitalize } from '../common/DifficultySelector';
import type { GameSettings } from '../../types';
import './StartScreen.css';

const featureCards = (
  <>
    <div className="screen-card-item">
      <h3 className="screen-card-title">Command Your Pieces</h3>
      <p className="screen-card-desc">
        Deploy rooks, bishops and knights as towers to hold the board against the enemy army
      </p>
    </div>
    <div className="screen-card-item">
      <h3 className="screen-card-title">Promote & Conquer</h3>
      <p className="screen-card-desc">
        Capture coins from fallen foes and upgrade your pieces to unleash devastating attacks
      </p>
    </div>
    <div className="screen-card-item">
      <h3 className="screen-card-title">Endgame Awaits</h3>
      <p className="screen-card-desc">
        Each wave brings tougher opponents from pawns to kings. Hold the line or face checkmate!
      </p>
    </div>
  </>
);

export const StartScreen = () => {
  const navigate = useNavigate();
  const startGame = useGameStore((state) => state.startGame);
  const selectedDifficulty = useGameStore((state) => state.selectedDifficulty);
  const setDifficulty = useGameStore((state) => state.setDifficulty);

  const [expanded, setExpanded] = useState(false);
  const [settings, setSettings] = useState<GameSettings[]>([]);

  useEffect(() => {
    gameApi.getAllSettings().then(setSettings).catch(console.error);
  }, []);

  const handleStartGame = async () => {
    const gameId = await startGame();
    if (gameId) {
      navigate(`/game/${gameId}`);
    }
  };

  const navRight = (
    <>
      <button className="nav-action-btn" onClick={() => navigate('/settings')}>
        Settings
      </button>
      <button className="nav-action-btn" onClick={() => navigate('/statistics')}>
        Statistics
      </button>
      <button className="nav-action-btn nav-play-btn" onClick={handleStartGame}>
        Play Game
      </button>
    </>
  );

  return (
    <ScreenLayout
      className="start-screen"
      navRight={navRight}
      watermarks
      heading="Defend Your Kingdom"
      subtitle="Strategic tower defense with chess pieces"
      cards={featureCards}
    >
      <div className="difficulty-collapsible">
        <button className="difficulty-toggle" onClick={() => setExpanded(!expanded)}>
          <span>Difficulty: {capitalize(selectedDifficulty)}</span>
          <span className="difficulty-toggle-arrow">{expanded ? '\u25B2' : '\u25BC'}</span>
        </button>
        {expanded && settings.length > 0 && (
          <div className="difficulty-expanded">
            <DifficultySelector
              settings={settings}
              selectedMode={selectedDifficulty}
              onSelectMode={setDifficulty}
            />
          </div>
        )}
      </div>
    </ScreenLayout>
  );
};
