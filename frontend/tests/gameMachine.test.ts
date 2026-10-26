import { describe, it, expect } from 'vitest';
import { initState, reducer, type MachineState } from '../src/utils/gameMachine';
import type { AttemptResult, StartPayload } from '../src/types/api';

const start: StartPayload = {
  gameId: 'g',
  token: 't',
  level: 1,
  livesRemaining: 3,
  sequence: [0, 1, 2, 3],
  attemptNumber: 0,
  totalLevels: 5,
};

const game = {
  id: 'g', nickname: 'Ana', status: 'in_progress' as const, currentLevel: 1, highestLevel: 1,
  livesRemaining: 3, livesLost: 0, score: 0, isCompleted: false, startedAt: '', finishedAt: null,
  elapsedMs: null, position: null,
};

const result = (p: Partial<AttemptResult>): AttemptResult => ({
  outcome: 'retry', pointsEarned: 0, game, level: 1, livesRemaining: 2, attemptNumber: 1, ...p,
});

const awaiting = (): MachineState =>
  reducer(reducer(initState(start), { type: 'BEGIN' }), { type: 'SEQUENCE_DONE' });

describe('máquina de estados do jogo', () => {
  it('começa aguardando e só aceita BEGIN', () => {
    const s = initState(start);
    expect(s.phase).toBe('idle');
    expect(reducer(s, { type: 'PRESS', pad: 0 })).toBe(s);
    expect(reducer(s, { type: 'SEQUENCE_DONE' })).toBe(s);
    expect(reducer(s, { type: 'BEGIN' }).phase).toBe('playing_sequence');
  });

  it('bloqueia cliques durante a reprodução da sequência', () => {
    const s = reducer(initState(start), { type: 'BEGIN' });
    expect(reducer(s, { type: 'PRESS', pad: 0 })).toBe(s);
  });

  it('acumula acertos e envia ao completar a sequência', () => {
    let s = awaiting();
    for (const pad of [0, 1, 2]) {
      s = reducer(s, { type: 'PRESS', pad });
      expect(s.phase).toBe('awaiting_input');
    }
    s = reducer(s, { type: 'PRESS', pad: 3 });
    expect(s.phase).toBe('processing');
    expect(s.input).toEqual([0, 1, 2, 3]);
  });

  it('erro vai para processing imediatamente e ignora cliques seguintes', () => {
    let s = reducer(awaiting(), { type: 'PRESS', pad: 3 });
    expect(s.phase).toBe('processing');
    const same = reducer(s, { type: 'PRESS', pad: 0 });
    expect(same).toBe(s);
    s = reducer(s, { type: 'RESOLVED', result: result({}) });
    expect(s.phase).toBe('wrong');
    expect(s.lives).toBe(2);
    expect(s.sequence).toEqual([0, 1, 2, 3]);
  });

  it('level_up restaura vidas e troca a sequência', () => {
    let s = awaiting();
    [0, 1, 2, 3].forEach((pad) => (s = reducer(s, { type: 'PRESS', pad })));
    s = reducer(s, {
      type: 'RESOLVED',
      result: result({ outcome: 'level_up', level: 2, livesRemaining: 3, sequence: [1, 1, 1, 1, 1], pointsEarned: 250, game: { ...game, score: 250 } }),
    });
    expect(s.phase).toBe('level_complete');
    expect(s.level).toBe(2);
    expect(s.lives).toBe(3);
    expect(s.score).toBe(250);
    expect(reducer(s, { type: 'BEGIN' }).phase).toBe('playing_sequence');
  });

  it('game_over e victory finalizam e não aceitam mais nada', () => {
    const lose = reducer(reducer(awaiting(), { type: 'PRESS', pad: 3 }), {
      type: 'RESOLVED',
      result: result({ outcome: 'game_over', livesRemaining: 0 }),
    });
    expect(lose.phase).toBe('finished');
    expect(lose.lives).toBe(0);
    expect(reducer(lose, { type: 'BEGIN' })).toBe(lose);
    expect(reducer(lose, { type: 'PRESS', pad: 0 })).toBe(lose);
  });

  it('RESOLVED fora de processing é ignorado (resposta duplicada)', () => {
    const s = awaiting();
    expect(reducer(s, { type: 'RESOLVED', result: result({}) })).toBe(s);
  });

  it('erro de rede mantém processing e permite reenvio', () => {
    let s = reducer(awaiting(), { type: 'PRESS', pad: 3 });
    s = reducer(s, { type: 'ERROR', message: 'rede' });
    expect(s.error).toBe('rede');
    const keyBefore = s.submitKey;
    s = reducer(s, { type: 'RETRY_SUBMIT' });
    expect(s.error).toBeNull();
    expect(s.submitKey).toBe(keyBefore + 1);
    expect(s.phase).toBe('processing');
  });
});
