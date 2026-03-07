import { useTranslation } from 'react-i18next'
import { useGameState } from '../hooks/useGameState.js'

export const Scoreboard = () => {
  const { t } = useTranslation()
  const players = useGameState((s) => s.players)
  const whosTurn = useGameState((s) => s.whosTurn)
  const playerIndex = useGameState((s) => s.playerIndex)
  const onlinePlayers = useGameState((s) => s.onlinePlayers)
  const remainingTileCounts = useGameState((s) => s.remainingTileCounts)

  return (
    <div className="bg-[#F7F7E3] border border-[#DCDCC6] rounded-md p-3">
      <table className="w-full text-xl">
        <tbody>
          {players.map((player, i) => (
            <tr key={i}>
              <td className="py-1 w-4">
                <span className={i === playerIndex || onlinePlayers.has(i) ? 'text-green-500' : 'text-gray-300'}>
                  ●
                </span>
              </td>
              <td className="py-1 pl-1 w-5 text-center">
                {whosTurn === i ? <span className="text-xl font-bold text-[#474633] mr-1">→</span> : ''}
              </td>
              <td className="py-1">
                {i === playerIndex ? t('You') : player.name}
                <span className="text-[#AAA38E] text-xl ml-1">({remainingTileCounts?.players[i] ?? '?'})</span>
              </td>
              <td className="text-right py-1 tabular-nums">{player.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {remainingTileCounts && (
        <div className="text-xl text-[#AAA38E] mt-2">
          {t('Bag: {{num}} tiles', { num: remainingTileCounts.letterBag })}
        </div>
      )}
    </div>
  )
}
