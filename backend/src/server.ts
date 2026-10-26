import 'dotenv/config';
import { createApp } from './app.js';
import { createPool } from './database/pool.js';
import { PgGameRepository } from './repositories/pgGameRepository.js';

const pool = createPool();
const repo = new PgGameRepository(pool);
const port = Number(process.env.PORT ?? 3333);

const app = createApp({
  repo,
  corsOrigin: process.env.CORS_ORIGIN,
  rateLimitPerMinute: Number(process.env.RATE_LIMIT_PER_MINUTE ?? 600),
  enableRateLimit: true,
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`[memorix] API em http://localhost:${port}/api (teste: /api/health)`);
  repo
    .ping()
    .then(() => console.log('[memorix] conexão com o PostgreSQL OK'))
    .catch((e: Error) => console.error('[memorix] ATENÇÃO: sem conexão com o PostgreSQL:', e.message));
});

const shutdown = () => {
  server.close(() => pool.end().finally(() => process.exit(0)));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
