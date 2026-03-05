import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameState } from './useGameState.js'

const yourTurnAudio = new Audio('/audio/yourturn.wav')
const applauseAudio = new Audio('/audio/applause.wav')

export const useNotifications = () => {
  const { t } = useTranslation()
  const gameKey = useGameState((s) => s.gameKey)
  const whosTurn = useGameState((s) => s.whosTurn)
  const playerIndex = useGameState((s) => s.playerIndex)
  const players = useGameState((s) => s.players)
  const turns = useGameState((s) => s.turns)
  const chatMessages = useGameState((s) => s.chatMessages)
  const prevTurnCount = useRef(0)
  const prevChatCount = useRef(0)
  const ready = useRef(false)

  // Mark ready once game data is loaded (works even for games with 0 turns)
  useEffect(() => {
    if (gameKey && !ready.current) {
      ready.current = true
      prevTurnCount.current = turns.length
      prevChatCount.current = chatMessages.length
    }
  }, [gameKey, turns.length, chatMessages.length])

  // Notify on new chat messages from other players
  useEffect(() => {
    if (!ready.current) return
    if (chatMessages.length > prevChatCount.current) {
      const newMsg = chatMessages[chatMessages.length - 1]
      const myName = playerIndex !== null ? players[playerIndex]?.name : null
      if (newMsg && newMsg.playerName !== myName && Notification.permission === 'granted') {
        new Notification('Scrabble', { body: `${newMsg.playerName}: ${newMsg.message}` })
      }
    }
    prevChatCount.current = chatMessages.length
  }, [chatMessages, playerIndex, players])

  // Notify on new turns received via websocket (not on initial load)
  useEffect(() => {
    if (!ready.current) return
    if (turns.length > prevTurnCount.current) {
      const lastTurn = turns[turns.length - 1]
      const turnPlayerIndex = lastTurn?.player ?? lastTurn?.playerIndex

      // Play applause for the player who placed all 7 tiles
      if (lastTurn?.type === 'move' && lastTurn.placements?.length === 7 && turnPlayerIndex === playerIndex) {
        applauseAudio.play().catch(() => {})
      }

      // Notify when opponent takes back their move (it's no longer your turn)
      if (lastTurn?.type === 'takeBack' && turnPlayerIndex !== playerIndex && Notification.permission === 'granted') {
        const opponentName = turnPlayerIndex != null ? players[turnPlayerIndex]?.name : null
        if (opponentName) {
          new Notification('Scrabble', { body: t('{{name}} took back their move.', { name: opponentName }) })
        }
      }

      // Notify when it becomes your turn
      if (whosTurn === playerIndex && turnPlayerIndex !== playerIndex) {
        yourTurnAudio.play().catch(() => {})
        if (Notification.permission === 'granted') {
          const opponentName = turnPlayerIndex != null ? players[turnPlayerIndex]?.name : null
          const action =
            lastTurn.type === 'pass'
              ? t('passed')
              : lastTurn.type === 'swap'
                ? t('swapped {{num}}', { num: lastTurn.count })
                : lastTurn.type === 'challenge'
                  ? t('challenged')
                  : t('made a move')
          new Notification('Scrabble', {
            body: opponentName
              ? t("{{name}} {{action}}. It's your turn!", { name: opponentName, action })
              : t("It's your turn!"),
          })
        }
      }
    }
    prevTurnCount.current = turns.length
  }, [turns, whosTurn, playerIndex, players, t])

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])
}
