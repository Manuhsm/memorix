import { describe, it, expect } from 'vitest';
import { makeService, playAndLose, playPerfectGame, wrongInputFor } from './helpers.js';

describe('GameService + repositório (lógica de persistência)', () => {
  it('cria partida e NÃO guarda o token em texto puro', async () => {
    const { service, repo } = makeService();
    const s = await service.start('Ana');
    const stored = await repo.findById(s.gameId);
    expect(stored!.tokenHash).not.toBe(s.token);
    expect(s.sequence).toHaveLength(4);
    expect(s.livesRemaining).toBe(3);
  });

  it('rejeita token inválido', async () => {
    const { service, clock } = makeService();
    const s = await service.start('Ana');
    clock.tick(10000);
    await expect(service.attempt(s.gameId, 'x'.repeat(48), s.sequence, 0)).rejects.toMatchObject({ status: 401 });
  });

  it('partida perfeita é registrada como completa', async () => {
    const { service, clock, repo } = makeService();
    const { start, last } = await playPerfectGame(service, clock, 'Campeao');
    expect(last.outcome).toBe('victory');
    expect(last.game.isCompleted).toBe(true);
    expect(last.game.position).toBe(1);
    expect(last.game.elapsedMs).toBe(100_000);
    const saved = await repo.findById(start.gameId);
    expect(saved!.levels).toHaveLength(5);
    expect(saved!.levels.every((l) => l.completed)).toBe(true);
  });

  it('partida perdida é registrada como incompleta e aparece no ranking', async () => {
    const { service, clock, repo } = makeService();
    const { last } = await playAndLose(service, clock, 'Perdedor', 1);
    expect(last.outcome).toBe('game_over');
    expect(last.game.status).toBe('failed');
    expect(last.game.livesLost).toBe(3);
    const r = await repo.ranking(1, 10);
    expect(r.items).toHaveLength(1);
    expect(r.items[0]!.isCompleted).toBe(false);
  });

  it('impede finalização repetida e ações após o término', async () => {
    const { service, clock } = makeService();
    const { start, last } = await playPerfectGame(service, clock, 'Campeao');
    clock.tick(10000);
    await expect(
      service.attempt(start.gameId, start.token, [0, 1, 2, 3], last.attemptNumber),
    ).rejects.toMatchObject({ status: 409, code: 'GAME_FINISHED' });
    await expect(service.abandon(start.gameId, start.token)).rejects.toMatchObject({ status: 409 });
  });

  it('reenvio da mesma jogada (duplicada) é recusado e não altera o estado', async () => {
    const { service, clock, repo } = makeService();
    const s = await service.start('Ana');
    clock.tick(10000);
    await service.attempt(s.gameId, s.token, wrongInputFor(s.sequence), 0);
    clock.tick(10000);
    await expect(
      service.attempt(s.gameId, s.token, wrongInputFor(s.sequence), 0),
    ).rejects.toMatchObject({ code: 'STALE_ATTEMPT' });
    expect((await repo.findById(s.gameId))!.livesLost).toBe(1);
  });

  it('abandono grava partida incompleta com tempo medido pelo servidor', async () => {
    const { service, clock } = makeService();
    const s = await service.start('Ana');
    clock.tick(12_345);
    const g = await service.abandon(s.gameId, s.token);
    expect(g.status).toBe('abandoned');
    expect(g.isCompleted).toBe(false);
    expect(g.elapsedMs).toBe(12_345);
  });

  it('ranking: nível > pontuação > tempo > mais antigo, e partidas em andamento ficam fora', async () => {
    const { service, clock, repo } = makeService();
    await playAndLose(service, clock, 'Lvl1', 0);            // nível 1, 0 pts
    await playAndLose(service, clock, 'Lvl3', 2);            // nível 3
    await playPerfectGame(service, clock, 'Perfeito', 20_000);
    await playPerfectGame(service, clock, 'Rapido', 5_000);  // mesma pontuação, menos tempo
    await service.start('EmAndamento');                       // não pode aparecer
    const { items, total } = await repo.ranking(1, 10);
    expect(total).toBe(4);
    expect(items.map((i) => i.nickname)).toEqual(['Rapido', 'Perfeito', 'Lvl3', 'Lvl1']);
    expect(items.map((i) => i.position)).toEqual([1, 2, 3, 4]);
  });

  it('paginação do ranking', async () => {
    const { service, clock, repo } = makeService();
    for (let i = 0; i < 12; i++) await playAndLose(service, clock, `Jogador${i}`, 0);
    const p1 = await repo.ranking(1, 10);
    const p2 = await repo.ranking(2, 10);
    expect(p1.items).toHaveLength(10);
    expect(p2.items).toHaveLength(2);
    expect(p2.items[0]!.position).toBe(11);
    expect(p1.total).toBe(12);
  });

  it('estatísticas calculadas a partir dos dados', async () => {
    const { service, clock, repo } = makeService();
    await playPerfectGame(service, clock, 'Ana', 10_000);
    await playAndLose(service, clock, 'Bia', 1);
    await playAndLose(service, clock, 'ana', 0); // mesmo apelido (sem diferenciar maiúsculas)
    const s = await repo.statistics();
    expect(s.totalGames).toBe(3);
    expect(s.completedGames).toBe(1);
    expect(s.incompleteGames).toBe(2);
    expect(s.highestLevel).toBe(5);
    expect(s.bestTimeMs).toBe(50_000);
    expect(s.distinctNicknames).toBe(2);
    expect(s.completionRate).toBe(33.3);
  });

  it('erro de banco é propagado (tratado como 503 pela API)', async () => {
    const { service, repo } = makeService();
    repo.failWith = Object.assign(new Error('refused'), { code: 'ECONNREFUSED' });
    await expect(service.start('Ana')).rejects.toMatchObject({ code: 'ECONNREFUSED' });
  });
});
