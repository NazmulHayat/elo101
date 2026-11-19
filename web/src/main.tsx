import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { redactAnalyticsEvent } from './lib/analytics'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    {import.meta.env.PROD && <Analytics beforeSend={redactAnalyticsEvent} />}
  </StrictMode>,
)
