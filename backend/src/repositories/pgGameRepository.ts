import type pg from 'pg';
import type { GameRecord, GameStatus, LevelRecord, RankingRow, Statistics } from '../types/index.js';
import type { GameRepository } from './gameRepository.js';

const num = (v: unknown) => Number(v);

/** Todas as consultas usam parâmetros ($1, $2...) — sem concatenar texto vindo do cliente. */
export class PgGameRepository implements GameRepository {
  constructor(private pool: pg.Pool) {}

  async create(game: GameRecord): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const player = await client.query<{ id: string }>(
        `INSERT INTO players (nickname) VALUES ($1)
         ON CONFLICT ((lower(nickname))) DO UPDATE SET nickname = players.nickname
         RETURNING id`,
        [game.nickname],
      );
      await client.query(
        `INSERT INTO games (id, player_id, token_hash, status, current_level, highest_level,
           lives_remaining, lives_lost, score, attempt_count, current_sequence, sequence_issued_at,
           started_at, is_completed)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          game.id, player.rows[0]!.id, game.tokenHash, game.status, game.currentLevel,
          game.highestLevel, game.livesRemaining, game.livesLost, game.score, game.attemptCount,
          game.sequence, game.sequenceIssuedAt, game.startedAt, game.isCompleted,
        ],
      );
      await this.saveChildren(client, game);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  private async load(client: pg.Pool | pg.PoolClient, id: string, lock: boolean) {
    const g = await client.query(
      `SELECT g.*, p.nickname FROM games g JOIN players p ON p.id = g.player_id
       WHERE g.id = $1 ${lock ? 'FOR UPDATE OF g' : ''}`,
      [id],
    );
    const row = g.rows[0];
    if (!row) return null;
    const lv = await client.query(
      'SELECT * FROM game_levels WHERE game_id = $1 ORDER BY level_number',
      [id],
    );
    const levels: LevelRecord[] = lv.rows.map((l) => ({
      levelNumber: l.level_number,
      attempts: l.attempts,
      mistakes: l.mistakes,
      livesRemaining: l.lives_remaining,
      scoreEarned: l.score_earned,
      completed: l.completed,
      startedAt: l.started_at,
      finishedAt: l.finished_at,
    }));
    const game: GameRecord = {
      id: row.id,
      nickname: row.nickname,
      tokenHash: row.token_hash,
      status: row.status as GameStatus,
      currentLevel: row.current_level,
      highestLevel: row.highest_level,
      livesRemaining: row.lives_remaining,
      livesLost: row.lives_lost,
      score: row.score,
      attemptCount: row.attempt_count,
      sequence: row.current_sequence,
      sequenceIssuedAt: row.sequence_issued_at,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      elapsedMs: row.elapsed_time_ms,
      isCompleted: row.is_completed,
      levels,
      pendingEvents: [],
    };
    return game;
  }

  private async saveChildren(client: pg.PoolClient, game: GameRecord) {
    for (const l of game.levels) {
      await client.query(
        `INSERT INTO game_levels (game_id, level_number, attempts, mistakes, lives_remaining,
           score_earned, completed, started_at, finished_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (game_id, level_number) DO UPDATE SET
           attempts = EXCLUDED.attempts, mistakes = EXCLUDED.mistakes,
           lives_remaining = EXCLUDED.lives_remaining, score_earned = EXCLUDED.score_earned,
           completed = EXCLUDED.completed, finished_at = EXCLUDED.finished_at`,
        [game.id, l.levelNumber, l.attempts, l.mistakes, l.livesRemaining, l.scoreEarned,
         l.completed, l.startedAt, l.finishedAt],
      );
    }
    for (const e of game.pendingEvents) {
      await client.query(
        'INSERT INTO game_events (game_id, event_type, level_number, detail) VALUES ($1,$2,$3,$4)',
        [game.id, e.type, e.level, JSON.stringify(e.detail ?? {})],
      );
    }
  }

  findById(id: string) {
    return this.load(this.pool, id, false);
  }

  async update(id: string, mutator: (g: GameRecord) => GameRecord) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const current = await this.load(client, id, true); // bloqueia a linha: impede corrida
      if (!current) {
        await client.query('ROLLBACK');
        return null;
      }
      const next = mutator(current);
      await client.query(
        `UPDATE games SET status=$2, current_level=$3, highest_level=$4, lives_remaining=$5,
           lives_lost=$6, score=$7, attempt_count=$8, current_sequence=$9, sequence_issued_at=$10,
           finished_at=$11, elapsed_time_ms=$12, is_completed=$13
         WHERE id=$1`,
        [id, next.status, next.currentLevel, next.highestLevel, next.livesRemaining, next.livesLost,
         next.score, next.attemptCount, next.sequence, next.sequenceIssuedAt, next.finishedAt,
         next.elapsedMs, next.isCompleted],
      );
      await this.saveChildren(client, next);
      await client.query('COMMIT');
      next.pendingEvents = [];
      return next;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async ranking(page: number, pageSize: number) {
    const { rows } = await this.pool.query(
      `SELECT * FROM (
         SELECT ROW_NUMBER() OVER (
                  ORDER BY g.highest_level DESC, g.score DESC, g.elapsed_time_ms ASC,
                           g.finished_at ASC, g.id ASC)::int AS position,
                g.id, p.nickname, g.highest_level, g.score, g.elapsed_time_ms,
                g.is_completed, g.status, g.finished_at
         FROM games g JOIN players p ON p.id = g.player_id
         WHERE g.status <> 'in_progress'
       ) r ORDER BY position LIMIT $1 OFFSET $2`,
      [pageSize, (page - 1) * pageSize],
    );
    const total = await this.pool.query(
      "SELECT COUNT(*)::int AS n FROM games WHERE status <> 'in_progress'",
    );
    const items: RankingRow[] = rows.map((r) => ({
      position: num(r.position),
      gameId: r.id,
      nickname: r.nickname,
      highestLevel: r.highest_level,
      score: r.score,
      elapsedMs: r.elapsed_time_ms,
      isCompleted: r.is_completed,
      status: r.status,
      finishedAt: new Date(r.finished_at).toISOString(),
    }));
    return { items, total: num(total.rows[0].n) };
  }

  async position(id: string) {
    const { rows } = await this.pool.query(
      `SELECT position FROM (
         SELECT g.id, ROW_NUMBER() OVER (
                  ORDER BY g.highest_level DESC, g.score DESC, g.elapsed_time_ms ASC,
                           g.finished_at ASC, g.id ASC)::int AS position
         FROM games g WHERE g.status <> 'in_progress'
       ) r WHERE r.id = $1`,
      [id],
    );
    return rows[0] ? num(rows[0].position) : null;
  }

  async statistics(): Promise<Statistics> {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE is_completed)::int AS completed,
              COALESCE(MAX(highest_level), 0)::int AS max_level,
              COALESCE(MAX(score), 0)::int AS max_score,
              MIN(elapsed_time_ms) FILTER (WHERE is_completed)::int AS best_time,
              COUNT(DISTINCT player_id)::int AS players
       FROM games WHERE status <> 'in_progress'`,
    );
    const r = rows[0];
    const total = num(r.total);
    const completed = num(r.completed);
    return {
      totalGames: total,
      completedGames: completed,
      incompleteGames: total - completed,
      highestLevel: num(r.max_level),
      highestScore: num(r.max_score),
      bestTimeMs: r.best_time === null ? null : num(r.best_time),
      distinctNicknames: num(r.players),
      completionRate: total ? Math.round((completed / total) * 1000) / 10 : 0,
    };
  }

  async ping() {
    await this.pool.query('SELECT 1');
  }
}
