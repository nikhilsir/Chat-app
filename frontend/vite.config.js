import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { spawn } from 'node:child_process'

// Dev-only plugin: keeps the backend (:5000) alive while vite runs.
// Vite itself is supervised externally (boot-tree watchdog on :3000).
function backendWatchdog() {
  return {
    name: 'backend-watchdog',
    apply: 'serve',
    configureServer() {
      setInterval(async () => {
        try {
          const res = await fetch('http://127.0.0.1:5000/healthz', { signal: AbortSignal.timeout(2500) })
          if (res.ok) return
        } catch { /* down */ }
        console.log('[backend-watchdog] backend down — restarting')
        spawn('bash', ['/home/z/my-project/scripts/chat-app-supervisor.sh'], {
          cwd: '/home/z/my-project/chat-app',
          detached: true,
          stdio: 'ignore',
        }).unref()
      }, 10_000)
    },
  }
}

export default defineConfig({
  plugins: [react(), backendWatchdog()],
  // Own inline postcss config — prevents vite from walking up and
  // loading the parent project's postcss.config.mjs (Tailwind 4),
  // which crashes this app.
  css: { postcss: {} },
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
      },
    },
  },
})
