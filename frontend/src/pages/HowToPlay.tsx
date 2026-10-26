import { Brain, Eye, Heart, Play, RotateCcw, Timer, Trophy, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import Panel, { type Tone } from '../components/Panel';
import { ArcadeLink } from '../components/ArcadeButton';
import { PADS } from '../utils/gameConfig';

const steps: { icon: ReactNode; title: string; text: string; tone: Tone }[] = [
  { icon: <Eye size={24} />, title: '1. OBSERVE', text: 'Os botões piscam em uma sequência. Durante a animação, os toques ficam bloqueados.', tone: 'cyan' },
  { icon: <Brain size={24} />, title: '2. MEMORIZE', text: 'Guarde a ordem das cores. Cada nível aumenta a dificuldade: de 4 até 8 cores.', tone: 'purple' },
  { icon: <Zap size={24} />, title: '3. REPITA', text: 'Toque nos botões (ou teclas 1 a 4) na mesma ordem, sem errar.', tone: 'green' },
  { icon: <Heart size={24} />, title: '4. VIDAS', text: 'Cada nível dá 3 vidas. Um erro consome uma vida e a sequência é mostrada de novo. Ao avançar, as vidas voltam a 3 (não acumulam).', tone: 'red' },
  { icon: <Timer size={24} />, title: '5. TEMPO', text: 'O cronômetro marca o tempo total da partida e não reinicia entre os níveis.', tone: 'yellow' },
  { icon: <Trophy size={24} />, title: '6. RANKING', text: 'Contam o nível alcançado, a pontuação e, no empate, o menor tempo. Até partidas incompletas aparecem no ranking!', tone: 'magenta' },
];

export default function HowToPlay() {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-center font-arcade text-base glow-magenta sm:text-xl">COMO JOGAR</h2>

      <div aria-hidden className="mx-auto grid grid-cols-4 gap-3">
        {PADS.map((p) => (
          <div key={p.id} className="flex h-14 w-14 items-center justify-center rounded-xl border-2 font-arcade text-xs sm:h-16 sm:w-16"
            style={{ borderColor: p.color, color: p.color, background: `color-mix(in srgb, ${p.color} 18%, #05060f)`, boxShadow: `0 0 16px color-mix(in srgb, ${p.color} 55%, transparent)` }}>
            {p.key}
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {steps.map((s) => (
          <Panel key={s.title} tone={s.tone}>
            <h3 className="mb-2 flex items-center gap-3 font-arcade text-[0.7rem]">{s.icon}{s.title}</h3>
            <p className="text-sm leading-relaxed text-muted">{s.text}</p>
          </Panel>
        ))}
      </div>

      <Panel tone="cyan" className="text-sm leading-relaxed">
        <h3 className="mb-2 flex items-center gap-2 font-arcade text-[0.7rem] text-neon-cyan"><RotateCcw size={18} /> PONTUAÇÃO</h3>
        <p className="text-muted">
          Cada nível concluído vale <b className="text-ink">100 × número do nível</b> + <b className="text-ink">50 por vida restante</b>.
          Completar os 5 níveis dá <b className="text-ink">+500</b>. Nível não concluído não pontua.
        </p>
      </Panel>

      <div className="mx-auto w-full max-w-sm">
        <ArcadeLink to="/iniciar" tone="green" size="lg" icon={<Play size={18} />}>INICIAR JOGO</ArcadeLink>
      </div>
    </section>
  );
}
