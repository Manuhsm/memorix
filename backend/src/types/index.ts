export type GameStatus = 'in_progress' | 'completed' | 'failed' | 'abandoned';
export type Outcome = 'retry' | 'level_up' | 'victory' | 'game_over';

export interface LevelRecord {
  levelNumber: number;
  attempts: number;
  mistakes: number;
  livesRemaining: number;
  scoreEarned: number;
  completed: boolean;
  startedAt: Date;
  finishedAt: Date | null;
}

export interface GameEventInput {
  type: 'start' | 'wrong' | 'level_up' | 'victory' | 'game_over' | 'abandon';
  level: number;
  detail?: Record<string, unknown>;
}

/** Registro completo da partida (somente servidor). `sequence` e `tokenHash` nunca vão para o ranking. */
export interface GameRecord {
  id: string;
  nickname: string;
  tokenHash: string;
  status: GameStatus;
  currentLevel: number;
  highestLevel: number;
  livesRemaining: number;
  livesLost: number;
  score: number;
  attemptCount: number;
  sequence: number[];
  sequenceIssuedAt: Date;
  startedAt: Date;
  finishedAt: Date | null;
  elapsedMs: number | null;
  isCompleted: boolean;
  levels: LevelRecord[];
  pendingEvents: GameEventInput[];
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

export interface StartPayload {
  gameId: string;
  token: string;
  level: number;
  livesRemaining: number;
  sequence: number[];
  attemptNumber: number;
  totalLevels: number;
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
