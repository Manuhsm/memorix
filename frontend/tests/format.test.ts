import { describe, it, expect } from 'vitest';
import { formatTime, validateNickname } from '../src/utils/format';

describe('formatTime', () => {
  it('formata mm:ss.cc', () => {
    expect(formatTime(0)).toBe('00:00.00');
    expect(formatTime(65_430)).toBe('01:05.43');
    expect(formatTime(-5)).toBe('00:00.00');
  });
});

describe('validateNickname', () => {
  it('valida regras do apelido', () => {
    expect(validateNickname('')).toMatch(/Informe/);
    expect(validateNickname('    ')).toMatch(/Informe/);
    expect(validateNickname(' ab ')).toMatch(/mínimo/);
    expect(validateNickname('a'.repeat(17))).toMatch(/máximo/);
    expect(validateNickname('<b>')).toMatch(/apenas/);
    expect(validateNickname('  Ana  ')).toBeNull();
  });
});
