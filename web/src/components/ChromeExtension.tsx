// The elo101 Chrome extension (Chrome Web Store listing, version 1.2.0+).
export const STORE_URL = 'https://chromewebstore.google.com/detail/elo101-game-review/hlhdgbelomlkdmiajjahhojecfikcnkl'

export function ChromeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M24 24 4.95 13A22 22 0 0 1 43.05 13Z" fill="#db4437" />
      <path d="M24 24 43.05 13A22 22 0 0 1 24 46Z" fill="#f4c20d" />
      <path d="M24 24 24 46A22 22 0 0 1 4.95 13Z" fill="#0f9d58" />
      <circle cx="24" cy="24" r="10" fill="#fff" />
      <circle cx="24" cy="24" r="8" fill="#4285f4" />
    </svg>
  )
}

/** Primary "Add to Chrome" call to action. */
export function AddToChrome({ className = '', label = 'Add to Chrome, free' }: { className?: string; label?: string }) {
  return (
    <a className={`btn btn-chrome ${className}`} href={STORE_URL} target="_blank" rel="noopener">
      <ChromeIcon size={20} />
      <span>{label}</span>
    </a>
  )
}
