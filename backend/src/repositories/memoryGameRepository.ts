import type { GameRecord, RankingRow, Statistics } from '../types/index.js';
import type { GameRepository } from './gameRepository.js';
import { compareRanking } from '../services/gameRules.js';

/** Implementação em memória, usada SOMENTE nos testes automatizados. O jogo real usa PostgreSQL. */
export class MemoryGameRepository implements GameRepository {
  private games = new Map<string, GameRecord>();
  public failWith: Error | null = null;

  private check() {
    if (this.failWith) throw this.failWith;
  }

  async create(game: GameRecord) {
    this.check();
    this.games.set(game.id, structuredClone(game));
  }

  async findById(id: string) {
    this.check();
    const g = this.games.get(id);
    return g ? structuredClone(g) : null;
  }

  async update(id: string, mutator: (g: GameRecord) => GameRecord) {
    this.check();
    const current = this.games.get(id);
    if (!current) return null;
    const next = mutator(structuredClone(current)); // se lançar, nada é gravado
    next.pendingEvents = [];
    this.games.set(id, next);
    return structuredClone(next);
  }

  private finished() {
    return [...this.games.values()]
      .filter((g) => g.status !== 'in_progress' && g.finishedAt && g.elapsedMs !== null)
      .sort((a, b) =>
        compareRanking(
          { ...a, elapsedMs: a.elapsedMs!, finishedAt: a.finishedAt! },
          { ...b, elapsedMs: b.elapsedMs!, finishedAt: b.finishedAt! },
        ),
      );
  }

  async ranking(page: number, pageSize: number) {
    this.check();
    const all = this.finished();
    const items: RankingRow[] = all.slice((page - 1) * pageSize, page * pageSize).map((g, i) => ({
      position: (page - 1) * pageSize + i + 1,
      gameId: g.id,
      nickname: g.nickname,
      highestLevel: g.highestLevel,
      score: g.score,
      elapsedMs: g.elapsedMs!,
      isCompleted: g.isCompleted,
      status: g.status,
      finishedAt: g.finishedAt!.toISOString(),
    }));
    return { items, total: all.length };
  }

  async position(id: string) {
    this.check();
    const idx = this.finished().findIndex((g) => g.id === id);
    return idx === -1 ? null : idx + 1;
  }

  async statistics(): Promise<Statistics> {
    this.check();
    const all = this.finished();
    const completed = all.filter((g) => g.isCompleted);
    return {
      totalGames: all.length,
      completedGames: completed.length,
      incompleteGames: all.length - completed.length,
      highestLevel: Math.max(0, ...all.map((g) => g.highestLevel)),
      highestScore: Math.max(0, ...all.map((g) => g.score)),
      bestTimeMs: completed.length ? Math.min(...completed.map((g) => g.elapsedMs!)) : null,
      distinctNicknames: new Set(all.map((g) => g.nickname.toLowerCase())).size,
      completionRate: all.length ? Math.round((completed.length / all.length) * 1000) / 10 : 0,
    };
  }

  async ping() {
    this.check();
  }
}
