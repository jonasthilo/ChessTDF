import { useState, useEffect } from 'react';
import { useGameStore } from '../../state/gameStore';
import { gameApi } from '../../services/gameApi';
import { VersionDisplay } from '../common/VersionDisplay';
import type { StatisticsSummary, GameStatistics } from '../../types';
import './StatisticsScreen.css';

export const StatisticsScreen = () => {
  const setScreen = useGameStore((state) => state.setScreen);
  const [summary, setSummary] = useState<StatisticsSummary | null>(null);
  const [recentGames, setRecentGames] = useState<GameStatistics[]>([]);
  const [topScores, setTopScores] = useState<GameStatistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'recent' | 'top'>('overview');

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const [summaryData, recentData, topData] = await Promise.all([
        gameApi.getStatisticsSummary(),
        gameApi.getRecentGames(10),
        gameApi.getTopScores(10),
      ]);
      setSummary(summaryData);
      setRecentGames(recentData);
      setTopScores(topData);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setScreen('start');
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="statistics-screen">
        <div className="statistics-content">
          <p>Loading statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="statistics-screen">
      <div className="statistics-content">
        <div className="screen-header">
          <img src="/assets/logo/Chess-tdf-logo.png" alt="Chess TDF" className="screen-logo" />
          <h1 className="statistics-title">Game Statistics</h1>
        </div>

        <div className="tab-buttons">
          <button
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab-button ${activeTab === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveTab('recent')}
          >
            Recent Games
          </button>
          <button
            className={`tab-button ${activeTab === 'top' ? 'active' : ''}`}
            onClick={() => setActiveTab('top')}
          >
            Top Scores
          </button>
        </div>

        {activeTab === 'overview' && summary && (
          <div className="stats-overview">
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-number">{summary.totalGames}</span>
                <span className="stat-label">Total Games</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{summary.wins}</span>
                <span className="stat-label">Wins</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{summary.losses}</span>
                <span className="stat-label">Losses</span>
              </div>
              <div className="stat-card highlight">
                <span className="stat-number">{((summary.winRate || 0) * 100).toFixed(1)}%</span>
                <span className="stat-label">Win Rate</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{(summary.avgWaveReached || 0).toFixed(1)}</span>
                <span className="stat-label">Avg Wave Reached</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{formatDuration(summary.avgDuration || 0)}</span>
                <span className="stat-label">Avg Duration</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{summary.totalEnemiesKilled}</span>
                <span className="stat-label">Enemies Killed</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{summary.totalTowersBuilt}</span>
                <span className="stat-label">Towers Built</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'overview' && !summary && (
          <div className="no-data">No statistics available yet. Play some games!</div>
        )}

        {activeTab === 'recent' && (
          <div className="games-list">
            {recentGames.length === 0 ? (
              <p className="no-games">No games played yet</p>
            ) : (
              recentGames.map((game, index) => (
                <div key={game.gameId} className={`game-row ${game.outcome}`}>
                  <span className="game-rank">#{index + 1}</span>
                  <span className={`game-outcome ${game.outcome}`}>
                    {game.outcome.toUpperCase()}
                  </span>
                  <span className="game-wave">Wave {game.finalWave}</span>
                  <span className="game-kills">{game.enemiesKilledTotal} kills</span>
                  <span className="game-duration">{formatDuration(game.duration)}</span>
                  <span className="game-towers">{game.towersBuiltTotal} towers</span>
                  <span className="game-coins">{game.coinsEarned} coins</span>
                  <span className="game-date">{new Date(game.timestamp).toLocaleDateString()}</span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'top' && (
          <div className="games-list">
            {topScores.length === 0 ? (
              <p className="no-games">No high scores yet</p>
            ) : (
              topScores.map((game, index) => (
                <div key={game.gameId} className="game-row top-score">
                  <span className="game-rank medal">
                    {index === 0
                      ? '1st'
                      : index === 1
                        ? '2nd'
                        : index === 2
                          ? '3rd'
                          : `#${index + 1}`}
                  </span>
                  <span className="game-wave">Wave {game.finalWave}</span>
                  <span className="game-kills">{game.enemiesKilledTotal} kills</span>
                  <span className="game-duration">{formatDuration(game.duration)}</span>
                  <span className="game-towers">{game.towersBuiltTotal} towers</span>
                  <span className="game-mode">{game.gameMode}</span>
                </div>
              ))
            )}
          </div>
        )}

        <button className="back-button" onClick={handleBack}>
          Back to Menu
        </button>
      </div>
      <VersionDisplay />
    </div>
  );
};
