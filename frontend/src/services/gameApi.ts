import axios from 'axios';
import type {
  GameConfigResponse,
  StartGameResponse,
  BuildTowerRequest,
  BuildTowerResponse,
  StartWaveResponse,
  EndGameRequest,
  EndGameResponse,
  GameStateResponse,
  UpgradeTowerResponse,
  SellTowerResponse,
  StatisticsSummary,
  GameStatistics,
  GameSettings,
  TowerDefinitionWithLevels,
  TowerLevel,
  EnemyDefinition,
} from '../types';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const gameApi = {
  /**
   * Get game configuration (tower and enemy definitions)
   */
  async getConfig(): Promise<GameConfigResponse> {
    const response = await api.get<GameConfigResponse>('/game/config');
    return response.data;
  },

  /**
   * Start a new game session
   */
  async startGame(difficulty: string = 'normal'): Promise<StartGameResponse> {
    const response = await api.post<StartGameResponse>('/game/start', { difficulty });
    return response.data;
  },

  /**
   * Build a tower at the specified grid position
   */
  async buildTower(gameId: string, request: BuildTowerRequest): Promise<BuildTowerResponse> {
    const response = await api.post<BuildTowerResponse>(`/game/${gameId}/tower`, request);
    return response.data;
  },

  /**
   * Start the next wave
   */
  async startWave(gameId: string): Promise<StartWaveResponse> {
    const response = await api.post<StartWaveResponse>(`/game/${gameId}/wave`);
    return response.data;
  },

  /**
   * Get current game state
   */
  async getGameState(gameId: string): Promise<GameStateResponse> {
    const response = await api.get<GameStateResponse>(`/game/${gameId}/state`);
    return response.data;
  },

  /**
   * End the game and submit final statistics
   */
  async endGame(gameId: string, request: EndGameRequest): Promise<EndGameResponse> {
    const response = await api.post<EndGameResponse>(`/game/${gameId}/end`, request);
    return response.data;
  },

  /**
   * Upgrade a tower to the next level
   */
  async upgradeTower(gameId: string, towerId: string): Promise<UpgradeTowerResponse> {
    const response = await api.post<UpgradeTowerResponse>(
      `/game/${gameId}/tower/${towerId}/upgrade`
    );
    return response.data;
  },

  /**
   * Sell a tower for a partial refund
   */
  async sellTower(gameId: string, towerId: string): Promise<SellTowerResponse> {
    const response = await api.delete<SellTowerResponse>(`/game/${gameId}/tower/${towerId}`);
    return response.data;
  },

  /**
   * Get all settings presets
   */
  async getAllSettings(): Promise<GameSettings[]> {
    const response = await api.get<GameSettings[]>('/config/settings');
    return response.data;
  },

  /**
   * Get settings by mode
   */
  async getSettings(mode: string): Promise<GameSettings> {
    const response = await api.get<GameSettings>(`/config/settings/${mode}`);
    return response.data;
  },

  /**
   * Get statistics summary
   */
  async getStatisticsSummary(): Promise<StatisticsSummary> {
    const response = await api.get<StatisticsSummary>('/statistics/summary');
    return response.data;
  },

  /**
   * Get recent games
   */
  async getRecentGames(limit = 10): Promise<GameStatistics[]> {
    const response = await api.get<GameStatistics[]>(`/statistics/recent?limit=${limit}`);
    return response.data;
  },

  /**
   * Get top scores
   */
  async getTopScores(limit = 10): Promise<GameStatistics[]> {
    const response = await api.get<GameStatistics[]>(`/statistics/top-scores?limit=${limit}`);
    return response.data;
  },

  /**
   * Get all tower definitions
   */
  async getAllTowerDefinitions(): Promise<TowerDefinitionWithLevels[]> {
    const response = await api.get<TowerDefinitionWithLevels[]>('/config/towers');
    return response.data;
  },

  /**
   * Update a tower definition (metadata only)
   */
  async updateTowerDefinition(
    id: number,
    updates: Partial<Omit<TowerDefinitionWithLevels, 'levels'>>
  ): Promise<TowerDefinitionWithLevels> {
    const response = await api.patch<TowerDefinitionWithLevels>(`/config/towers/${id}`, updates);
    return response.data;
  },

  /**
   * Get all enemy definitions
   */
  async getAllEnemyDefinitions(): Promise<EnemyDefinition[]> {
    const response = await api.get<EnemyDefinition[]>('/config/enemies');
    return response.data;
  },

  /**
   * Update an enemy definition
   */
  async updateEnemyDefinition(
    id: number,
    updates: Partial<EnemyDefinition>
  ): Promise<EnemyDefinition> {
    const response = await api.patch<EnemyDefinition>(`/config/enemies/${id}`, updates);
    return response.data;
  },

  /**
   * Update game settings by ID
   */
  async updateSettings(id: number, updates: Partial<GameSettings>): Promise<GameSettings> {
    const response = await api.patch<GameSettings>(`/config/settings/${id}`, updates);
    return response.data;
  },

  /**
   * Get all levels for a tower ID
   */
  async getTowerLevels(towerId: number): Promise<TowerLevel[]> {
    const response = await api.get<TowerLevel[]>(`/config/towers/${towerId}/levels`);
    return response.data;
  },

  /**
   * Get specific level for a tower ID
   */
  async getTowerLevel(towerId: number, level: number): Promise<TowerLevel> {
    const response = await api.get<TowerLevel>(`/config/towers/${towerId}/levels/${level}`);
    return response.data;
  },

  /**
   * Create or update a tower level
   */
  async upsertTowerLevel(
    towerId: number,
    level: number,
    data: Omit<TowerLevel, 'towerId' | 'level'>
  ): Promise<TowerLevel> {
    const response = await api.put<TowerLevel>(`/config/towers/${towerId}/levels/${level}`, data);
    return response.data;
  },

  /**
   * Delete a tower level
   */
  async deleteTowerLevel(towerId: number, level: number): Promise<{ success: boolean }> {
    const response = await api.delete<{ success: boolean }>(
      `/config/towers/${towerId}/levels/${level}`
    );
    return response.data;
  },

  /**
   * Add coins to the game (when enemy dies)
   */
  async addCoins(gameId: string, amount: number): Promise<{ success: boolean; coins: number }> {
    const response = await api.post<{ success: boolean; coins: number }>(`/game/${gameId}/coins`, {
      amount,
    });
    return response.data;
  },

  /**
   * Lose a life (when enemy reaches end)
   */
  async loseLife(gameId: string): Promise<{ success: boolean; lives: number; gameOver: boolean }> {
    const response = await api.post<{ success: boolean; lives: number; gameOver: boolean }>(
      `/game/${gameId}/life/lose`
    );
    return response.data;
  },
};
