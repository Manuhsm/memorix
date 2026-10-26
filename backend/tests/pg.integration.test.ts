/**
 * Teste de integração com o PostgreSQL REAL.
 * Só roda se TEST_DATABASE_URL estiver definida (use um banco separado, ex.: banco_memorix_test,
 * já com o schema.sql aplicado). ATENÇÃO: as tabelas são esvaziadas no início.
 *
 *   TEST_DATABASE_URL=postgres://postgres:SENHA@localhost:5432/banco_memorix_test npm test
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { PgGameRepository } from '../src/repositories/pgGameRepository.js';
import { GameService } from '../src/services/gameService.js';
import { fakeClock, seededRng, wrongInputFor } from './helpers.js';

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('PostgreSQL (integração)', () => {
  let pool: pg.Pool;
  let service: GameService;
  let repo: PgGameRepository;
  const clock = fakeClock();

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: url });
    await pool.query('TRUNCATE game_events, game_levels, games, players RESTART IDENTITY CASCADE');
    repo = new PgGameRepository(pool);
    service = new GameService({ repo, now: clock.now, rng: seededRng(9) });
  });
  afterAll(async () => {
    await pool?.end();
  });

  it('persiste partida completa, incompleta, ranking e estatísticas', async () => {
    const a = await service.start('Ana');
    let seq = a.sequence;
    let n = a.attemptNumber;
    for (let i = 0; i < 5; i++) {
      clock.tick(20_000);
      const r = await service.attempt(a.gameId, a.token, seq, n);
      n = r.attemptNumber;
      if (r.sequence) seq = r.sequence;
    }
    const b = await service.start('ana'); // mesmo jogador (case-insensitive)
    let nb = b.attemptNumber;
    for (let i = 0; i < 3; i++) {
      clock.tick(10_000);
      nb = (await service.attempt(b.gameId, b.token, wrongInputFor(b.sequence), nb)).attemptNumber;
    }
    await service.start('EmAndamento');

    const players = await pool.query('SELECT count(*)::int AS n FROM players');
    expect(players.rows[0].n).toBe(2);

    const ranking = await repo.ranking(1, 10);
    expect(ranking.total).toBe(2);
    expect(ranking.items[0]).toMatchObject({ isCompleted: true, highestLevel: 5, position: 1 });
    expect(ranking.items[1]).toMatchObject({ isCompleted: false, status: 'failed' });

    const stats = await repo.statistics();
    expect(stats).toMatchObject({ totalGames: 2, completedGames: 1, distinctNicknames: 1, bestTimeMs: 100_000 });

    const events = await pool.query('SELECT count(*)::int AS n FROM game_events WHERE game_id = $1', [a.gameId]);
    expect(events.rows[0].n).toBeGreaterThan(5);
  });

  it('bloqueia finalização repetida no banco', async () => {
    const s = await service.start('Repetida');
    clock.tick(10_000);
    await service.abandon(s.gameId, s.token);
    await expect(service.abandon(s.gameId, s.token)).rejects.toMatchObject({ status: 409 });
  });
});
