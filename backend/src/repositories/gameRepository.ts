import type { GameRecord, RankingRow, Statistics } from '../types/index.js';

export interface GameRepository {
  create(game: GameRecord): Promise<void>;
  findById(id: string): Promise<GameRecord | null>;
  /**
   * Atualização atômica: bloqueia a linha, aplica `mutator` e grava.
   * Se o mutator lançar erro, nada é gravado (rollback). Retorna null se a partida não existir.
   */
  update(id: string, mutator: (game: GameRecord) => GameRecord): Promise<GameRecord | null>;
  ranking(page: number, pageSize: number): Promise<{ items: RankingRow[]; total: number }>;
  position(id: string): Promise<number | null>;
  statistics(): Promise<Statistics>;
  ping(): Promise<void>;
}
