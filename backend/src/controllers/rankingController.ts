import type { Request, Response } from 'express';
import type { GameRepository } from '../repositories/gameRepository.js';
import type { RankingService } from '../services/rankingService.js';
import { rankingQuery } from '../validators/schemas.js';

export class RankingController {
  constructor(
    private service: RankingService,
    private repo: GameRepository,
  ) {}

  ranking = async (req: Request, res: Response) => {
    const { page, pageSize } = rankingQuery.parse(req.query);
    res.json(await this.service.list(page, pageSize));
  };

  statistics = async (_req: Request, res: Response) => {
    res.json(await this.service.statistics());
  };

  health = async (_req: Request, res: Response) => {
    await this.repo.ping();
    res.json({ status: 'ok', database: 'up', time: new Date().toISOString() });
  };
}
