import { useEffect, useState } from 'react';

/**
 * Cronômetro baseado em TIMESTAMPS (Date.now), não em incrementos.
 * Se a renderização atrasar, o valor exibido continua correto no próximo quadro.
 * Ao parar (running=false) o último valor calculado é congelado.
 * O tempo OFICIAL é sempre o medido pelo servidor.
 */
export function useStopwatch(startedAt: number, running: boolean): number {
  const [elapsed, setElapsed] = useState(() => Date.now() - startedAt);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const tick = () => {
      setElapsed(Date.now() - startedAt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, startedAt]);

  return elapsed;
}
