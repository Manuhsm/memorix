export const TOTAL_LEVELS = 5;

/** Tempo aceso / intervalo (ms) por nível. Acelera aos poucos, sem prejudicar a leitura. */
export const LIT_MS = [650, 590, 530, 480, 430] as const;
export const GAP_MS = [280, 250, 225, 200, 180] as const;
export const INTRO_DELAY_MS = 700;

export interface PadDef {
  id: number;
  name: string;
  key: string;
  color: string; // variável CSS do token
  freq: number;
}

export const PADS: PadDef[] = [
  { id: 0, name: 'Verde', key: '1', color: 'var(--color-neon-green)', freq: 392 },
  { id: 1, name: 'Magenta', key: '2', color: 'var(--color-neon-magenta)', freq: 262 },
  { id: 2, name: 'Ciano', key: '3', color: 'var(--color-neon-cyan)', freq: 330 },
  { id: 3, name: 'Amarelo', key: '4', color: 'var(--color-neon-yellow)', freq: 523 },
];
