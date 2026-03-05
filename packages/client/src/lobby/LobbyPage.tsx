import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.js';

interface GameSummary {
  key: string;
  language: string;
  players: { name: string; key: string; hasTurn: boolean }[];
  createdAt: string;
}

export const LobbyPage = ({ onSelectGame, onSelectPlayer, onViewStats }: { onSelectGame: (key: string) => void; onSelectPlayer: (gameKey: string, playerKey: string) => void; onViewStats: () => void }) => {
  const { user, logout } = useAuth();
  const [games, setGames] = useState<GameSummary[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    api.listGames().then(setGames).catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-woodgrain">
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#474633]">Scrabble</h1>
          <div className="flex items-center gap-3">
            {user && <span className="text-sm text-[#626258]">{user.name}</span>}
            <button
              onClick={onViewStats}
              className="px-4 py-2 bg-[#474633] text-white rounded text-sm hover:bg-[#626258]"
            >
              Stats
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              New Game
            </button>
            {user && (
              <button
                onClick={logout}
                className="text-sm text-[#AAA38E] hover:text-[#474633]"
              >
                Logout
              </button>
            )}
          </div>
        </div>

        {showCreate && (
          <CreateGameForm
            onCreated={(key) => {
              setShowCreate(false);
              onSelectGame(key);
            }}
            onCancel={() => setShowCreate(false)}
          />
        )}

        <div className="space-y-2">
          {games.length === 0 && (
            <div className="text-[#AAA38E] text-center py-8">No active games</div>
          )}
          {games.map((game) => (
            <div
              key={game.key}
              onClick={() => onSelectGame(game.key)}
              className="bg-[#F7F7E3] border border-[#DCDCC6] rounded-md p-3 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  {game.players.map((p, i) => (
                    <span
                      key={i}
                      onClick={(e) => { e.stopPropagation(); onSelectPlayer(game.key, p.key); }}
                      className={`text-sm cursor-pointer hover:underline ${p.hasTurn ? 'font-bold text-green-700' : 'text-[#626258]'}`}
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
                <span className="text-xs text-[#AAA38E]">{game.language}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const CreateGameForm = ({
  onCreated,
  onCancel,
}: {
  onCreated: (key: string) => void;
  onCancel: () => void;
}) => {
  const [language, setLanguage] = useState('English');
  const [players, setPlayers] = useState([
    { name: '', email: '' },
    { name: '', email: '' },
  ]);
  const [error, setError] = useState('');

  const languages = [
    'English', 'French', 'German', 'Hungarian', 'Nederlands',
    'Czech', 'Estonian', 'Portuguese', 'Slovenian',
  ];

  const addPlayer = () => {
    if (players.length < 4) setPlayers([...players, { name: '', email: '' }]);
  };

  const updatePlayer = (i: number, field: 'name' | 'email', value: string) => {
    const updated = [...players];
    updated[i] = { ...updated[i], [field]: value };
    setPlayers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const validPlayers = players.filter((p) => p.name && p.email);
    if (validPlayers.length < 2) {
      setError('At least 2 players required');
      return;
    }
    try {
      const result = await api.createGame(language, validPlayers);
      onCreated(result.key);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-[#F7F7E3] border border-[#DCDCC6] rounded-md p-4 mb-4">
      <h2 className="text-lg font-bold text-[#474633] mb-3">New Game</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm text-[#474633] mb-1">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3 py-2 border border-[#DCDCC6] rounded bg-white text-sm"
          >
            {languages.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        {players.map((p, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={p.name}
              onChange={(e) => updatePlayer(i, 'name', e.target.value)}
              placeholder={`Player ${i + 1} name`}
              className="flex-1 px-3 py-2 border border-[#DCDCC6] rounded bg-white text-sm"
            />
            <input
              type="email"
              value={p.email}
              onChange={(e) => updatePlayer(i, 'email', e.target.value)}
              placeholder="Email"
              className="flex-1 px-3 py-2 border border-[#DCDCC6] rounded bg-white text-sm"
            />
          </div>
        ))}

        {players.length < 4 && (
          <button
            type="button"
            onClick={addPlayer}
            className="text-sm text-blue-600 hover:underline"
          >
            + Add player
          </button>
        )}

        {error && <div className="text-red-600 text-xs">{error}</div>}

        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
          >
            Create Game
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-400 text-white rounded text-sm hover:bg-gray-500"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
