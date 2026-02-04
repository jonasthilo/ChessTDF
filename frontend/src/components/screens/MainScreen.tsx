import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../state/gameStore';
import { gameApi } from '../../services/gameApi';
import { ScreenLayout } from '../common/ScreenLayout';
import { DifficultySelector } from '../common/DifficultySelector';
import { StatisticsPanel } from '../common/StatisticsPanel';
import { capitalize } from '../../utils/string';
import type { GameSettings } from '../../types';
import './MainScreen.css';

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

export const MainScreen = () => {
  const navigate = useNavigate();
  const startGame = useGameStore((state) => state.startGame);
  const selectedDifficulty = useGameStore((state) => state.selectedDifficulty);
  const setDifficulty = useGameStore((state) => state.setDifficulty);
  const gameResult = useGameStore((state) => state.gameResult);
  const wavesSurvived = useGameStore((state) => state.wavesSurvived);
  const enemiesKilled = useGameStore((state) => state.enemiesKilled);
  const resetGame = useGameStore((state) => state.resetGame);

  const [resultFading, setResultFading] = useState(false);

  useEffect(() => {
    if (!gameResult) return;
    const fadeTimer = setTimeout(() => setResultFading(true), 3_000);
    return () => clearTimeout(fadeTimer);
  }, [gameResult]);

  useEffect(() => {
    if (!resultFading) return;
    const resetTimer = setTimeout(() => {
      setResultFading(false);
      resetGame();
    }, 600);
    return () => clearTimeout(resetTimer);
  }, [resultFading, resetGame]);

  // Difficulty panel state
  const [diffVisible, setDiffVisible] = useState(false);
  const [diffClosing, setDiffClosing] = useState(false);
  const [diffPos, setDiffPos] = useState<{ top: number; right: number } | null>(null);
  const [settings, setSettings] = useState<GameSettings[]>([]);
  const diffPanelRef = useRef<HTMLDivElement>(null);
  const diffBtnRef = useRef<HTMLButtonElement>(null);

  // Statistics panel state
  const [statsVisible, setStatsVisible] = useState(false);
  const [statsClosing, setStatsClosing] = useState(false);
  const [statsPos, setStatsPos] = useState<{ top: number; right: number } | null>(null);
  const statsPanelRef = useRef<HTMLDivElement>(null);
  const statsBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    gameApi.getAllSettings().then(setSettings).catch(console.error);
  }, []);

  // Difficulty panel controls
  const closeDiffPanel = useCallback(() => {
    setDiffClosing(true);
    const onEnd = () => {
      setDiffVisible(false);
      setDiffClosing(false);
    };
    const el = diffPanelRef.current;
    if (el) {
      el.addEventListener('animationend', onEnd, { once: true });
    } else {
      onEnd();
    }
  }, []);

  // Statistics panel controls
  const closeStatsPanel = useCallback(() => {
    setStatsClosing(true);
    const onEnd = () => {
      setStatsVisible(false);
      setStatsClosing(false);
    };
    const el = statsPanelRef.current;
    if (el) {
      el.addEventListener('animationend', onEnd, { once: true });
    } else {
      onEnd();
    }
  }, []);

  const toggleDiffPanel = useCallback(() => {
    if (statsVisible && !statsClosing) closeStatsPanel();
    if (diffVisible) {
      closeDiffPanel();
    } else {
      if (diffBtnRef.current) {
        const rect = diffBtnRef.current.getBoundingClientRect();
        setDiffPos({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
        });
      }
      setDiffVisible(true);
    }
  }, [diffVisible, closeDiffPanel, statsVisible, statsClosing, closeStatsPanel]);

  const toggleStatsPanel = useCallback(() => {
    if (diffVisible && !diffClosing) closeDiffPanel();
    if (statsVisible) {
      closeStatsPanel();
    } else {
      if (statsBtnRef.current) {
        const rect = statsBtnRef.current.getBoundingClientRect();
        setStatsPos({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
        });
      }
      setStatsVisible(true);
    }
  }, [statsVisible, closeStatsPanel, diffVisible, diffClosing, closeDiffPanel]);

  // Click-outside for difficulty panel
  useEffect(() => {
    if (!diffVisible || diffClosing) return;
    const handleClick = (e: MouseEvent) => {
      if (
        diffPanelRef.current &&
        !diffPanelRef.current.contains(e.target as Node) &&
        diffBtnRef.current &&
        !diffBtnRef.current.contains(e.target as Node)
      ) {
        closeDiffPanel();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [diffVisible, diffClosing, closeDiffPanel]);

  // Click-outside for statistics panel
  useEffect(() => {
    if (!statsVisible || statsClosing) return;
    const handleClick = (e: MouseEvent) => {
      if (
        statsPanelRef.current &&
        !statsPanelRef.current.contains(e.target as Node) &&
        statsBtnRef.current &&
        !statsBtnRef.current.contains(e.target as Node)
      ) {
        closeStatsPanel();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [statsVisible, statsClosing, closeStatsPanel]);

  const handleStartGame = async () => {
    const gameId = await startGame();
    if (gameId) {
      navigate(`/game/${gameId}`);
    }
  };

  const hasResult = gameResult !== null;
  const isVictory = gameResult === 'win';

  const resultCards = (
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

  const navRight = (
    <>
      <button className="btn btn-dark" onClick={() => navigate('/settings')}>
        Configuration
      </button>
      <button
        ref={statsBtnRef}
        className={`btn btn-dark ${statsVisible ? 'active' : ''}`}
        onClick={toggleStatsPanel}
      >
        Statistics
      </button>
      <button
        ref={diffBtnRef}
        className={`btn btn-dark nav-difficulty-btn ${diffVisible ? 'active' : ''}`}
        onClick={toggleDiffPanel}
      >
        Game Mode: {capitalize(selectedDifficulty)}
      </button>
      <button className="btn btn-gold" onClick={handleStartGame}>
        Play Game
      </button>
    </>
  );

  return (
    <ScreenLayout
      className={`main-screen ${resultFading ? 'result-fading' : ''}`}
      navRight={navRight}
      watermarks
      heading={hasResult ? (isVictory ? 'Victory!' : 'Checkmate!') : 'Defend Your Kingdom'}
      headingClassName={hasResult ? `end-title ${isVictory ? 'victory' : 'defeat'}` : ''}
      subtitle={
        hasResult
          ? isVictory
            ? 'You held the line against every wave'
            : 'The enemy army has broken through'
          : 'Strategic tower defense with chess pieces'
      }
      cards={hasResult ? resultCards : featureCards}
    >
      {diffVisible && settings.length > 0 && diffPos && (
        <div
          ref={diffPanelRef}
          className={`difficulty-panel ${diffClosing ? 'closing' : ''}`}
          style={{ top: diffPos.top, right: diffPos.right }}
        >
          <DifficultySelector
            settings={settings}
            selectedMode={selectedDifficulty}
            onSelectMode={setDifficulty}
          />
        </div>
      )}

      {statsVisible && statsPos && (
        <div
          ref={statsPanelRef}
          className={`statistics-panel ${statsClosing ? 'closing' : ''}`}
          style={{ top: statsPos.top, right: statsPos.right }}
        >
          <StatisticsPanel />
        </div>
      )}
    </ScreenLayout>
  );
};
