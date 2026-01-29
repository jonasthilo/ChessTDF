import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useGameStore } from './state/gameStore';
import { StartScreen } from './components/screens/StartScreen';
import { GameScreen } from './components/screens/GameScreen';
import { GameEndScreen } from './components/screens/GameEndScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { StatisticsScreen } from './components/screens/StatisticsScreen';
import './App.css';

function App() {
  const initializeGame = useGameStore((state) => state.initializeGame);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<StartScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/statistics" element={<StatisticsScreen />} />
          <Route path="/game/:gameId" element={<GameScreen />} />
          <Route path="/game/:gameId/end" element={<GameEndScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
