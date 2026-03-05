import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameState } from '../hooks/useGameState.js'

export const MoveLog = () => {
  const { t } = useTranslation()
  const turns = useGameState((s) => s.turns)
  const players = useGameState((s) => s.players)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [turns.length])

  return (
    <div className="bg-[#F7F7E3] border border-[#DCDCC6] rounded-md p-3">
      <h3 className="font-bold text-sm text-[#474633] mb-2">{t('Move Log')}</h3>
      <div ref={scrollRef} className="h-40 overflow-auto text-xs space-y-1">
        {turns.length === 0 && <div className="text-[#AAA38E] italic">{t('No moves yet')}</div>}
        {turns.map((turn, i) => {
          const pi = turn.player ?? turn.playerIndex ?? 0
          const playerName = players[pi]?.name || `Player ${pi + 1}`
          return (
            <div key={i} className="border-b border-[#DCDCC6] pb-1">
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
                <div className="ml-4 text-[#626258]">
                  {(turn.move?.words || turn.moveData?.words || []).map((w, j) => (
                    <span key={j}>
                      {j > 0 && ', '}
                      {w.word} ({w.score})
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
