import { useCallback, useEffect, useState } from 'react';
import { Award, ChevronLeft, ChevronRight, Medal, RefreshCw, Trophy } from 'lucide-react';
import Panel from '../components/Panel';
import { ArcadeButton } from '../components/ArcadeButton';
import { ErrorBox, Loading } from '../components/StateMessage';
import { api, ApiError } from '../services/api';
import type { RankingPage, RankingRow } from '../types/api';
import { formatDateTime, formatTime } from '../utils/format';

const PAGE_SIZE = 10;

const MEDALS: Record<number, { icon: typeof Trophy; cls: string; ring: string; label: string }> = {
  1: { icon: Trophy, cls: 'text-neon-yellow', ring: 'var(--color-neon-yellow)', label: 'Ouro' },
  2: { icon: Medal, cls: 'text-neon-cyan', ring: 'var(--color-neon-cyan)', label: 'Prata' },
  3: { icon: Award, cls: 'text-neon-magenta', ring: 'var(--color-neon-magenta)', label: 'Bronze' },
};

export default function Ranking() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<RankingPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.ranking(p, PAGE_SIZE));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não foi possível carregar o ranking.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Recarrega ao entrar na página (mostra a partida recém-finalizada) e ao trocar de página.
  useEffect(() => {
    void load(page);
  }, [page, load]);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 font-arcade text-base glow-yellow sm:text-xl">
          <Trophy size={28} /> RANKING
        </h2>
        <ArcadeButton tone="cyan" onClick={() => void load(page)} disabled={loading} icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />}>
          ATUALIZAR
        </ArcadeButton>
      </div>

      <Panel tone="yellow" className="!p-2 sm:!p-4">
        {loading && !data && <Loading text="CARREGANDO PLACAR..." />}
        {error && <ErrorBox message={error} onRetry={() => void load(page)} />}
        {!error && data && data.items.length === 0 && (
          <p className="py-10 text-center font-arcade text-xs leading-relaxed text-muted">
            NENHUM RESULTADO AINDA.<br />SEJA O PRIMEIRO NO PLACAR!
          </p>
        )}
        {!error && data && data.items.length > 0 && (
          <>
            <div role="row" className="hidden grid-cols-[3.5rem_1fr_4.5rem_6rem_7rem_7rem] gap-2 px-3 pb-2 text-[0.6rem] uppercase tracking-widest text-muted md:grid">
              <span>Pos.</span><span>Jogador</span><span>Nível</span><span>Pontos</span><span>Tempo</span><span>Situação</span>
            </div>
            <ol className={`flex flex-col gap-2 ${loading ? 'opacity-60' : ''}`}>
              {data.items.map((row) => <Row key={row.gameId} row={row} />)}
            </ol>
            <nav aria-label="Paginação" className="mt-4 flex items-center justify-between gap-2">
              <ArcadeButton tone="magenta" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)} icon={<ChevronLeft size={16} />} aria-label="Página anterior">
                ANT.
              </ArcadeButton>
              <span className="font-arcade text-[0.6rem] text-muted">PÁG. {data.page}/{data.totalPages} · {data.total} RESULTADOS</span>
              <ArcadeButton tone="magenta" disabled={page >= data.totalPages || loading} onClick={() => setPage((p) => p + 1)} aria-label="Próxima página">
                PRÓX. <ChevronRight size={16} />
              </ArcadeButton>
            </nav>
          </>
        )}
      </Panel>
    </section>
  );
}

function Row({ row }: { row: RankingRow }) {
  const medal = MEDALS[row.position];
  const Icon = medal?.icon;
  return (
    <li
      className="grid grid-cols-[3rem_1fr_auto] items-center gap-x-3 gap-y-1 rounded-md border bg-bg/60 px-3 py-3 md:grid-cols-[3.5rem_1fr_4.5rem_6rem_7rem_7rem]"
      style={{
        borderColor: medal ? medal.ring : 'var(--color-line)',
        boxShadow: medal ? `0 0 ${row.position === 1 ? 26 : 14}px color-mix(in srgb, ${medal.ring} 45%, transparent)` : undefined,
      }}
    >
      <span className={`flex items-center gap-1 font-arcade text-sm ${medal?.cls ?? 'text-muted'}`} aria-label={`Posição ${row.position}${medal ? ` — ${medal.label}` : ''}`}>
        {Icon ? <Icon size={row.position === 1 ? 26 : 22} /> : null}
        {!Icon && `#${row.position}`}
      </span>
      <span className={`truncate font-bold ${row.position === 1 ? 'text-neon-yellow' : 'text-ink'}`}>{row.nickname}</span>
      <span className="text-right font-arcade text-xs text-neon-cyan md:text-left">NV {row.highestLevel}</span>
      <span className="col-start-2 font-arcade text-xs text-neon-green md:col-start-auto">{row.score.toLocaleString('pt-BR')} pts</span>
      <span className="font-arcade text-xs tabular-nums text-ink">{formatTime(row.elapsedMs)}</span>
      <span className="col-span-3 flex flex-wrap items-center justify-between gap-2 md:col-span-1 md:block">
        <span className={`inline-block rounded px-2 py-0.5 font-arcade text-[0.55rem] ${row.isCompleted ? 'bg-neon-green/15 text-neon-green' : 'bg-neon-red/15 text-neon-red'}`}>
          {row.isCompleted ? 'CONCLUÍDA' : 'INCOMPLETA'}
        </span>
        <span className="block text-[0.65rem] text-muted md:mt-1">{formatDateTime(row.finishedAt)}</span>
      </span>
    </li>
  );
}
