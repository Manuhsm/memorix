import { ArcadeLink } from '../components/ArcadeButton';

export default function NotFound() {
  return (
    <section className="flex flex-col items-center gap-6 py-16 text-center">
      <h2 className="font-arcade text-3xl glow-red">404</h2>
      <p className="text-muted">Fase não encontrada.</p>
      <ArcadeLink to="/" tone="cyan">VOLTAR AO INÍCIO</ArcadeLink>
    </section>
  );
}
