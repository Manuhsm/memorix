import { randomInt } from 'node:crypto';
import type { GameRecord, LevelRecord, Outcome } from '../types/index.js';
import { badRequest } from '../utils/httpError.js';

export const TOTAL_LEVELS = 5;
export const LEVEL_LENGTHS = [4, 5, 6, 7, 8] as const;
export const LIVES_PER_LEVEL = 3;
export const PAD_COUNT = 4;

/** Fórmula oficial de pontuação (documentada no README). */
export const BASE_POINTS_PER_LEVEL = 100; // × número do nível
export const POINTS_PER_REMAINING_LIFE = 50;
export const COMPLETION_BONUS = 500;
/** Tempo mínimo por cor da sequência (ms): a animação sozinha já leva mais que isso. */
export const MIN_MS_PER_ELEMENT = 300;

export type Rng = (maxExclusive: number) => number;
export const secureRng: Rng = (n) => randomInt(n);

export function generateSequence(length: number, rng: Rng = secureRng): number[] {
  return Array.from({ length }, () => rng(PAD_COUNT));
}

export function levelScore(level: number, livesRemaining: number): number {
  return BASE_POINTS_PER_LEVEL * level + POINTS_PER_REMAINING_LIFE * livesRemaining;
}

export function newLevelRecord(levelNumber: number, now: Date): LevelRecord {
  return {
    levelNumber,
    attempts: 0,
    mistakes: 0,
    livesRemaining: LIVES_PER_LEVEL,
    scoreEarned: 0,
    completed: false,
    startedAt: now,
    finishedAt: null,
  };
}

export function createGameRecord(
  id: string,
  nickname: string,
  tokenHash: string,
  now: Date,
  rng: Rng = secureRng,
): GameRecord {
  return {
    id,
    nickname,
    tokenHash,
    status: 'in_progress',
    currentLevel: 1,
    highestLevel: 1,
    livesRemaining: LIVES_PER_LEVEL,
    livesLost: 0,
    score: 0,
    attemptCount: 0,
    sequence: generateSequence(LEVEL_LENGTHS[0], rng),
    sequenceIssuedAt: now,
    startedAt: now,
    finishedAt: null,
    elapsedMs: null,
    isCompleted: false,
    levels: [newLevelRecord(1, now)],
    pendingEvents: [{ type: 'start', level: 1 }],
  };
}

function finish(game: GameRecord, now: Date) {
  game.finishedAt = now;
  game.elapsedMs = Math.max(1, now.getTime() - game.startedAt.getTime());
}

/** Valida o formato da jogada e se o ritmo é plausível. Lança HttpError em caso de problema. */
export function assertPlausibleInput(game: GameRecord, input: number[], now: Date) {
  const expected = game.sequence.length;
  if (input.length === 0 || input.length > expected) {
    throw badRequest(`A jogada deve ter entre 1 e ${expected} cores.`, 'INVALID_INPUT');
  }
  if (input.some((v) => !Number.isInteger(v) || v < 0 || v >= PAD_COUNT)) {
    throw badRequest('Cor inválida na jogada.', 'INVALID_INPUT');
  }
  const prefixOk = input.every((v, i) => v === game.sequence[i]);
  if (prefixOk && input.length < expected) {
    throw badRequest('Sequência incompleta: envie apenas ao terminar ou ao errar.', 'INCOMPLETE');
  }
  if (now.getTime() - game.sequenceIssuedAt.getTime() < expected * MIN_MS_PER_ELEMENT) {
    throw badRequest('Jogada rápida demais para ser legítima.', 'TOO_FAST');
  }
}

export interface AttemptApplication {
  game: GameRecord;
  outcome: Outcome;
  pointsEarned: number;
}

/** Aplica uma jogada. Função pura: devolve um NOVO objeto e não faz I/O. */
export function applyAttempt(
  source: GameRecord,
  input: number[],
  now: Date,
  rng: Rng = secureRng,
): AttemptApplication {
  const game: GameRecord = structuredClone(source);
  const level = game.levels.find((l) => l.levelNumber === game.currentLevel)!;
  const correct =
    input.length === game.sequence.length && input.every((v, i) => v === game.sequence[i]);

  level.attempts += 1;
  game.attemptCount += 1;
  game.pendingEvents = [];

  if (correct) {
    let points = levelScore(game.currentLevel, level.livesRemaining);
    level.scoreEarned = points;
    level.completed = true;
    level.finishedAt = now;

    if (game.currentLevel === TOTAL_LEVELS) {
      points += COMPLETION_BONUS;
      game.score += points;
      game.status = 'completed';
      game.isCompleted = true;
      finish(game, now);
      game.pendingEvents.push({ type: 'victory', level: game.currentLevel, detail: { points } });
      return { game, outcome: 'victory', pointsEarned: points };
    }

    game.score += points;
    game.currentLevel += 1;
    game.highestLevel = Math.max(game.highestLevel, game.currentLevel);
    game.livesRemaining = LIVES_PER_LEVEL; // vidas NÃO acumulam entre níveis
    game.levels.push(newLevelRecord(game.currentLevel, now));
    game.sequence = generateSequence(LEVEL_LENGTHS[game.currentLevel - 1]!, rng);
    game.sequenceIssuedAt = now;
    game.pendingEvents.push({ type: 'level_up', level: game.currentLevel, detail: { points } });
    return { game, outcome: 'level_up', pointsEarned: points };
  }

  // Erro: perde uma vida; nenhum ponto de conclusão é concedido.
  level.mistakes += 1;
  level.livesRemaining -= 1;
  game.livesRemaining -= 1;
  game.livesLost += 1;
  game.pendingEvents.push({
    type: 'wrong',
    level: game.currentLevel,
    detail: { lives: game.livesRemaining },
  });

  if (game.livesRemaining <= 0) {
    level.finishedAt = now;
    game.status = 'failed';
    finish(game, now);
    game.pendingEvents.push({ type: 'game_over', level: game.currentLevel });
    return { game, outcome: 'game_over', pointsEarned: 0 };
  }
  game.sequenceIssuedAt = now; // a mesma sequência é reproduzida de novo
  return { game, outcome: 'retry', pointsEarned: 0 };
}

export function applyAbandon(source: GameRecord, now: Date): GameRecord {
  const game: GameRecord = structuredClone(source);
  game.status = 'abandoned';
  game.isCompleted = false;
  game.pendingEvents = [{ type: 'abandon', level: game.currentLevel }];
  finish(game, now);
  return game;
}

type Rankable = {
  highestLevel: number;
  score: number;
  elapsedMs: number;
  finishedAt: Date;
  id: string;
};

/** Comparador oficial do ranking (espelha o ORDER BY do SQL). */
export function compareRanking(a: Rankable, b: Rankable): number {
  return (
    b.highestLevel - a.highestLevel ||
    b.score - a.score ||
    a.elapsedMs - b.elapsedMs ||
    a.finishedAt.getTime() - b.finishedAt.getTime() ||
    a.id.localeCompare(b.id)
  );
}
