import { useEffect, useState } from 'react'
import { api } from '../api/client.js'

let cachedUrl: string | null | undefined = undefined
let pending: Promise<string | null> | null = null

const fetchDudenUrl = (): Promise<string | null> => {
  if (cachedUrl !== undefined) return Promise.resolve(cachedUrl)
  if (!pending) {
    pending = api
      .getConfig()
      .then((c) => {
        cachedUrl = c.dudenUrl
        return cachedUrl
      })
      .catch(() => {
        cachedUrl = null
        return null
      })
  }
  return pending
}

interface DudenLinkProps {
  className?: string
}

export const DudenLink = ({ className }: DudenLinkProps) => {
  const [url, setUrl] = useState<string | null>(cachedUrl ?? null)

  useEffect(() => {
    if (cachedUrl === undefined) {
      fetchDudenUrl().then(setUrl)
    }
  }, [])

  if (!url) return null

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={className || 'inline-flex items-center rounded overflow-hidden hover:opacity-80 drop-shadow-md'}
      title="Duden"
    >
      <img src="/duden-logo.svg" alt="Duden" className="h-9 w-auto block" />
    </a>
  )
}
