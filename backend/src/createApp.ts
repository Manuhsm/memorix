import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { GameRepository } from './repositories/gameRepository.js';
import { GameService } from './services/gameService.js';
import { RankingService } from './services/rankingService.js';
import { GameController } from './controllers/gameController.js';
import { RankingController } from './controllers/rankingController.js';
import { buildRoutes } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { generalLimiter, startLimiter } from './middlewares/rateLimit.js';
import type { Rng } from './services/gameRules.js';

export interface AppOptions {
  repo: GameRepository;
  now?: () => Date;
  rng?: Rng;
  corsOrigin?: string;
  rateLimitPerMinute?: number;
  /** Desligado nos testes para não interferir. */
  enableRateLimit?: boolean;
}

export function createApp(opts: AppOptions) {
  const app = express();
  const origins = (opts.corsOrigin ?? 'http://localhost:5173').split(',').map((s) => s.trim());
  const perMinute = opts.rateLimitPerMinute ?? 600;

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: origins.includes('*') ? true : origins,
      allowedHeaders: ['Content-Type', 'x-game-token'],
      methods: ['GET', 'POST'],
    }),
  );
  app.use(express.json({ limit: '10kb' }));
  if (opts.enableRateLimit) app.use('/api', generalLimiter(perMinute));

  const gameService = new GameService({ repo: opts.repo, now: opts.now, rng: opts.rng });
  const rankingService = new RankingService(opts.repo);
  const noop: express.RequestHandler = (_req, _res, next) => next();
  app.use(
    '/api',
    buildRoutes(
      new GameController(gameService),
      new RankingController(rankingService, opts.repo),
      opts.enableRateLimit ? startLimiter(Math.max(30, Math.floor(perMinute / 10))) : noop,
    ),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
