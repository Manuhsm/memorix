import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Volume2, VolumeX } from 'lucide-react';
import Panel from '../components/Panel';
import { ArcadeButton } from '../components/ArcadeButton';
import GamePad from '../components/GamePad';
import Hearts from '../components/Hearts';
import { useStopwatch } from '../hooks/useStopwatch';
import { api, ApiError } from '../services/api';
import type { GameSession } from '../types/api';
import { initState, reducer, type MachineState } from '../utils/gameMachine';
import { GAP_MS, INTRO_DELAY_MS, LIT_MS, PADS, TOTAL_LEVELS } from '../utils/gameConfig';
import { formatTime } from '../utils/format';
import { isSoundOn, playError, playLevelUp, playPad, playVictory, setSound } from '../utils/sound';

export default function Game() {
  const navigate = useNavigate();
  const session = useLocation().state as GameSession | null;

  useEffect(() => {
    // Recarregar a página perde a sessão do jogo: volta para a identificação.
    if (!session) navigate('/iniciar', { replace: true });
  }, [session, navigate]);

  if (!session) return null;
  return <GameView session={session} />;
}

function messageFor(s: MachineState): string {
  if (s.error) return 'Falha ao enviar a jogada. Toque em TENTAR NOVAMENTE.';
  switch (s.phase) {
    case 'idle': return 'PREPARE-SE...';
    case 'playing_sequence': return 'OBSERVE A SEQUÊNCIA';
    case 'awaiting_input': return `SUA VEZ! (${s.input.length}/${s.sequence.length})`;
    case 'processing': return 'VERIFICANDO...';
    case 'wrong': return s.lives > 0 ? 'ERROU! UMA VIDA A MENOS' : 'FIM DE JOGO';
    case 'level_complete': return `NÍVEL CONCLUÍDO! +${s.lastPoints} PTS`;
    case 'finished': return s.outcome === 'victory' ? 'VITÓRIA!' : 'FIM DE JOGO';
  }
}

function GameView({ session }: { session: GameSession }) {
  const navigate = useNavigate();
  const { start, nickname, startedAtClient } = session;
  const [state, dispatch] = useReducer(reducer, start, initState);
  const [activePad, setActivePad] = useState<number | null>(null);
  const [pressedPad, setPressedPad] = useState<number | null>(null);
  const [soundOn, setSoundOn] = useState(isSoundOn());
  const [confirmExit, setConfirmExit] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [flash, setFlash] = useState<'red' | 'green' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const mounted = useRef(true);
  const inflight = useRef<string | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const elapsed = useStopwatch(startedAtClient, state.phase !== 'finished' && !leaving);
  const goResult = useCallback(() => navigate(`/resultado/${start.gameId}`, { replace: true }), [navigate, start.gameId]);

  // Avisa antes de fechar/recarregar durante a partida.
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (state.phase !== 'finished') e.preventDefault();
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [state.phase]);

  // idle -> BEGIN; wrong/level_complete -> BEGIN; finished -> resultado
  useEffect(() => {
    const delay = { idle: 1200, wrong: 1500, level_complete: 1700, finished: 1900 } as const;
    if (state.phase === 'idle' || state.phase === 'wrong' || state.phase === 'level_complete') {
      if (state.phase === 'wrong' && state.outcome === 'retry') playError();
      if (state.phase === 'level_complete') playLevelUp();
      setFlash(state.phase === 'wrong' ? 'red' : state.phase === 'level_complete' ? 'green' : null);
      const t = window.setTimeout(() => dispatch({ type: 'BEGIN' }), delay[state.phase]);
      return () => window.clearTimeout(t);
    }
    if (state.phase === 'finished') {
      if (state.outcome === 'victory') playVictory();
      else playError();
      setFlash(state.outcome === 'victory' ? 'green' : 'red');
      const t = window.setTimeout(goResult, delay.finished);
      return () => window.clearTimeout(t);
    }
    setFlash(null);
  }, [state.phase, state.outcome, goResult]);

  // Reprodução da sequência (timers sempre cancelados na limpeza)
  useEffect(() => {
    if (state.phase !== 'playing_sequence') return;
    const timers: number[] = [];
    const lit = LIT_MS[state.level - 1] ?? 450;
    const gap = GAP_MS[state.level - 1] ?? 200;
    let t = INTRO_DELAY_MS;
    for (const pad of state.sequence) {
      timers.push(window.setTimeout(() => { setActivePad(pad); playPad(pad); }, t));
      timers.push(window.setTimeout(() => setActivePad(null), t + lit));
      t += lit + gap;
    }
    timers.push(window.setTimeout(() => dispatch({ type: 'SEQUENCE_DONE' }), t));
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      setActivePad(null);
    };
  }, [state.phase, state.level, state.sequence]);

  // Envio da jogada ao servidor (uma única vez por tentativa)
  useEffect(() => {
    if (state.phase !== 'processing' || state.error) return;
    const key = `${state.attemptNumber}-${state.submitKey}`;
    if (inflight.current === key) return;
    inflight.current = key;
    api
      .attempt(start.gameId, start.token, state.input, state.attemptNumber)
      .then((result) => {
        if (mounted.current) dispatch({ type: 'RESOLVED', result });
      })
      .catch((err: unknown) => {
        if (!mounted.current) return;
        if (err instanceof ApiError && (err.code === 'GAME_FINISHED' || err.code === 'STALE_ATTEMPT')) {
          goResult(); // o servidor já registrou esta jogada/partida
          return;
        }
        dispatch({ type: 'ERROR', message: err instanceof ApiError ? err.message : 'Erro de conexão.' });
      });
  }, [state.phase, state.error, state.attemptNumber, state.submitKey, state.input, start.gameId, start.token, goResult]);

  const press = useCallback((pad: number) => {
    // O reducer ignora a ação fora de "awaiting_input"; aqui só damos o feedback.
    if (state.phase !== 'awaiting_input') return;
    playPad(pad);
    setPressedPad(pad);
    window.setTimeout(() => setPressedPad(null), 150);
    dispatch({ type: 'PRESS', pad });
  }, [state.phase]);

  // Teclado 1–4
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const pad = PADS.find((p) => p.key === e.key);
      if (pad && !e.repeat) press(pad.id);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [press]);

  async function abandon() {
    if (leaving) return;
    setLeaving(true);
    try {
      await api.abandon(start.gameId, start.token);
    } catch (err) {
      if (!(err instanceof ApiError && err.code === 'GAME_FINISHED')) {
        setLeaving(false);
        setConfirmExit(false);
        setNotice('Não foi possível abandonar agora. Tente novamente.');
        return;
      }
    }
    goResult();
  }

  const ready = state.phase === 'awaiting_input';
  const progress = ((state.level - 1) / TOTAL_LEVELS) * 100;

  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4">
      <Panel tone="cyan" className="grid grid-cols-2 gap-3 !p-3 sm:grid-cols-4">
        <Hud label="JOGADOR" value={nickname} />
        <Hud label="NÍVEL" value={`${state.level} / ${TOTAL_LEVELS}`} />
        <Hud label="PONTOS" value={state.score.toLocaleString('pt-BR')} />
        <Hud label="TEMPO" value={formatTime(elapsed)} mono />
        <div className="col-span-2 flex items-center justify-between sm:col-span-4">
          <Hearts lives={state.lives} />
          <span className="font-arcade text-[0.6rem] text-muted">
            FASE: {state.phase === 'playing_sequence' ? 'OBSERVAR' : ready ? 'REPETIR' : 'AGUARDE'}
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={TOTAL_LEVELS}
          aria-valuenow={state.level - 1}
          aria-label="Progresso geral"
          className="col-span-2 h-2 overflow-hidden rounded bg-bg sm:col-span-4"
        >
          <div className="h-full bg-gradient-to-r from-neon-purple to-neon-cyan transition-all" style={{ width: `${progress}%` }} />
        </div>
      </Panel>

      <p aria-live="polite" className={`min-h-8 text-center font-arcade text-[0.7rem] sm:text-xs ${state.phase === 'wrong' ? 'glow-red' : state.phase === 'level_complete' ? 'glow-green' : 'glow-cyan'}`}>
        {messageFor(state)}
      </p>

      {notice && (
        <p role="alert" className="text-center text-sm text-neon-red">{notice}</p>
      )}

      <div
        className={`grid grid-cols-2 gap-3 rounded-2xl p-1 sm:gap-5 ${flash === 'red' ? 'shake flash-red' : flash === 'green' ? 'flash-green' : ''}`}
      >
        {PADS.map((p) => (
          <GamePad key={p.id} pad={p} lit={activePad === p.id || pressedPad === p.id} ready={ready} onPress={press} />
        ))}
      </div>

      {state.error && state.phase === 'processing' && (
        <ArcadeButton tone="red" onClick={() => dispatch({ type: 'RETRY_SUBMIT' })}>
          TENTAR NOVAMENTE
        </ArcadeButton>
      )}

      <div className="flex justify-between gap-3">
        <ArcadeButton
          tone="yellow"
          aria-pressed={soundOn}
          icon={soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          onClick={() => {
            setSound(!soundOn);
            setSoundOn(!soundOn);
          }}
        >
          SOM {soundOn ? 'ON' : 'OFF'}
        </ArcadeButton>
        <ArcadeButton tone="red" icon={<LogOut size={16} />} disabled={state.phase === 'finished' || leaving} onClick={() => setConfirmExit(true)}>
          ABANDONAR
        </ArcadeButton>
      </div>

      {confirmExit && (
        <div role="dialog" aria-modal="true" aria-labelledby="exit-title" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
          <Panel tone="red" className="w-full max-w-sm text-center">
            <h3 id="exit-title" className="mb-3 font-arcade text-xs glow-red">ABANDONAR PARTIDA?</h3>
            <p className="mb-5 text-sm text-muted">Seu resultado parcial será registrado como INCOMPLETO no ranking.</p>
            <div className="flex flex-col gap-3">
              <ArcadeButton tone="red" onClick={abandon} disabled={leaving}>
                {leaving ? 'SAINDO...' : 'SIM, ABANDONAR'}
              </ArcadeButton>
              <ArcadeButton tone="green" onClick={() => setConfirmExit(false)} disabled={leaving}>
                CONTINUAR JOGANDO
              </ArcadeButton>
            </div>
          </Panel>
        </div>
      )}
    </section>
  );
}

function Hud({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[0.55rem] uppercase tracking-widest text-muted">{label}</div>
      <div className={`truncate font-arcade text-xs text-ink sm:text-sm ${mono ? 'tabular-nums' : ''}`}>{value}</div>
    </div>
  );
}
