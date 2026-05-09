import { config } from './config.js'

export type DudenRejectionReason = 'not_found' | 'eigenname' | 'error'

export interface DudenValidationResult {
  valid: boolean
  reason?: DudenRejectionReason
  message?: string
}

interface DudenSearchResult {
  headword: string
  snippet: string | null
}

export const isDudenConfigured = (): boolean => config.duden !== null

export const getDudenPublicUrl = (): string | null => config.duden?.publicUrl ?? null

export const validateWord = async (word: string): Promise<DudenValidationResult> => {
  if (!config.duden) return { valid: true }

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (config.duden.authHeader) headers.Authorization = config.duden.authHeader

  const url = `${config.duden.baseUrl}/api/search?q=${encodeURIComponent(word)}`
  let res: Response
  try {
    res = await fetch(url, { headers })
  } catch (e) {
    return { valid: false, reason: 'error', message: `duden lookup failed: ${(e as Error).message}` }
  }

  if (res.status === 404) {
    return { valid: false, reason: 'not_found' }
  }
  if (!res.ok) {
    return { valid: false, reason: 'error', message: `duden lookup failed: ${res.status} ${res.statusText}` }
  }

  const data = (await res.json()) as { results?: DudenSearchResult[] }
  const first = data.results?.[0]
  if (!first) return { valid: false, reason: 'not_found' }

  if ((first.snippet || '').includes('Eigenname')) {
    return { valid: false, reason: 'eigenname' }
  }
  return { valid: true }
}
