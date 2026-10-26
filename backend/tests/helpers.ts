import { MemoryGameRepository } from '../src/repositories/memoryGameRepository.js';
import { GameService } from '../src/services/gameService.js';

/** Relógio controlável: cada chamada de `tick` avança o tempo. */
export function fakeClock(startMs = Date.parse('2026-01-01T12:00:00Z')) {
  let t = startMs;
  return {
    now: () => new Date(t),
    tick: (ms: number) => {
      t += ms;
    },
  };
}

/** RNG determinístico para os testes. */
export function seededRng(seed = 7) {
  let s = seed;
  return (n: number) => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s % n;
  };
}

export const wrongInputFor = (seq: number[]) => [(seq[0]! + 1) % 4];

export function makeService() {
  const repo = new MemoryGameRepository();
  const clock = fakeClock();
  const service = new GameService({ repo, now: clock.now, rng: seededRng() });
  return { repo, clock, service };
}

/** Joga uma partida de ponta a ponta com um "jogador" que acerta tudo. */
export async function playPerfectGame(
  service: GameService,
  clock: ReturnType<typeof fakeClock>,
  nickname: string,
  msPerLevel = 20_000,
) {
  const start = await service.start(nickname);
  let seq = start.sequence;
  let attemptNumber = start.attemptNumber;
  let last;
  for (let i = 0; i < 5; i++) {
    clock.tick(msPerLevel);
    last = await service.attempt(start.gameId, start.token, seq, attemptNumber);
    attemptNumber = last.attemptNumber;
    if (last.sequence) seq = last.sequence;
  }
  return { start, last: last! };
}

/** Joga errando 3 vezes seguidas no nível indicado (partida incompleta). */
export async function playAndLose(
  service: GameService,
  clock: ReturnType<typeof fakeClock>,
  nickname: string,
  levelsToWin = 0,
  msPerStep = 10_000,
) {
  const start = await service.start(nickname);
  let seq = start.sequence;
  let attemptNumber = start.attemptNumber;
  for (let i = 0; i < levelsToWin; i++) {
    clock.tick(msPerStep);
    const r = await service.attempt(start.gameId, start.token, seq, attemptNumber);
    attemptNumber = r.attemptNumber;
    seq = r.sequence!;
  }
  let last;
  for (let i = 0; i < 3; i++) {
    clock.tick(msPerStep);
    last = await service.attempt(start.gameId, start.token, wrongInputFor(seq), attemptNumber);
    attemptNumber = last.attemptNumber;
  }
  return { start, last: last! };
}
