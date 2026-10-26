import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import type { GameController } from '../controllers/gameController.js';
import type { RankingController } from '../controllers/rankingController.js';

/** Express 4 não captura rejeições de handlers async sozinho. */
const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

export function buildRoutes(
  games: GameController,
  ranking: RankingController,
  startLimiter: RequestHandler,
): Router {
  const r = Router();
  r.get('/health', wrap(ranking.health));
  r.post('/games/start', startLimiter, wrap(games.start));
  r.post('/games/:id/attempt', wrap(games.attempt));
  r.post('/games/:id/abandon', wrap(games.abandon));
  r.get('/games/:id', wrap(games.get));
  r.get('/ranking', wrap(ranking.ranking));
  r.get('/statistics', wrap(ranking.statistics));
  return r;
}
