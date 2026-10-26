import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/httpError.js';

const DB_DOWN_CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', '57P01', '57P03', '08006', '08001', '08003']);

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada.' } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.issues[0]?.message ?? 'Dados inválidos.',
        details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      },
    });
    return;
  }
  const code = (err as { code?: string } | null)?.code;
  if (code && DB_DOWN_CODES.has(code)) {
    console.error('[db] banco indisponível:', code);
    res.status(503).json({
      error: { code: 'DB_UNAVAILABLE', message: 'Banco de dados indisponível. Tente novamente em instantes.' },
    });
    return;
  }
  if ((err as { type?: string } | null)?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'INVALID_JSON', message: 'JSON inválido.' } });
    return;
  }
  console.error('[erro]', err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Erro interno do servidor.' } });
}
