const BASE = '/api'

/** Offset in ms: serverTime - clientTime. Add to Date.now() to get server-relative time. */
export let serverTimeOffset = 0

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const dateHeader = res.headers.get('Date')
  if (dateHeader) {
    serverTimeOffset = new Date(dateHeader).getTime() - Date.now()
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || res.statusText)
  }
  return res.json()
}

export const api = {
  // Games
  listGames: () =>
    request<
      { key: string; language: string; players: { name: string; key: string; hasTurn: boolean }[]; createdAt: string }[]
    >('/games'),
  createGame: (language: string, players: { name: string; email: string }[]) =>
    request<{ key: string; players: { name: string; key: string; index: number }[] }>('/games', {
      method: 'POST',
      body: JSON.stringify({ language, players }),
    }),
  getGame: (gameKey: string, playerKey?: string) =>
    request<any>(`/games/${gameKey}${playerKey ? `?playerKey=${playerKey}` : ''}`),
  makeMove: (gameKey: string, placements: any[], playerKey: string) =>
    request<{ ok: true }>(`/games/${gameKey}/move`, {
      method: 'POST',
      body: JSON.stringify({ placements, playerKey }),
    }),
  pass: (gameKey: string, playerKey: string) =>
    request<{ ok: true }>(`/games/${gameKey}/pass`, { method: 'POST', body: JSON.stringify({ playerKey }) }),
  swap: (gameKey: string, letters: string[], playerKey: string) =>
    request<{ ok: true }>(`/games/${gameKey}/swap`, {
      method: 'POST',
      body: JSON.stringify({ letters, playerKey }),
    }),
  challenge: (gameKey: string, playerKey: string) =>
    request(`/games/${gameKey}/challenge`, { method: 'POST', body: JSON.stringify({ playerKey }) }),
  takeBack: (gameKey: string, playerKey: string) =>
    request(`/games/${gameKey}/take-back`, { method: 'POST', body: JSON.stringify({ playerKey }) }),
  newGame: (gameKey: string, playerKey: string) =>
    request<{ key: string }>(`/games/${gameKey}/new-game`, { method: 'POST', body: JSON.stringify({ playerKey }) }),

  // Stats
  getAllStats: () => request<any[]>('/stats'),
  getPlayerStats: (name: string) => request<any>(`/stats/player/${encodeURIComponent(name)}`),
  getHeadToHead: (name1: string, name2: string) =>
    request<any>(`/stats/head-to-head/${encodeURIComponent(name1)}/${encodeURIComponent(name2)}`),
}
