import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Crown, Home, RotateCcw, Skull, Trophy } from 'lucide-react';
import Panel from '../components/Panel';
import { ArcadeLink } from '../components/ArcadeButton';
import StatCard from '../components/StatCard';
import { ErrorBox, Loading } from '../components/StateMessage';
import { api, ApiError } from '../services/api';
import type { PublicGame } from '../types/api';
import { formatTime } from '../utils/format';

const STATUS_TEXT: Record<PublicGame['status'], string> = {
  completed: 'CONCLUÍDA',
  failed: 'INCOMPLETA — SEM VIDAS',
  abandoned: 'INCOMPLETA — ABANDONADA',
  in_progress: 'EM ANDAMENTO',
};

export default function Result() {
  const { id } = useParams();
  const [game, setGame] = useState<PublicGame | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Somente CONSULTA o resultado: atualizar a página nunca cria outra partida.
  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setGame((await api.getGame(id)).game);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não foi possível carregar o resultado.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Loading text="CARREGANDO RESULTADO..." />;
  if (error || !game) return <ErrorBox message={error ?? 'Resultado indisponível.'} onRetry={load} />;

  const won = game.status === 'completed';
  return (
    <section className="relative mx-auto flex max-w-xl flex-col gap-6 text-center">
      {won && <Confetti />}
      <div className="flex flex-col items-center gap-3">
        {won ? <Crown size={56} className="text-neon-yellow float-y" /> : <Skull size={56} className="text-neon-magenta" />}
        <h2 className={`font-arcade text-lg leading-relaxed sm:text-2xl ${won ? 'glow-yellow' : 'glow-magenta'}`}>
          {won ? 'VITÓRIA ARCADE!' : game.status === 'abandoned' ? 'PARTIDA ENCERRADA' : 'GAME OVER'}
        </h2>
        <p className="text-sm text-muted">
          {won
            ? 'Você dominou os cinco níveis. Lenda do Memorix!'
            : 'Cada derrota treina a memória. Seu resultado parcial já está no ranking — tente superar!'}
        </p>
      </div>

      <Panel tone={won ? 'yellow' : 'magenta'}>
        <p className="font-arcade text-sm">{game.nickname}</p>
        <p className="mt-2 text-xs uppercase tracking-widest text-muted">Situação: {STATUS_TEXT[game.status]}</p>
      </Panel>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Nível máximo" value={`${game.highestLevel} / 5`} tone="cyan" />
        <StatCard label="Pontuação" value={game.score.toLocaleString('pt-BR')} tone="green" />
        <StatCard label="Tempo" value={game.elapsedMs ? formatTime(game.elapsedMs) : '--'} tone="yellow" />
        <StatCard label="Vidas perdidas" value={game.livesLost} tone="red" />
      </div>

      <Panel tone="purple" className="font-arcade text-xs leading-relaxed">
        {game.position ? <>POSIÇÃO NO RANKING: <span className="glow-cyan">#{game.position}</span></> : 'POSIÇÃO INDISPONÍVEL'}
      </Panel>

      <div className="flex flex-col gap-3">
        <ArcadeLink to="/iniciar" tone="green" size="lg" icon={<RotateCcw size={18} />}>
          JOGAR NOVAMENTE
        </ArcadeLink>
        <div className="grid grid-cols-2 gap-3">
          <ArcadeLink to="/ranking" tone="yellow" icon={<Trophy size={16} />}>VER RANKING</ArcadeLink>
          <ArcadeLink to="/" tone="magenta" icon={<Home size={16} />}>VOLTAR AO INÍCIO</ArcadeLink>
        </div>
      </div>
    </section>
  );
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: (i * 97) % 100,
        delay: ((i * 37) % 30) / 10,
        dur: 3 + ((i * 13) % 30) / 10,
        color: ['var(--color-neon-green)', 'var(--color-neon-cyan)', 'var(--color-neon-magenta)', 'var(--color-neon-yellow)'][i % 4],
      })),
    [],
  );
  return (
    <div aria-hidden className="confetti pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {pieces.map((p, i) => (
        <i key={i} style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }} />
      ))}
    </div>
  );
}
