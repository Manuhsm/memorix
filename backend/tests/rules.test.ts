import { describe, it, expect } from 'vitest';
import {
  BASE_POINTS_PER_LEVEL,
  COMPLETION_BONUS,
  LEVEL_LENGTHS,
  applyAttempt,
  assertPlausibleInput,
  compareRanking,
  createGameRecord,
  generateSequence,
  levelScore,
} from '../src/services/gameRules.js';
import { seededRng, wrongInputFor } from './helpers.js';

const t0 = new Date('2026-01-01T12:00:00Z');
const later = (ms: number) => new Date(t0.getTime() + ms);
const fresh = () => createGameRecord('g1', 'Ana', 'hash', t0, seededRng(1));

describe('geração de sequência', () => {
  it('gera o tamanho pedido com cores entre 0 e 3', () => {
    const seq = generateSequence(8);
    expect(seq).toHaveLength(8);
    expect(seq.every((v) => v >= 0 && v <= 3)).toBe(true);
  });

  it('não é sempre a mesma sequência entre partidas (RNG seguro)', () => {
    const set = new Set(Array.from({ length: 30 }, () => generateSequence(8).join('')));
    expect(set.size).toBeGreaterThan(20);
  });

  it('níveis têm sequências 4,5,6,7,8', () => {
    expect([...LEVEL_LENGTHS]).toEqual([4, 5, 6, 7, 8]);
    expect(fresh().sequence).toHaveLength(4);
  });
});

describe('pontuação', () => {
  it('nível sem erros: base + 3 vidas × 50', () => {
    expect(levelScore(1, 3)).toBe(BASE_POINTS_PER_LEVEL * 1 + 150);
    expect(levelScore(5, 3)).toBe(650);
  });
  it('menos vidas, menos bônus', () => {
    expect(levelScore(2, 1)).toBe(250);
  });
});

describe('regras de jogo', () => {
  it('acerto avança o nível, restaura 3 vidas e dá nova sequência maior', () => {
    const g = fresh();
    const r = applyAttempt(g, g.sequence, later(5000), seededRng(2));
    expect(r.outcome).toBe('level_up');
    expect(r.game.currentLevel).toBe(2);
    expect(r.game.livesRemaining).toBe(3);
    expect(r.game.sequence).toHaveLength(5);
    expect(r.game.score).toBe(250);
  });

  it('erro consome uma vida e repete a MESMA sequência, sem pontos', () => {
    const g = fresh();
    const r = applyAttempt(g, wrongInputFor(g.sequence), later(5000));
    expect(r.outcome).toBe('retry');
    expect(r.game.livesRemaining).toBe(2);
    expect(r.game.livesLost).toBe(1);
    expect(r.game.sequence).toEqual(g.sequence);
    expect(r.game.score).toBe(0);
  });

  it('vidas não acumulam: errar no nível 1 e acertar dá 2 vidas no bônus, mas nível 2 começa com 3', () => {
    let g = fresh();
    g = applyAttempt(g, wrongInputFor(g.sequence), later(5000)).game;
    const r = applyAttempt(g, g.sequence, later(10000), seededRng(3));
    expect(r.pointsEarned).toBe(levelScore(1, 2));
    expect(r.game.livesRemaining).toBe(3);
  });

  it('perder as 3 vidas encerra a partida como failed, preservando pontos anteriores', () => {
    let g = fresh();
    g = applyAttempt(g, g.sequence, later(5000), seededRng(2)).game; // nível 1 ok
    for (let i = 0; i < 2; i++) g = applyAttempt(g, wrongInputFor(g.sequence), later(9000 + i)).game;
    const r = applyAttempt(g, wrongInputFor(g.sequence), later(20000));
    expect(r.outcome).toBe('game_over');
    expect(r.game.status).toBe('failed');
    expect(r.game.isCompleted).toBe(false);
    expect(r.game.score).toBe(250);
    expect(r.game.highestLevel).toBe(2);
    expect(r.game.elapsedMs).toBe(20000);
  });

  it('concluir os cinco níveis é vitória com bônus final', () => {
    let g = fresh();
    let total = 0;
    let last;
    for (let i = 0; i < 5; i++) {
      last = applyAttempt(g, g.sequence, later(10000 * (i + 1)), seededRng(i + 10));
      g = last.game;
      total += last.pointsEarned;
    }
    expect(last!.outcome).toBe('victory');
    expect(g.status).toBe('completed');
    expect(g.isCompleted).toBe(true);
    expect(g.score).toBe(1500 + 5 * 150 + COMPLETION_BONUS);
    expect(total).toBe(g.score);
    expect(g.elapsedMs).toBe(50000);
  });

  it('função é pura: não altera a partida original', () => {
    const g = fresh();
    const snapshot = JSON.stringify(g);
    applyAttempt(g, g.sequence, later(5000));
    expect(JSON.stringify(g)).toBe(snapshot);
  });
});

describe('validação da jogada', () => {
  it('rejeita jogada incompleta, cor inválida e jogada rápida demais', () => {
    const g = fresh();
    expect(() => assertPlausibleInput(g, g.sequence.slice(0, 2), later(9000))).toThrow(/incompleta/i);
    expect(() => assertPlausibleInput(g, [9], later(9000))).toThrow(/inválida/i);
    expect(() => assertPlausibleInput(g, g.sequence, later(100))).toThrow(/rápida/i);
    expect(() => assertPlausibleInput(g, g.sequence, later(9000))).not.toThrow();
  });
});

describe('comparador do ranking', () => {
  const base = { id: 'a', finishedAt: t0 };
  it('nível > pontuação > menor tempo > mais antigo', () => {
    const a = { ...base, highestLevel: 5, score: 100, elapsedMs: 9 };
    const b = { ...base, highestLevel: 4, score: 999, elapsedMs: 1 };
    expect(compareRanking(a, b)).toBeLessThan(0);
    const c = { ...base, highestLevel: 5, score: 200, elapsedMs: 99 };
    expect(compareRanking(c, a)).toBeLessThan(0);
    const d = { ...base, highestLevel: 5, score: 200, elapsedMs: 50 };
    expect(compareRanking(d, c)).toBeLessThan(0);
    const e = { ...d, id: 'b', finishedAt: new Date(t0.getTime() + 1) };
    expect(compareRanking(d, e)).toBeLessThan(0);
  });
});
