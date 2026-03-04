import { useEffect, useRef } from 'react';
import { useGameState } from './useGameState.js';

const yourTurnAudio = new Audio('/audio/yourturn.wav');
const applauseAudio = new Audio('/audio/applause.wav');

export function useNotifications() {
  const gameKey = useGameState((s) => s.gameKey);
  const whosTurn = useGameState((s) => s.whosTurn);
  const playerIndex = useGameState((s) => s.playerIndex);
  const players = useGameState((s) => s.players);
  const turns = useGameState((s) => s.turns);
  const prevTurnCount = useRef(0);
  const ready = useRef(false);

  // Mark ready once game data is loaded (works even for games with 0 turns)
  useEffect(() => {
    if (gameKey && !ready.current) {
      ready.current = true;
      prevTurnCount.current = turns.length;
    }
  }, [gameKey, turns.length]);

  // Notify on new turns received via websocket (not on initial load)
  useEffect(() => {
    if (!ready.current) return;
    if (turns.length > prevTurnCount.current) {
      const lastTurn = turns[turns.length - 1];
      const turnPlayerIndex = lastTurn?.player ?? lastTurn?.playerIndex;

      // Play applause for the player who placed all 7 tiles
      if (lastTurn?.type === 'move' && lastTurn.placements?.length === 7 && turnPlayerIndex === playerIndex) {
        applauseAudio.play().catch(() => {});
      }

      // Notify when it becomes your turn
      if (whosTurn === playerIndex && turnPlayerIndex !== playerIndex) {
        yourTurnAudio.play().catch(() => {});
        if (Notification.permission === 'granted') {
          const opponentName = turnPlayerIndex != null ? players[turnPlayerIndex]?.name : null;
          new Notification('Scrabble', { body: opponentName ? `${opponentName} made a move. It's your turn!` : "It's your turn!" });
        }
      }
    }
    prevTurnCount.current = turns.length;
  }, [turns, whosTurn, playerIndex]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);
}
