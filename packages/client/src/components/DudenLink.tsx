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
      className={
        className || 'px-3 py-2 bg-[#474633] text-white rounded text-sm hover:bg-[#626258] no-underline drop-shadow-md'
      }
      title="Duden"
    >
      Duden
    </a>
  )
}
