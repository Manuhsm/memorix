import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleHelp, Play, Trophy } from 'lucide-react';
import Logo from '../components/Logo';
import { ArcadeLink } from '../components/ArcadeButton';
import { api } from '../services/api';
import type { Statistics } from '../types/api';
import { PADS } from '../utils/gameConfig';
import { formatTime } from '../utils/format';

export default function Home() {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .statistics()
      .then((s) => !cancelled && setStats(s))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const dash = failed ? 'offline' : '...';
  const indicators = [
    { label: 'Recorde de tempo', value: stats ? (stats.bestTimeMs ? formatTime(stats.bestTimeMs) : '--') : dash },
    { label: 'Maior pontuação', value: stats ? stats.highestScore.toLocaleString('pt-BR') : dash },
    { label: 'Partidas', value: stats ? stats.totalGames.toLocaleString('pt-BR') : dash },
  ];

  return (
    <section className="relative flex flex-col items-center gap-8 pt-4 text-center sm:gap-10 sm:pt-10">
      {/* Troféu: atalho direto para o ranking */}
      <Link
        to="/ranking"
        aria-label="Ver ranking"
        title="Ranking"
        className="absolute right-0 top-0 flex h-14 w-14 items-center justify-center rounded-full border-2 border-neon-yellow bg-panel pulse-glow sm:h-16 sm:w-16"
      >
        <Trophy size={30} className="text-neon-yellow" />
      </Link>

      <div className="flex flex-col items-center gap-4 pt-12 sm:pt-4">
        <p className="font-arcade text-[0.6rem] tracking-[0.3em] text-neon-purple">▶ INSERT COIN ◀</p>
        <Logo />
        <p className="max-w-md text-sm leading-relaxed text-muted sm:text-base">
          Memória, reflexos e desafios em <span className="text-neon-cyan">cinco níveis</span> de luz e som.
          Quanto mais longe você chega, mais alto sobe no placar.
        </p>
      </div>

      {/* Decoração: grade 2x2 com as cores do jogo */}
      <div aria-hidden className="grid grid-cols-2 gap-3 float-y">
        {PADS.map((p) => (
          <div
            key={p.id}
            className="h-14 w-14 rounded-xl border-2 sm:h-20 sm:w-20"
            style={{
              borderColor: p.color,
              background: `color-mix(in srgb, ${p.color} 22%, #05060f)`,
              boxShadow: `0 0 18px color-mix(in srgb, ${p.color} 60%, transparent)`,
            }}
          />
        ))}
      </div>

      <div className="flex w-full max-w-sm flex-col gap-4">
        <ArcadeLink to="/iniciar" size="lg" tone="green" icon={<Play size={20} />}>
          INICIAR JOGO
        </ArcadeLink>
        <div className="grid grid-cols-2 gap-3">
          <ArcadeLink to="/ranking" tone="yellow" icon={<Trophy size={16} />}>
            VER RANKING
          </ArcadeLink>
          <ArcadeLink to="/como-jogar" tone="magenta" icon={<CircleHelp size={16} />}>
            COMO JOGAR
          </ArcadeLink>
        </div>
      </div>

      <dl className="grid w-full max-w-2xl grid-cols-3 gap-2 sm:gap-4">
        {indicators.map((i) => (
          <div key={i.label} className="neon-panel !p-3">
            <dt className="text-[0.55rem] uppercase tracking-widest text-muted sm:text-xs">{i.label}</dt>
            <dd className="mt-2 break-words font-arcade text-[0.7rem] text-neon-cyan sm:text-base">{i.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
