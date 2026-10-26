import pg from 'pg';

/** Credenciais vêm SEMPRE de variáveis de ambiente (PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD). */
export function createPool(): pg.Pool {
  const pool = new pg.Pool({
    host: process.env.PGHOST ?? 'localhost',
    port: Number(process.env.PGPORT ?? 5432),
    database: process.env.PGDATABASE ?? 'banco_memorix',
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    max: 10,
    connectionTimeoutMillis: 4000,
    idleTimeoutMillis: 30000,
  });
  // Evita que o processo caia se uma conexão ociosa for derrubada.
  pool.on('error', (err) => console.error('[pg] erro em conexão ociosa:', err.message));
  return pool;
}
