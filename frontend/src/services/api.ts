import type {
  AttemptResult,
  PublicGame,
  RankingPage,
  StartPayload,
  Statistics,
} from '../types/api';

const BASE = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Não foi possível conectar ao servidor. Verifique a rede.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.error?.code ?? 'ERROR',
      data?.error?.message ?? 'Erro inesperado. Tente novamente.',
    );
  }
  return data as T;
}

export const api = {
  startGame: (nickname: string) =>
    request<StartPayload>('/games/start', { method: 'POST', body: JSON.stringify({ nickname }) }),

  attempt: (gameId: string, token: string, input: number[], attemptNumber: number) =>
    request<AttemptResult>(`/games/${gameId}/attempt`, {
      method: 'POST',
      headers: { 'x-game-token': token },
      body: JSON.stringify({ input, attemptNumber }),
    }),

  abandon: (gameId: string, token: string) =>
    request<{ game: PublicGame }>(`/games/${gameId}/abandon`, {
      method: 'POST',
      headers: { 'x-game-token': token },
      body: '{}',
    }),

  getGame: (gameId: string) => request<{ game: PublicGame }>(`/games/${gameId}`),

  ranking: (page: number, pageSize = 10) =>
    request<RankingPage>(`/ranking?page=${page}&pageSize=${pageSize}`),

  statistics: () => request<Statistics>('/statistics'),
};
