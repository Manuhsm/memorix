import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type {
  AttemptResult,
  GameRecord,
  Outcome,
  PublicGame,
  StartPayload,
} from '../types/index.js';
import type { GameRepository } from '../repositories/gameRepository.js';
import {
  TOTAL_LEVELS,
  applyAbandon,
  applyAttempt,
  assertPlausibleInput,
  createGameRecord,
  secureRng,
  type Rng,
} from './gameRules.js';
import { conflict, notFound, unauthorized } from '../utils/httpError.js';

const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');

export interface GameServiceDeps {
  repo: GameRepository;
  now?: () => Date;
  rng?: Rng;
}

export class GameService {
  private repo: GameRepository;
  private now: () => Date;
  private rng: Rng;

  constructor(deps: GameServiceDeps) {
    this.repo = deps.repo;
    this.now = deps.now ?? (() => new Date());
    this.rng = deps.rng ?? secureRng;
  }

  toPublic(g: GameRecord, position: number | null = null): PublicGame {
    return {
      id: g.id,
      nickname: g.nickname,
      status: g.status,
      currentLevel: g.currentLevel,
      highestLevel: g.highestLevel,
      livesRemaining: g.livesRemaining,
      livesLost: g.livesLost,
      score: g.score,
      isCompleted: g.isCompleted,
      startedAt: g.startedAt.toISOString(),
      finishedAt: g.finishedAt ? g.finishedAt.toISOString() : null,
      elapsedMs: g.elapsedMs,
      position,
    };
  }

  private assertToken(g: GameRecord, token: string) {
    const a = Buffer.from(hashToken(token), 'hex');
    const b = Buffer.from(g.tokenHash, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw unauthorized('Token da partida inválido.');
    }
  }

  async start(nickname: string): Promise<StartPayload> {
    const token = randomBytes(24).toString('hex');
    const game = createGameRecord(randomUUID(), nickname, hashToken(token), this.now(), this.rng);
    await this.repo.create(game);
    return {
      gameId: game.id,
      token,
      level: game.currentLevel,
      livesRemaining: game.livesRemaining,
      sequence: game.sequence,
      attemptNumber: game.attemptCount,
      totalLevels: TOTAL_LEVELS,
    };
  }

  async attempt(
    id: string,
    token: string,
    input: number[],
    attemptNumber: number,
  ): Promise<AttemptResult> {
    let outcome: Outcome = 'retry';
    let points = 0;
    const updated = await this.repo.update(id, (game) => {
      this.assertToken(game, token);
      if (game.status !== 'in_progress') throw conflict('Esta partida já foi finalizada.', 'GAME_FINISHED');
      if (attemptNumber !== game.attemptCount) {
        throw conflict('Jogada duplicada ou fora de ordem.', 'STALE_ATTEMPT');
      }
      const now = this.now();
      assertPlausibleInput(game, input, now);
      const res = applyAttempt(game, input, now, this.rng);
      outcome = res.outcome;
      points = res.pointsEarned;
      return res.game;
    });
    if (!updated) throw notFound('Partida não encontrada.');

    const finished = updated.status !== 'in_progress';
    const position = finished ? await this.repo.position(id) : null;
    return {
      outcome,
      pointsEarned: points,
      game: this.toPublic(updated, position),
      sequence: finished ? undefined : updated.sequence,
      level: updated.currentLevel,
      livesRemaining: updated.livesRemaining,
      attemptNumber: updated.attemptCount,
    };
  }

  async abandon(id: string, token: string): Promise<PublicGame> {
    const updated = await this.repo.update(id, (game) => {
      this.assertToken(game, token);
      if (game.status !== 'in_progress') throw conflict('Esta partida já foi finalizada.', 'GAME_FINISHED');
      return applyAbandon(game, this.now());
    });
    if (!updated) throw notFound('Partida não encontrada.');
    return this.toPublic(updated, await this.repo.position(id));
  }

  /** Consulta pública do resultado (nunca expõe sequência nem token). */
  async get(id: string): Promise<PublicGame> {
    const g = await this.repo.findById(id);
    if (!g) throw notFound('Partida não encontrada.');
    const position = g.status === 'in_progress' ? null : await this.repo.position(id);
    return this.toPublic(g, position);
  }
}
