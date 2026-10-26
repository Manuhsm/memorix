import { Heart } from 'lucide-react';

export default function Hearts({ lives, max = 3 }: { lives: number; max?: number }) {
  return (
    <div role="img" aria-label={`${lives} de ${max} vidas`} className="flex gap-1.5">
      {Array.from({ length: max }, (_, i) => {
        const alive = i < lives;
        return (
          // key inclui o estado para reiniciar a animação quando a vida é perdida
          <Heart
            key={`${i}-${alive}`}
            data-lost={!alive}
            size={26}
            className={`heart ${alive ? 'text-neon-red fill-neon-red' : 'text-neon-red heart-pop'}`}
            style={alive ? { filter: 'drop-shadow(0 0 6px var(--color-neon-red))' } : undefined}
          />
        );
      })}
    </div>
  );
}
