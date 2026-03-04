import { useRef } from 'react';
import { useGameState } from '../hooks/useGameState.js';
import { api } from '../../api/client.js';

export function GameEndOverlay() {
  const endMessage = useGameState((s) => s.endMessage);
  const gameKey = useGameState((s) => s.gameKey);
  const playerKey = useGameState((s) => s.playerKey);
  const setError = useGameState((s) => s.setError);
  const navigatingRef = useRef(false);

  if (!endMessage) return null;

  const winner = endMessage.players.reduce(
    (best: any, p: any) => (p.score > (best?.score || 0) ? p : best),
    null,
  );

  const handleNewGame = async () => {
    if (!gameKey || navigatingRef.current) return;
    navigatingRef.current = true;
    // If another player already created the follow-on game, navigate to it
    if (endMessage.nextGameKey) {
      const url = playerKey
        ? `/game/${endMessage.nextGameKey}/${playerKey}`
        : `/game/${endMessage.nextGameKey}`;
      window.location.href = url;
      return;
    }
    try {
      const result = await api.newGame(gameKey, playerKey!);
      const url = playerKey ? `/game/${result.key}/${playerKey}` : `/game/${result.key}`;
      window.location.href = url;
    } catch (e: any) {
      navigatingRef.current = false;
      setError(e.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#F7F7E3] rounded-lg p-6 max-w-md shadow-xl text-center">
        <h2 className="text-2xl font-bold text-[#474633] mb-2">Game Over</h2>
        <p className="text-sm text-[#626258] mb-4">{endMessage.reason}</p>

        <div className="space-y-2 mb-4">
          {endMessage.players.map((p: any, i: number) => (
            <div
              key={i}
              className={`flex justify-between px-3 py-2 rounded ${
                p === winner ? 'bg-green-100 font-bold' : 'bg-white'
              }`}
            >
              <span>{p.name}</span>
              <span>
                {p.score}
                {p.tallyScore !== undefined && p.tallyScore !== 0 && (
                  <span className={p.tallyScore > 0 ? 'text-green-600' : 'text-red-600'}>
                    {' '}({p.tallyScore > 0 ? '+' : ''}{p.tallyScore})
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>

        {endMessage.players.map((p: any, i: number) => (
          <div key={i} className="text-xs text-[#AAA38E] mb-1">
            {p.name}'s tiles:{' '}
            {p.rack?.squares
              ?.filter((sq: any) => sq.tile)
              .map((sq: any) => sq.tile.letter)
              .join(', ') || 'none'}
          </div>
        ))}

        <button
          onClick={handleNewGame}
          className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
        >
          {endMessage.nextGameKey && !navigatingRef.current ? 'Join New Game' : 'New Game'}
        </button>
      </div>
    </div>
  );
}
