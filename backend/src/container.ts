import { createPool } from './database/pool.js';
import { PgGameRepository } from './repositories/pgGameRepository.js';

export const pool = createPool();
export const repo = new PgGameRepository(pool);