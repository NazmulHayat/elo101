/** Last-move tint, laid over the square (or the board picture) in the board theme's highlight colour. */
export function highlight(): Record<string, string> {
  return { boxShadow: 'inset 0 0 0 999px var(--sq-hl)' }
}
