import type {
  TowerDefinition,
  EnemyDefinition,
  GameSettings,
  SettingsMode,
  WaveDefinition,
} from '../types';

export class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async getTowers(): Promise<TowerDefinition[]> {
    return this.get<TowerDefinition[]>('/api/config/towers');
  }

  async getEnemies(): Promise<EnemyDefinition[]> {
    return this.get<EnemyDefinition[]>('/api/config/enemies');
  }

  async getSettings(mode?: SettingsMode): Promise<GameSettings[]> {
    const path = mode
      ? `/api/config/settings/${mode}`
      : '/api/config/settings';
    const result = await this.get<GameSettings | GameSettings[]>(path);
    return Array.isArray(result) ? result : [result];
  }

  async getWaves(): Promise<WaveDefinition[]> {
    return this.get<WaveDefinition[]>('/api/config/waves');
  }

  async patchTower(id: number, body: Record<string, unknown>): Promise<void> {
    await this.patch(`/api/config/towers/${id}`, body);
  }

  async patchEnemy(id: number, body: Record<string, unknown>): Promise<void> {
    await this.patch(`/api/config/enemies/${id}`, body);
  }

  async patchSettings(
    id: number,
    body: Record<string, unknown>,
  ): Promise<void> {
    await this.patch(`/api/config/settings/${id}`, body);
  }

  async putTowerLevel(
    towerId: number,
    level: number,
    body: Record<string, unknown>,
  ): Promise<void> {
    await this.put(`/api/config/towers/${towerId}/levels/${level}`, body);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async get<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url);

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `GET ${path} failed (${response.status}): ${body || response.statusText}`,
      );
    }

    return (await response.json()) as T;
  }

  private async patch(
    path: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `PATCH ${path} failed (${response.status}): ${text || response.statusText}`,
      );
    }
  }

  private async put(
    path: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `PUT ${path} failed (${response.status}): ${text || response.statusText}`,
      );
    }
  }
}
