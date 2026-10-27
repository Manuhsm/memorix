import 'dotenv/config';
import app, { pool, repo } from './app.js';

const port = Number(process.env.PORT ?? 3333);

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