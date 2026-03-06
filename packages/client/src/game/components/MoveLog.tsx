import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameState } from '../hooks/useGameState.js'

const formatRelativeTime = (timestamp?: string) => {
  if (!timestamp) return ''
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export const MoveLog = () => {
  const { t } = useTranslation()
  const turns = useGameState((s) => s.turns)
  const players = useGameState((s) => s.players)
  const [, setTick] = useState(0)

  // Re-render every 10s to update relative timestamps
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10000)
    return () => clearInterval(id)
  }, [])

  const reversedTurns = [...turns].reverse()

  return (
    <div className="bg-[#F7F7E3] border border-[#DCDCC6] rounded-md p-3 flex flex-col min-h-0 h-full">
      <div className="flex-1 min-h-0 overflow-auto text-sm space-y-1">
        {turns.length === 0 && <div className="text-[#AAA38E] italic">{t('No moves yet')}</div>}
        {reversedTurns.map((turn, i) => {
          const pi = turn.player ?? turn.playerIndex ?? 0
          const playerName = players[pi]?.name || `Player ${pi + 1}`
          return (
            <div key={turns.length - 1 - i} className="border-b border-[#DCDCC6] pb-1">
              <div className="flex justify-between">
                <span className="font-medium">{playerName}</span>
                {turn.type === 'move' && <span className="text-green-700 font-bold">+{turn.score}</span>}
                {turn.type === 'pass' && <span className="text-[#AAA38E]">{t('passed')}</span>}
                {turn.type === 'swap' && (
                  <span className="text-blue-600">{t('swapped {{num}}', { num: turn.count })}</span>
                )}
                {turn.type === 'challenge' && <span className="text-red-600">{turn.score}</span>}
                {turn.type === 'takeBack' && <span className="text-orange-600">{turn.score}</span>}
              </div>
              {(turn.move?.words || turn.moveData?.words) && (
                <div className="flex justify-between ml-4">
                  <span className="text-[#626258]">
                    {(turn.move?.words || turn.moveData?.words || []).map((w, j) => (
                      <span key={j}>
                        {j > 0 && ', '}
                        {w.word} ({w.score})
                      </span>
                    ))}
                  </span>
                  <span className="text-[#AAA38E] text-sm">{formatRelativeTime(turn.timestamp)}</span>
                </div>
              )}
              {!(turn.move?.words || turn.moveData?.words) && turn.timestamp && (
                <div className="ml-4 text-right text-[#AAA38E] text-sm">{formatRelativeTime(turn.timestamp)}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
