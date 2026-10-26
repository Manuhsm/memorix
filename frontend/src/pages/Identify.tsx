import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Heart, Layers, Play } from 'lucide-react';
import Panel from '../components/Panel';
import { ArcadeButton, ArcadeLink } from '../components/ArcadeButton';
import { api, ApiError } from '../services/api';
import { validateNickname } from '../utils/format';
import type { GameSession } from '../types/api';

export default function Identify() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (loading) return; // impede envio duplicado
    const problem = validateNickname(nickname);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const start = await api.startGame(nickname.trim());
      const session: GameSession = { start, nickname: nickname.trim(), startedAtClient: Date.now() };
      navigate('/jogo', { state: session, replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro inesperado. Tente novamente.');
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto flex max-w-xl flex-col gap-6">
      <h2 className="text-center font-arcade text-base leading-relaxed glow-cyan sm:text-xl">
        IDENTIFIQUE-SE, JOGADOR
      </h2>

      <Panel tone="cyan">
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <label htmlFor="nickname" className="text-xs uppercase tracking-widest text-muted">
            Seu apelido (3 a 16 caracteres)
          </label>
          <input
            id="nickname"
            className="field"
            value={nickname}
            maxLength={40}
            autoComplete="off"
            autoFocus
            placeholder="EX: NEO_42"
            aria-invalid={!!error}
            aria-describedby="nick-error"
            onChange={(e) => {
              setNickname(e.target.value);
              if (error) setError(null);
            }}
          />
          <p id="nick-error" role="alert" className="min-h-5 text-sm text-neon-red">
            {error}
          </p>
          <ArcadeButton type="submit" tone="green" size="lg" disabled={loading} icon={<Play size={18} />}>
            {loading ? 'CONECTANDO...' : 'COMEÇAR PARTIDA'}
          </ArcadeButton>
          <ArcadeLink to="/" tone="magenta" icon={<ArrowLeft size={16} />}>
            VOLTAR
          </ArcadeLink>
        </form>
      </Panel>

      <Panel tone="purple" className="text-sm">
        <h3 className="mb-3 font-arcade text-[0.65rem] text-neon-purple">REGRAS RÁPIDAS</h3>
        <ul className="grid gap-3 sm:grid-cols-3">
          <li className="flex items-center gap-2"><Layers size={18} className="text-neon-cyan" /> 5 níveis</li>
          <li className="flex items-center gap-2"><Heart size={18} className="text-neon-red" /> 3 vidas por nível</li>
          <li className="flex items-center gap-2"><Clock size={18} className="text-neon-yellow" /> Cronômetro rodando</li>
        </ul>
      </Panel>
    </section>
  );
}
