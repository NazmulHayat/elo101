import { useEffect, useState } from 'react'

// Chess.com exposes profile pictures; Lichess has none, so those players keep the king icon.
const cache = new Map<string, Promise<string | null>>()

function fetchAvatar(user: string): Promise<string | null> {
  const key = user.toLowerCase()
  let hit = cache.get(key)
  if (!hit) {
    hit = fetch(`https://api.chess.com/pub/player/${encodeURIComponent(key)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { avatar?: unknown } | null) => (d && typeof d.avatar === 'string' && d.avatar.startsWith('https://') ? d.avatar : null))
      .catch(() => null)
    cache.set(key, hit)
  }
  return hit
}

/** Profile picture URL for a Chess.com player, or null (Lichess, unknown, offline, still loading). */
export function useAvatar(name: string | undefined, pool: 'chesscom' | 'lichess'): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    setUrl(null)
    if (pool !== 'chesscom' || !name || !/^[\w-]{2,40}$/.test(name)) return
    let live = true
    void fetchAvatar(name).then((u) => { if (live) setUrl(u) })
    return () => { live = false }
  }, [name, pool])
  return url
}
