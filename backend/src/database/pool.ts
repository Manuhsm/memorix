import pg from 'pg';

/** A conexão vem de DATABASE_URL (ex.: postgresql://usuario:senha@host:porta/banco). */
export function createPool(): pg.Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL não definida.');
  }

  // SSL só para bancos remotos (Supabase); o Postgres local não usa SSL.
  const isLocal = /@(localhost|127\.0\.0\.1)(:|\/)/.test(connectionString);

  const pool = new pg.Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: process.env.VERCEL ? 1 : 10,
    connectionTimeoutMillis: 4000,
    idleTimeoutMillis: 30000,
  });
  // Evita que o processo caia se uma conexão ociosa for derrubada.
  pool.on('error', (err) => console.error('[pg] erro em conexão ociosa:', err.message));
  return pool;
}