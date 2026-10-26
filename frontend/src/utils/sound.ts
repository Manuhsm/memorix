import { PADS } from './gameConfig';

const KEY = 'memorix:sound';
let ctx: AudioContext | null = null;
let enabled = true;

try {
  enabled = localStorage.getItem(KEY) !== 'off';
} catch {
  /* armazenamento indisponível: mantém padrão */
}

export const isSoundOn = () => enabled;

export function setSound(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* ignorar */
  }
}

function tone(freq: number, ms: number, type: OscillatorType = 'square', gain = 0.05) {
  if (!enabled) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
    osc.connect(g).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + ms / 1000);
  } catch {
    /* sem áudio: o jogo continua normalmente */
  }
}

export const playPad = (pad: number) => tone(PADS[pad]?.freq ?? 300, 220);
export const playError = () => tone(110, 380, 'sawtooth', 0.07);
export const playLevelUp = () => [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 160), i * 120));
export const playVictory = () =>
  [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 220, 'triangle'), i * 160));
