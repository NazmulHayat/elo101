import { useState } from 'react'
import type { Side } from '../types'
import { KingIcon } from './PieceIcon'

/** The player's profile picture when we have one, otherwise the king of their colour. */
export function PlayerAvatar({ side, src, size }: { side: Side; src: string | null; size?: number }) {
  const [failed, setFailed] = useState<string | null>(null)
  if (src && failed !== src) {
    return <img className="avatar-img" src={src} alt="" referrerPolicy="no-referrer" onError={() => setFailed(src)} />
  }
  return <KingIcon side={side} size={size} />
}
