import type {
  GameMode,
  SettingsMode,
  StartGameResponse,
  GameStateResponse,
  BuildTowerRequest,
  BuildTowerResponse,
  UpgradeTowerResponse,
  SellTowerResponse,
  StartWaveResponse,
  EndGameRequest,
  EndGameResponse,
} from '../types';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

export class GamePlayClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async startGame(
    gameMode: GameMode,
    difficulty: SettingsMode,
  ): Promise<StartGameResponse> {
    return this.post<StartGameResponse>('/api/game/start', {
      gameMode,
      difficulty,
    });
  }

  async getGameState(gameId: string): Promise<GameStateResponse> {
    return this.get<GameStateResponse>(`/api/game/${gameId}/state`);
  }

  async buildTower(
    gameId: string,
    data: BuildTowerRequest,
  ): Promise<BuildTowerResponse> {
    return this.post<BuildTowerResponse>(`/api/game/${gameId}/tower`, { ...data });
  }

  async upgradeTower(
    gameId: string,
    towerId: string,
  ): Promise<UpgradeTowerResponse> {
    return this.post<UpgradeTowerResponse>(
      `/api/game/${gameId}/tower/${towerId}/upgrade`,
      {},
    );
  }

  async sellTower(
    gameId: string,
    towerId: string,
  ): Promise<SellTowerResponse> {
    return this.delete<SellTowerResponse>(
      `/api/game/${gameId}/tower/${towerId}`,
    );
  }

  async startWave(gameId: string): Promise<StartWaveResponse> {
    return this.post<StartWaveResponse>(`/api/game/${gameId}/wave`, {});
  }

  async addCoins(
    gameId: string,
    amount: number,
  ): Promise<{ coins: number }> {
    return this.post<{ coins: number }>(`/api/game/${gameId}/coins`, {
      amount,
    });
  }

  async loseLife(
    gameId: string,
  ): Promise<{ lives: number; gameOver: boolean }> {
    return this.post<{ lives: number; gameOver: boolean }>(
      `/api/game/${gameId}/life/lose`,
      {},
    );
  }

  async endGame(
    gameId: string,
    data: EndGameRequest,
  ): Promise<EndGameResponse> {
    return this.post<EndGameResponse>(`/api/game/${gameId}/end`, { ...data });
  }

  private async get<T>(path: string): Promise<T> {
    return this.requestWithRetry<T>('GET', path);
  }

  private async post<T>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    return this.requestWithRetry<T>('POST', path, body);
  }

  private async delete<T>(path: string): Promise<T> {
    return this.requestWithRetry<T>('DELETE', path);
  }

  private async requestWithRetry<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const options: RequestInit = {
          method,
          headers: { 'Content-Type': 'application/json' },
        };
        if (body !== undefined) {
          options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          throw new Error(
            `${method} ${path} failed (${response.status}): ${text || response.statusText}`,
          );
        }

        return (await response.json()) as T;
      } catch (err: unknown) {
        lastError =
          err instanceof Error ? err : new Error(String(err));

        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS);
        }
      }
    }

    throw lastError ?? new Error(`${method} ${path} failed after ${MAX_RETRIES} retries`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
