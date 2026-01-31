import { useState, useEffect } from 'react';
import { gameApi } from '../../services/gameApi';
import type { StatisticsSummary, GameStatistics } from '../../types';

type Tab = 'recent' | 'highscores' | 'overall';

const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatGameMode = (mode: string): string => {
  if (mode === '10waves') return '10 Waves';
  if (mode === '20waves') return '20 Waves';
  if (mode === 'endless') return 'Endless';
  return mode;
};

export const StatisticsPanel = () => {
  const [activeTab, setActiveTab] = useState<Tab>('recent');
  const [summary, setSummary] = useState<StatisticsSummary | null>(null);
  const [recentGames, setRecentGames] = useState<GameStatistics[]>([]);
  const [topScores, setTopScores] = useState<GameStatistics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      gameApi.getStatisticsSummary(),
      gameApi.getRecentGames(1),
      gameApi.getTopScores(10),
    ])
      .then(([summaryData, recentData, topData]) => {
        setSummary(summaryData);
        setRecentGames(recentData);
        setTopScores(topData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'recent', label: 'Recent' },
    { key: 'highscores', label: 'Highscores' },
    { key: 'overall', label: 'Overall' },
  ];

  if (loading) {
    return <div className="stats-panel-loading">Loading...</div>;
  }

  const lastGame = recentGames[0];

  return (
    <>
      <div className="stats-panel-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`btn btn-dark btn-sm stats-panel-tab ${activeTab === tab.key ? 'selected' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="stats-panel-content">
        {activeTab === 'recent' && (
          <>
            {lastGame ? (
              <div className={`stats-recent-card ${lastGame.outcome}`}>
                <div className="stats-recent-header">
                  <span className={`stats-outcome-badge ${lastGame.outcome}`}>
                    {lastGame.outcome === 'win' ? 'Victory' : 'Defeat'}
                  </span>
                  <span className="stats-recent-date">
                    {new Date(lastGame.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <div className="stats-recent-grid">
                  <div className="stats-recent-item">
                    <span className="stats-recent-label">Game Mode</span>
                    <span className="stats-recent-value">{formatGameMode(lastGame.gameMode)}</span>
                  </div>
                  <div className="stats-recent-item">
                    <span className="stats-recent-label">Wave</span>
                    <span className="stats-recent-value">{lastGame.finalWave}</span>
                  </div>
                  <div className="stats-recent-item">
                    <span className="stats-recent-label">Kills</span>
                    <span className="stats-recent-value">{lastGame.enemiesKilledTotal}</span>
                  </div>
                  <div className="stats-recent-item">
                    <span className="stats-recent-label">Duration</span>
                    <span className="stats-recent-value">{formatDuration(lastGame.duration)}</span>
                  </div>
                  <div className="stats-recent-item">
                    <span className="stats-recent-label">Towers</span>
                    <span className="stats-recent-value">{lastGame.towersBuiltTotal}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="stats-panel-empty">No games played yet</div>
            )}
          </>
        )}

        {activeTab === 'highscores' && (
          <>
            {topScores.length === 0 ? (
              <div className="stats-panel-empty">No high scores yet</div>
            ) : (
              <div className="stats-scores">
                <div className="stats-score-row stats-score-header">
                  <span>#</span>
                  <span>Wave</span>
                  <span>Kills</span>
                  <span>Time</span>
                  <span>Mode</span>
                </div>
                {topScores.map((game, index) => (
                  <div key={game.gameId} className="stats-score-row">
                    <span className={index < 3 ? 'stats-score-medal' : ''}>
                      #{index + 1}
                    </span>
                    <span>{game.finalWave}</span>
                    <span>{game.enemiesKilledTotal}</span>
                    <span>{formatDuration(game.duration)}</span>
                    <span>{formatGameMode(game.gameMode)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'overall' && (
          <>
            {summary ? (
              <div className="stats-overview-grid">
                <div className="stats-overview-item">
                  <span className="stats-overview-label">Games</span>
                  <span className="stats-overview-value">{summary.totalGames}</span>
                </div>
                <div className="stats-overview-item highlight">
                  <span className="stats-overview-label">Win Rate</span>
                  <span className="stats-overview-value">
                    {((summary.winRate || 0) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="stats-overview-item">
                  <span className="stats-overview-label">Avg Wave</span>
                  <span className="stats-overview-value">
                    {Math.round(summary.avgWaveReached || 0)}
                  </span>
                </div>
                <div className="stats-overview-item">
                  <span className="stats-overview-label">Total Kills</span>
                  <span className="stats-overview-value">{summary.totalEnemiesKilled}</span>
                </div>
              </div>
            ) : (
              <div className="stats-panel-empty">No statistics yet</div>
            )}
          </>
        )}
      </div>
    </>
  );
};
