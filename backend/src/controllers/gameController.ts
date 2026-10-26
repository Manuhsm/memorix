import type { Request, Response } from 'express';
import type { GameService } from '../services/gameService.js';
import { attemptSchema, startSchema, tokenHeader, uuidParam } from '../validators/schemas.js';
import { unauthorized } from '../utils/httpError.js';

function readToken(req: Request): string {
  const parsed = tokenHeader.safeParse(req.header('x-game-token'));
  if (!parsed.success) throw unauthorized('Token da partida ausente.');
  return parsed.data;
}

export class GameController {
  constructor(private service: GameService) {}

  start = async (req: Request, res: Response) => {
    const { nickname } = startSchema.parse(req.body);
    res.status(201).json(await this.service.start(nickname));
  };

  attempt = async (req: Request, res: Response) => {
    const { id } = uuidParam.parse(req.params);
    // Só `input` e `attemptNumber` são lidos. Qualquer campo extra (score, level, lives...) é ignorado.
    const body = attemptSchema.parse(req.body);
    res.json(await this.service.attempt(id, readToken(req), body.input, body.attemptNumber));
  };

  abandon = async (req: Request, res: Response) => {
    const { id } = uuidParam.parse(req.params);
    res.json({ game: await this.service.abandon(id, readToken(req)) });
  };

  get = async (req: Request, res: Response) => {
    const { id } = uuidParam.parse(req.params);
    res.json({ game: await this.service.get(id) });
  };
}
