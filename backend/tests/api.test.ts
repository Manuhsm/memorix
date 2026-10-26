import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { MemoryGameRepository } from '../src/repositories/memoryGameRepository.js';
import { fakeClock, seededRng, wrongInputFor } from './helpers.js';

let repo: MemoryGameRepository;
let clock: ReturnType<typeof fakeClock>;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  repo = new MemoryGameRepository();
  clock = fakeClock();
  app = createApp({ repo, now: clock.now, rng: seededRng(5) });
});

const start = (nickname: unknown) => request(app).post('/api/games/start').send({ nickname });
const attempt = (id: string, token: string, body: object) =>
  request(app).post(`/api/games/${id}/attempt`).set('x-game-token', token).send(body);

describe('API', () => {
  it('GET /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.database).toBe('up');
  });

  it('503 quando o banco está indisponível', async () => {
    repo.failWith = Object.assign(new Error('x'), { code: 'ECONNREFUSED' });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('DB_UNAVAILABLE');
  });

  it.each([[''], ['   '], ['ab'], ['a'.repeat(17)], [123], [null], ['<script>']])(
    'rejeita apelido inválido %j',
    async (nick) => {
      const res = await start(nick);
      expect(res.status).toBe(400);
      expect(res.body.error.message).toBeTruthy();
    },
  );

  it('aceita apelido e remove espaços das pontas', async () => {
    const res = await start('  Ana  ');
    expect(res.status).toBe(201);
    const game = await request(app).get(`/api/games/${res.body.gameId}`);
    expect(game.body.game.nickname).toBe('Ana');
  });

  it('GET /api/games/:id com id inválido retorna 400, inexistente 404', async () => {
    expect((await request(app).get('/api/games/abc')).status).toBe(400);
    expect((await request(app).get('/api/games/6f1c2b9e-3b0a-4c43-9d0b-0d4c1d9c9a11')).status).toBe(404);
  });

  it('não vaza sequência nem token na consulta pública', async () => {
    const s = (await start('Ana')).body;
    const res = await request(app).get(`/api/games/${s.gameId}`);
    expect(JSON.stringify(res.body)).not.toContain(s.token);
    expect(res.body.game.sequence).toBeUndefined();
  });

  it('exige token e valida o corpo da jogada', async () => {
    const s = (await start('Ana')).body;
    clock.tick(10000);
    expect((await request(app).post(`/api/games/${s.gameId}/attempt`).send({ input: [0], attemptNumber: 0 })).status).toBe(401);
    expect((await attempt(s.gameId, s.token, { input: [7], attemptNumber: 0 })).status).toBe(400);
  });

  it('cliente NÃO consegue forjar pontuação, nível ou vidas', async () => {
    const s = (await start('Hacker')).body;
    clock.tick(10000);
    const res = await attempt(s.gameId, s.token, {
      input: wrongInputFor(s.sequence),
      attemptNumber: 0,
      score: 99999,
      level: 5,
      livesRemaining: 3,
      isCompleted: true,
    });
    expect(res.status).toBe(200);
    expect(res.body.game.score).toBe(0);
    expect(res.body.game.currentLevel).toBe(1);
    expect(res.body.game.livesRemaining).toBe(2);
    expect(res.body.game.isCompleted).toBe(false);
  });

  it('fluxo completo: vitória, ranking e estatísticas', async () => {
    const s = (await start('Ana')).body;
    let seq: number[] = s.sequence;
    let n = s.attemptNumber;
    let last;
    for (let i = 0; i < 5; i++) {
      clock.tick(20000);
      last = await attempt(s.gameId, s.token, { input: seq, attemptNumber: n });
      expect(last.status).toBe(200);
      n = last.body.attemptNumber;
      if (last.body.sequence) seq = last.body.sequence;
    }
    expect(last!.body.outcome).toBe('victory');
    expect(last!.body.game.position).toBe(1);

    const ranking = await request(app).get('/api/ranking?page=1&pageSize=10');
    expect(ranking.body.items[0]).toMatchObject({ nickname: 'Ana', isCompleted: true, highestLevel: 5 });
    const stats = await request(app).get('/api/statistics');
    expect(stats.body).toMatchObject({ totalGames: 1, completedGames: 1, completionRate: 100 });

    // finalizar de novo é bloqueado
    const again = await attempt(s.gameId, s.token, { input: [0, 1, 2, 3, 0, 1, 2, 3], attemptNumber: n });
    expect(again.status).toBe(409);
  });

  it('abandonar registra partida incompleta; abandonar 2x é bloqueado', async () => {
    const s = (await start('Ana')).body;
    clock.tick(5000);
    const a = await request(app).post(`/api/games/${s.gameId}/abandon`).set('x-game-token', s.token);
    expect(a.status).toBe(200);
    expect(a.body.game.status).toBe('abandoned');
    const b = await request(app).post(`/api/games/${s.gameId}/abandon`).set('x-game-token', s.token);
    expect(b.status).toBe(409);
  });

  it('valida parâmetros de paginação', async () => {
    expect((await request(app).get('/api/ranking?page=0')).status).toBe(400);
    expect((await request(app).get('/api/ranking?pageSize=999')).status).toBe(400);
    const ok = await request(app).get('/api/ranking');
    expect(ok.body).toMatchObject({ items: [], total: 0, page: 1, pageSize: 10 });
  });
});
