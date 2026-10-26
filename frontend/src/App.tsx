import { Route, Routes } from 'react-router-dom';
import Layout from './layouts/Layout';
import Home from './pages/Home';
import Identify from './pages/Identify';
import Game from './pages/Game';
import Result from './pages/Result';
import Ranking from './pages/Ranking';
import HowToPlay from './pages/HowToPlay';
import Stats from './pages/Stats';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="iniciar" element={<Identify />} />
        <Route path="jogo" element={<Game />} />
        <Route path="resultado/:id" element={<Result />} />
        <Route path="ranking" element={<Ranking />} />
        <Route path="como-jogar" element={<HowToPlay />} />
        <Route path="estatisticas" element={<Stats />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
