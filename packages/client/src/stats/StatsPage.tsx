import { useEffect, useState } from 'react'
import { api } from '../api/client.js'

interface PlayerStats {
  name: string
  gamesPlayed: number
  gamesWon: number
  totalScore: number
  highestScore: number
  highestWordScore: number
  highestWord: string | null
  averageScore: number
  totalTilesPlaced: number
  bingoCount: number
}

export const StatsPage = ({ onBack }: { onBack: () => void }) => {
  const [allStats, setAllStats] = useState<PlayerStats[]>([])
  const [selected, setSelected] = useState<PlayerStats | null>(null)
  const [h2h, setH2h] = useState<{ opponent: string; wins: number; losses: number; draws: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .getAllStats()
      .then((data) => {
        setAllStats(data)
        if (data.length > 0) setSelected(data[0])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Load head-to-head when a player is selected
  useEffect(() => {
    if (!selected) return
    const opponents = allStats.filter((s) => s.name !== selected.name)
    Promise.all(
      opponents.map((opp) =>
        api.getHeadToHead(selected.name, opp.name).then((data) => ({
          opponent: opp.name,
          ...data,
        })),
      ),
    ).then(setH2h)
  }, [selected, allStats])

  if (loading) {
    return (
      <div className="min-h-screen bg-woodgrain flex items-center justify-center">
        <div className="text-amber-700">Loading stats...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-woodgrain">
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="text-sm text-[#AAA38E] hover:text-[#474633]">
            Back
          </button>
          <h1 className="text-2xl font-bold text-[#474633]">Statistics</h1>
        </div>

        {allStats.length === 0 ? (
          <div className="text-[#AAA38E] text-center py-8">
            No games played yet. Stats will appear after your first completed game.
          </div>
        ) : (
          <>
            {/* Player selector */}
            <div className="flex flex-wrap gap-2 mb-4">
              {allStats.map((s) => (
                <button
                  key={s.name}
                  onClick={() => setSelected(s)}
                  className={`px-3 py-1.5 rounded text-sm ${
                    selected?.name === s.name
                      ? 'bg-[#474633] text-white'
                      : 'bg-[#F7F7E3] border border-[#DCDCC6] text-[#626258] hover:bg-[#DCDCC6]'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>

            {selected && (
              <div className="space-y-3">
                <StatCard label="Games Played" value={selected.gamesPlayed} />
                <StatCard label="Games Won" value={selected.gamesWon} />
                <StatCard label="Win Rate" value={`${Math.round((selected.gamesWon / selected.gamesPlayed) * 100)}%`} />
                <StatCard label="Average Score" value={selected.averageScore} />
                <StatCard label="Highest Game Score" value={selected.highestScore} />
                <StatCard
                  label="Highest Word"
                  value={selected.highestWord ? `${selected.highestWord} (${selected.highestWordScore})` : '-'}
                />
                <StatCard label="Total Tiles Placed" value={selected.totalTilesPlaced} />
                <StatCard label="Bingos (7-tile bonus)" value={selected.bingoCount} />

                {/* Head-to-head */}
                {h2h.length > 0 && (
                  <div className="bg-[#F7F7E3] border border-[#DCDCC6] rounded-md p-3 mt-4">
                    <h3 className="font-bold text-sm text-[#474633] mb-2">Head-to-Head</h3>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[#AAA38E] text-xs">
                          <th className="text-left py-1">Opponent</th>
                          <th className="text-right py-1">W</th>
                          <th className="text-right py-1">L</th>
                          <th className="text-right py-1">D</th>
                        </tr>
                      </thead>
                      <tbody>
                        {h2h
                          .filter((r) => r.wins + r.losses + r.draws > 0)
                          .map((r) => (
                            <tr key={r.opponent}>
                              <td className="py-0.5">{r.opponent}</td>
                              <td className="text-right py-0.5 text-green-700 tabular-nums">{r.wins}</td>
                              <td className="text-right py-0.5 text-red-600 tabular-nums">{r.losses}</td>
                              <td className="text-right py-0.5 text-[#AAA38E] tabular-nums">{r.draws}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const StatCard = ({ label, value }: { label: string; value: string | number }) => {
  return (
    <div className="bg-[#F7F7E3] border border-[#DCDCC6] rounded-md p-3 flex justify-between items-center">
      <span className="text-sm text-[#626258]">{label}</span>
      <span className="font-bold text-[#474633]">{value}</span>
    </div>
  )
}
