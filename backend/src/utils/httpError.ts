export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string, code = 'BAD_REQUEST', details?: unknown) =>
  new HttpError(400, code, msg, details);
export const unauthorized = (msg: string) => new HttpError(401, 'UNAUTHORIZED', msg);
export const notFound = (msg: string) => new HttpError(404, 'NOT_FOUND', msg);
export const conflict = (msg: string, code = 'CONFLICT') => new HttpError(409, code, msg);
