import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../state/gameStore';
import { gameApi } from '../../services/gameApi';
import { ScreenLayout } from '../common/ScreenLayout';
import { DifficultySelector } from '../common/DifficultySelector';
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

  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; right: number } | null>(null);
  const [settings, setSettings] = useState<GameSettings[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    gameApi.getAllSettings().then(setSettings).catch(console.error);
  }, []);

  const closePanel = useCallback(() => {
    setClosing(true);
    const onEnd = () => {
      setVisible(false);
      setClosing(false);
    };
    const el = panelRef.current;
    if (el) {
      el.addEventListener('animationend', onEnd, { once: true });
    } else {
      onEnd();
    }
  }, []);

  const togglePanel = useCallback(() => {
    if (visible) {
      closePanel();
    } else {
      if (btnRef.current) {
        const rect = btnRef.current.getBoundingClientRect();
        setPanelPos({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
        });
      }
      setVisible(true);
    }
  }, [visible, closePanel]);

  useEffect(() => {
    if (!visible || closing) return;
    const handleClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        closePanel();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [visible, closing, closePanel]);

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
      <button className="btn btn-dark" onClick={() => navigate('/statistics')}>
        Statistics
      </button>
      <button
        ref={btnRef}
        className={`btn btn-dark nav-difficulty-btn ${visible ? 'active' : ''}`}
        onClick={togglePanel}
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
      headingClassName={hasResult ? `end-title ${isVictory ? 'victory' : 'defeat'}` : undefined}
      subtitle={
        hasResult
          ? isVictory
            ? 'You held the line against every wave'
            : 'The enemy army has broken through'
          : 'Strategic tower defense with chess pieces'
      }
      cards={hasResult ? resultCards : featureCards}
    >
      {visible && settings.length > 0 && panelPos && (
        <div
          ref={panelRef}
          className={`difficulty-panel ${closing ? 'closing' : ''}`}
          style={{ top: panelPos.top, right: panelPos.right }}
        >
          <DifficultySelector
            settings={settings}
            selectedMode={selectedDifficulty}
            onSelectMode={setDifficulty}
          />
        </div>
      )}
    </ScreenLayout>
  );
};
