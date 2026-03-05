import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameState } from '../hooks/useGameState.js'
import { api } from '../../api/client.js'

export const GameEndOverlay = () => {
  const { t } = useTranslation()
  const endMessage = useGameState((s) => s.endMessage)
  const gameKey = useGameState((s) => s.gameKey)
  const playerKey = useGameState((s) => s.playerKey)
  const setError = useGameState((s) => s.setError)
  const navigatingRef = useRef(false)
  const [navigating, setNavigating] = useState(false)

  if (!endMessage) return null

  const winner = endMessage.players.reduce((best: any, p: any) => (p.score > (best?.score || 0) ? p : best), null)

  const handleNewGame = async () => {
    if (!gameKey || navigatingRef.current) return
    navigatingRef.current = true
    setNavigating(true)
    // If another player already created the follow-on game, navigate to it
    if (endMessage.nextGameKey) {
      const url = playerKey ? `/game/${endMessage.nextGameKey}/${playerKey}` : `/game/${endMessage.nextGameKey}`
      window.location.href = url
      return
    }
    try {
      const result = await api.newGame(gameKey, playerKey!)
      const url = playerKey ? `/game/${result.key}/${playerKey}` : `/game/${result.key}`
      window.location.href = url
    } catch (e: any) {
      navigatingRef.current = false
      setNavigating(false)
      setError(e.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#F7F7E3] rounded-lg p-6 max-w-md shadow-xl text-center">
        <h2 className="text-2xl font-bold text-[#474633] mb-2">{t('Game Over')}</h2>
        <p className="text-sm text-[#626258] mb-4">{(() => {
          const reason = endMessage.reason as string
          const playerMatch = reason.match(/^player (\d+) ended the game$/)
          if (playerMatch) {
            const pi = parseInt(playerMatch[1], 10)
            const name = endMessage.players[pi]?.name ?? `Player ${pi + 1}`
            return t('{{name}} ended the game', { name })
          }
          return t(reason)
        })()}</p>

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
                    {' '}
                    ({p.tallyScore > 0 ? '+' : ''}
                    {p.tallyScore})
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>

        {endMessage.players.map((p: any, i: number) => (
          <div key={i} className="text-xs text-[#AAA38E] mb-1">
            {t("{{name}}'s tiles:", { name: p.name })}{' '}
            {p.rack?.squares
              ?.filter((sq: any) => sq.tile)
              .map((sq: any) => sq.tile.letter)
              .join(', ') || t('none')}
          </div>
        ))}

        <button
          onClick={handleNewGame}
          className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
        >
          {endMessage.nextGameKey && !navigating ? t('Join New Game') : t('New Game')}
        </button>
      </div>
    </div>
  )
}
