import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The Rust/Axum backend listens on 8080 (see backend/.env.example BIND_ADDR).
// In development every /api request is proxied so the browser stays same-origin
// and no CORS or cookie juggling is needed.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
