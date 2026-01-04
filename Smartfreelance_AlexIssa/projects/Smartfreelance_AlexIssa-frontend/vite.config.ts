import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
      },
    }),
  ],

  server: {
    host: true,
    port: 5173,
    strictPort: true,

    // Codespaces: prevent HMR websocket from dropping (which triggers location.reload())
    hmr: process.env.CODESPACE_NAME
      ? {
          protocol: 'wss',
          host: `${process.env.CODESPACE_NAME}-5173.app.github.dev`,
          clientPort: 443,
        }
      : undefined,

    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
