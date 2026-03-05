import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router';
import { AuthProvider } from './auth/AuthContext.js';
import { LobbyPage } from './lobby/LobbyPage.js';
import { GamePage } from './game/GamePage.js';
import { StatsPage } from './stats/StatsPage.js';

const GameRoute = () => {
  const { gameKey, playerKey } = useParams<{ gameKey: string; playerKey?: string }>();
  if (!gameKey) return <div>Game not found</div>;
  return <GamePage gameKey={gameKey} playerKey={playerKey} />;
};

const LobbyRoute = () => {
  const navigate = useNavigate();
  return <LobbyPage onSelectGame={(key) => navigate(`/game/${key}`)} onSelectPlayer={(gameKey, playerKey) => navigate(`/game/${gameKey}/${playerKey}`)} onViewStats={() => navigate('/stats')} />;
};

const StatsRoute = () => {
  const navigate = useNavigate();
  return <StatsPage onBack={() => navigate('/')} />;
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LobbyRoute />} />
          <Route path="/stats" element={<StatsRoute />} />
          <Route path="/game/:gameKey" element={<GameRoute />} />
          <Route path="/game/:gameKey/:playerKey" element={<GameRoute />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
export default App;
