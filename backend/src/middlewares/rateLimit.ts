import rateLimit from 'express-rate-limit';

const tooMany = {
  error: { code: 'RATE_LIMIT', message: 'Muitas requisições. Aguarde um momento.' },
};

export const generalLimiter = (perMinute: number) =>
  rateLimit({ windowMs: 60_000, limit: perMinute, standardHeaders: true, legacyHeaders: false, message: tooMany });

/** Criar partidas é mais caro: limite menor. */
export const startLimiter = (perMinute: number) =>
  rateLimit({ windowMs: 60_000, limit: perMinute, standardHeaders: true, legacyHeaders: false, message: tooMany });
