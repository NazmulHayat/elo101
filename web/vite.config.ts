import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Node's process, without pulling in @types/node for one variable.
declare const process: { env: Record<string, string | undefined>; cwd(): string }

// In dev, answer /api/stats with the same handler Vercel runs (web/api/stats.ts), reading web/.env.local.
function statsApi(): Plugin {
  return {
    name: 'stats-api',
    configureServer(server) {
      Object.assign(process.env, loadEnv('development', process.cwd(), ''))
      server.middlewares.use(async (raw, res, next) => {
        const req = raw as unknown as { url?: string; headers: Record<string, string | string[] | undefined> }
        if (!req.url?.startsWith('/api/stats')) return next()
        try {
          const mod = await server.ssrLoadModule('/api/stats.ts')
          const headers = new Headers()
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
          const out: Response = await mod.GET(new Request(`http://localhost${req.url}`, { headers }))
          res.statusCode = out.status
          out.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(await out.text())
        } catch (e) {
          next(e)
        }
      })
    },
  }
}

// Dev server proxies the rest of /api to the FastAPI app (python -m ep_model.review.server).
// VITE_BASE sets the public path for a static build, e.g. /ChessCoach/ on GitHub Pages.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), statsApi()],
  server: {
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
  build: {
    rollupOptions: {
      input: { main: 'index.html', admin: 'admin/index.html' },
    },
  },
})
