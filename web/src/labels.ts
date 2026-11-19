import type { Label } from './types'

export interface LabelMeta {
  name: string
  article: string // "a" / "an" / "the"
  color: string
}

// elo101's own palette: same meaning and order Chess.com users know, our own colours. Fixed in every theme.
// Order matches the summary table, best to worst.
export const LABELS: Record<Label, LabelMeta> = {
  brilliant: { name: 'Brilliant', article: 'a', color: '#14b8c8' },
  great: { name: 'Great', article: 'a', color: '#4f86f7' },
  best: { name: 'Best', article: 'the', color: '#3fb86b' },
  excellent: { name: 'Excellent', article: 'an', color: '#86c25a' },
  good: { name: 'Good', article: 'a', color: '#9aae8f' },
  book: { name: 'Book', article: 'a', color: '#b08d6b' },
  inaccuracy: { name: 'Inaccuracy', article: 'an', color: '#f2b33d' },
  mistake: { name: 'Mistake', article: 'a', color: '#f5893b' },
  miss: { name: 'Miss', article: 'a', color: '#e0628a' },
  blunder: { name: 'Blunder', article: 'a', color: '#e5383b' },
}

export const LABEL_ORDER: Label[] = ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'miss', 'blunder']

export const BAD_LABELS: Label[] = ['inaccuracy', 'mistake', 'miss', 'blunder']

/** Labels worth retrying: you lost real chances here. */
export const RETRY_LABELS: Label[] = ['mistake', 'miss', 'blunder']

/** Marked on the advantage graph. */
export const GRAPH_LABELS: Label[] = ['brilliant', 'great', 'inaccuracy', 'mistake', 'miss', 'blunder']

/** Good moves that don't get a best-move arrow. */
export const TOP_LABELS: Label[] = ['brilliant', 'great', 'best', 'book']

/** Coach headline after the move, e.g. "Bxd1 **is a blunder**". */
export const PHRASE: Record<Label, string> = {
  brilliant: 'is brilliant',
  great: 'is a great move',
  best: 'is best',
  excellent: 'is excellent',
  good: 'is good',
  book: 'is a book move',
  inaccuracy: 'is an inaccuracy',
  mistake: 'is a mistake',
  miss: 'is a miss',
  blunder: 'is a blunder',
}

/** Shown as an icon in the move list (excellent and good stay plain). */
export const LIST_ICON_LABELS: Label[] = ['brilliant', 'great', 'best', 'book', 'inaccuracy', 'mistake', 'miss', 'blunder']

/** "the best move", "an excellent move", "a mistake" … */
export function describe(label: Label): string {
  const m = LABELS[label]
  const noun = ['inaccuracy', 'mistake', 'miss', 'blunder'].includes(label) ? m.name.toLowerCase() : `${m.name.toLowerCase()} move`
  return `${m.article} ${noun}`
}
