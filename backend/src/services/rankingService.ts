import type { GameRepository } from '../repositories/gameRepository.js';

export class RankingService {
  constructor(private repo: GameRepository) {}

  async list(page: number, pageSize: number) {
    const { items, total } = await this.repo.ranking(page, pageSize);
    return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  statistics() {
    return this.repo.statistics();
  }
}
