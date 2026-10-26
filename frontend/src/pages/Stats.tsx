import { useCallback, useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, Clock, Flag, Layers, Percent, Star, Users, XCircle } from 'lucide-react';
import Panel from '../components/Panel';
import StatCard from '../components/StatCard';
import { ErrorBox, Loading } from '../components/StateMessage';
import { api, ApiError } from '../services/api';
import type { Statistics } from '../types/api';
import { formatTime } from '../utils/format';

export default function Stats() {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStats(await api.statistics());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não foi possível carregar as estatísticas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Loading text="CALCULANDO ESTATÍSTICAS..." />;
  if (error || !stats) return <ErrorBox message={error ?? 'Sem dados.'} onRetry={load} />;

  const pctDone = stats.totalGames ? (stats.completedGames / stats.totalGames) * 100 : 0;

  return (
    <section className="flex flex-col gap-6">
      <h2 className="flex items-center justify-center gap-3 font-arcade text-base glow-green sm:text-xl">
        <BarChart3 size={26} /> ESTATÍSTICAS
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total de partidas" value={stats.totalGames} icon={<Flag size={14} />} tone="cyan" />
        <StatCard label="Concluídas" value={stats.completedGames} icon={<CheckCircle2 size={14} />} tone="green" />
        <StatCard label="Incompletas" value={stats.incompleteGames} icon={<XCircle size={14} />} tone="red" />
        <StatCard label="Taxa de conclusão" value={`${stats.completionRate.toLocaleString('pt-BR')}%`} icon={<Percent size={14} />} tone="purple" />
        <StatCard label="Maior nível" value={`${stats.highestLevel} / 5`} icon={<Layers size={14} />} tone="cyan" />
        <StatCard label="Maior pontuação" value={stats.highestScore.toLocaleString('pt-BR')} icon={<Star size={14} />} tone="yellow" />
        <StatCard label="Menor tempo (concluídas)" value={stats.bestTimeMs ? formatTime(stats.bestTimeMs) : '--'} icon={<Clock size={14} />} tone="magenta" />
        <StatCard label="Apelidos distintos" value={stats.distinctNicknames} icon={<Users size={14} />} tone="green" />
      </div>

      <Panel tone="purple">
        <h3 className="mb-3 font-arcade text-[0.65rem] text-neon-purple">CONCLUÍDAS × INCOMPLETAS</h3>
        <div role="img" aria-label={`${pctDone.toFixed(0)}% concluídas`} className="flex h-6 overflow-hidden rounded bg-bg">
          <div className="bg-neon-green transition-all" style={{ width: `${pctDone}%` }} />
          <div className="bg-neon-red/70" style={{ width: `${stats.totalGames ? 100 - pctDone : 0}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted">Dados lidos do PostgreSQL pela API a cada abertura da página.</p>
      </Panel>
    </section>
  );
}
