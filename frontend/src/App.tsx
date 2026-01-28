import { useEffect } from 'react';
import { useGameStore } from './state/gameStore';
import { StartScreen } from './components/screens/StartScreen';
import { GameScreen } from './components/screens/GameScreen';
import { GameEndScreen } from './components/screens/GameEndScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { StatisticsScreen } from './components/screens/StatisticsScreen';
import './App.css';

function App() {
  const currentScreen = useGameStore((state) => state.currentScreen);
  const initializeGame = useGameStore((state) => state.initializeGame);

  useEffect(() => {
    // Load game configuration on app startup
    initializeGame();
  }, [initializeGame]);

  return (
    <div className="app">
      {currentScreen === 'start' && <StartScreen />}
      {currentScreen === 'game' && <GameScreen />}
      {currentScreen === 'gameEnd' && <GameEndScreen />}
      {currentScreen === 'settings' && <SettingsScreen />}
      {currentScreen === 'statistics' && <StatisticsScreen />}
    </div>
  );
}

export default App;
