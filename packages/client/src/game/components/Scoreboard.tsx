import { useGameState } from '../hooks/useGameState.js'

export const Scoreboard = () => {
  const players = useGameState((s) => s.players)
  const whosTurn = useGameState((s) => s.whosTurn)
  const remainingTileCounts = useGameState((s) => s.remainingTileCounts)

  return (
    <div className="bg-[#F7F7E3] border border-[#DCDCC6] rounded-md p-3">
      <h3 className="font-bold text-sm text-[#474633] mb-2">Scoreboard</h3>
      <table className="w-full text-sm">
        <tbody>
          {players.map((player, i) => (
            <tr key={i} className={whosTurn === i ? 'font-bold' : ''}>
              <td className="py-0.5">
                {whosTurn === i && <span className="text-green-600 mr-1">●</span>}
                {player.name}
              </td>
              <td className="text-right py-0.5 tabular-nums">{player.score}</td>
              <td className="text-right py-0.5 text-[#AAA38E] text-xs tabular-nums">
                {remainingTileCounts?.players[i] ?? '?'} tiles
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {remainingTileCounts && (
        <div className="text-xs text-[#AAA38E] mt-2">Bag: {remainingTileCounts.letterBag} tiles</div>
      )}
    </div>
  )
}
