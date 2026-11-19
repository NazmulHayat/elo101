import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './admin.css'
import { Dashboard } from './Dashboard'

// No PostHog here: the dashboard must not count its own visits.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Dashboard />
  </StrictMode>,
)
