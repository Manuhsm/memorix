import { z } from 'zod';

export const nicknameSchema = z
  .string({ required_error: 'Informe um apelido.', invalid_type_error: 'Apelido inválido.' })
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .min(3, 'O apelido deve ter no mínimo 3 caracteres.')
      .max(16, 'O apelido deve ter no máximo 16 caracteres.')
      .regex(/^[\p{L}\p{N} _.-]+$/u, 'Use apenas letras, números, espaço, _ , . ou -.'),
  );

export const startSchema = z.object({ nickname: nicknameSchema });

export const attemptSchema = z.object({
  input: z.array(z.number().int().min(0).max(3)).min(1).max(8),
  attemptNumber: z.number().int().min(0),
});

export const uuidParam = z.object({ id: z.string().uuid('Identificador inválido.') });

export const rankingQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export const tokenHeader = z.string().min(20).max(200);
