export type GameStatus = 'in_progress' | 'completed' | 'failed' | 'abandoned';
export type Outcome = 'retry' | 'level_up' | 'victory' | 'game_over';

export interface StartPayload {
  gameId: string;
  token: string;
  level: number;
  livesRemaining: number;
  sequence: number[];
  attemptNumber: number;
  totalLevels: number;
}

export interface PublicGame {
  id: string;
  nickname: string;
  status: GameStatus;
  currentLevel: number;
  highestLevel: number;
  livesRemaining: number;
  livesLost: number;
  score: number;
  isCompleted: boolean;
  startedAt: string;
  finishedAt: string | null;
  elapsedMs: number | null;
  position: number | null;
}

export interface AttemptResult {
  outcome: Outcome;
  pointsEarned: number;
  game: PublicGame;
  sequence?: number[];
  level: number;
  livesRemaining: number;
  attemptNumber: number;
}

export interface RankingRow {
  position: number;
  gameId: string;
  nickname: string;
  highestLevel: number;
  score: number;
  elapsedMs: number;
  isCompleted: boolean;
  status: GameStatus;
  finishedAt: string;
}

export interface RankingPage {
  items: RankingRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Statistics {
  totalGames: number;
  completedGames: number;
  incompleteGames: number;
  highestLevel: number;
  highestScore: number;
  bestTimeMs: number | null;
  distinctNicknames: number;
  completionRate: number;
}

/** Dados que a tela de identificação entrega à tela do jogo via router state. */
export interface GameSession {
  start: StartPayload;
  nickname: string;
  startedAtClient: number;
}
