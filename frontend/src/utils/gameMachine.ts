import type { AttemptResult, Outcome, StartPayload } from '../types/api';

/**
 * Máquina de estados explícita do jogo (lado cliente).
 *
 *  idle ──BEGIN──▶ playing_sequence ──SEQUENCE_DONE──▶ awaiting_input
 *  awaiting_input ──PRESS (erro ou sequência completa)──▶ processing
 *  processing ──RESOLVED──▶ wrong (retry) | level_complete (level_up) | finished (victory/game_over)
 *  wrong | level_complete ──BEGIN──▶ playing_sequence
 *
 * Qualquer ação fora dessas transições é ignorada (retorna o MESMO estado).
 * A autoridade final é o servidor; esta máquina só impede entradas inválidas na interface.
 */
export type Phase =
  | 'idle'
  | 'playing_sequence'
  | 'awaiting_input'
  | 'processing'
  | 'wrong'
  | 'level_complete'
  | 'finished';

export interface MachineState {
  phase: Phase;
  level: number;
  lives: number;
  score: number;
  sequence: number[];
  input: number[];
  attemptNumber: number;
  submitKey: number;
  outcome: Outcome | null;
  lastPoints: number;
  error: string | null;
}

export type Action =
  | { type: 'BEGIN' }
  | { type: 'SEQUENCE_DONE' }
  | { type: 'PRESS'; pad: number }
  | { type: 'RESOLVED'; result: AttemptResult }
  | { type: 'ERROR'; message: string }
  | { type: 'RETRY_SUBMIT' };

export function initState(start: StartPayload): MachineState {
  return {
    phase: 'idle',
    level: start.level,
    lives: start.livesRemaining,
    score: 0,
    sequence: start.sequence,
    input: [],
    attemptNumber: start.attemptNumber,
    submitKey: 0,
    outcome: null,
    lastPoints: 0,
    error: null,
  };
}

export function reducer(state: MachineState, action: Action): MachineState {
  switch (action.type) {
    case 'BEGIN':
      if (state.phase !== 'idle' && state.phase !== 'wrong' && state.phase !== 'level_complete') {
        return state;
      }
      return { ...state, phase: 'playing_sequence', input: [], outcome: null, error: null };

    case 'SEQUENCE_DONE':
      if (state.phase !== 'playing_sequence') return state;
      return { ...state, phase: 'awaiting_input', input: [] };

    case 'PRESS': {
      if (state.phase !== 'awaiting_input') return state; // bloqueia cliques fora da hora
      const input = [...state.input, action.pad];
      const idx = input.length - 1;
      const mistake = input[idx] !== state.sequence[idx];
      const complete = input.length === state.sequence.length;
      return { ...state, input, phase: mistake || complete ? 'processing' : 'awaiting_input' };
    }

    case 'RESOLVED': {
      if (state.phase !== 'processing') return state;
      const r = action.result;
      const base = {
        ...state,
        outcome: r.outcome,
        lastPoints: r.pointsEarned,
        score: r.game.score,
        attemptNumber: r.attemptNumber,
        error: null,
        input: [],
      };
      if (r.outcome === 'retry') {
        return { ...base, phase: 'wrong', lives: r.livesRemaining, sequence: r.sequence ?? state.sequence };
      }
      if (r.outcome === 'level_up') {
        return {
          ...base,
          phase: 'level_complete',
          level: r.level,
          lives: r.livesRemaining,
          sequence: r.sequence ?? state.sequence,
        };
      }
      return { ...base, phase: 'finished', lives: r.outcome === 'game_over' ? 0 : state.lives };
    }

    case 'ERROR':
      if (state.phase !== 'processing') return state;
      return { ...state, error: action.message };

    case 'RETRY_SUBMIT':
      if (state.phase !== 'processing' || !state.error) return state;
      return { ...state, error: null, submitKey: state.submitKey + 1 };

    default:
      return state;
  }
}
