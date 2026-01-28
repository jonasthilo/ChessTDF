import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  server: {
    port: 3002,
    proxy: {
      '/api': {
        target: 'http://backend:3001',
        changeOrigin: true,
      },
    },
    watch: {
      usePolling: true,
      interval: 500, // ms - needed for Docker on Windows
    },
  },
})
