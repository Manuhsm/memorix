import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, CircleHelp, Gamepad2, Trophy } from 'lucide-react';
import Logo from '../components/Logo';

const links = [
  { to: '/', label: 'Início', icon: Gamepad2, end: true },
  { to: '/ranking', label: 'Ranking', icon: Trophy },
  { to: '/como-jogar', label: 'Como jogar', icon: CircleHelp },
  { to: '/estatisticas', label: 'Estatísticas', icon: BarChart3 },
];

export default function Layout() {
  return (
    <div className="min-h-dvh flex flex-col">
      <div className="crt-grid" aria-hidden />
      <div className="scanlines" aria-hidden />

      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
        <nav aria-label="Principal" className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-2">
          <NavLink to="/" aria-label="Memorix, página inicial">
            <Logo size="md" />
          </NavLink>
          <ul className="flex items-center gap-1 sm:gap-2">
            {links.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  aria-label={label}
                  className={({ isActive }) =>
                    `flex min-h-11 items-center gap-2 rounded-md px-2.5 text-[0.65rem] uppercase tracking-wider transition-colors sm:px-3 ${
                      isActive ? 'text-neon-cyan bg-panel' : 'text-muted hover:text-ink'
                    }`
                  }
                >
                  <Icon size={20} className={to === '/ranking' ? 'text-neon-yellow' : ''} />
                  <span className="hidden md:inline">{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-6 sm:py-10">
        <Outlet />
      </main>

      <footer className="px-3 pb-6 text-center text-[0.6rem] uppercase tracking-widest text-muted">
        MEMORIX · projeto de feira de ciências · Técnico em Desenvolvimento de Sistemas
      </footer>
    </div>
  );
}
