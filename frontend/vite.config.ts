import { defineConfig } from 'vite'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'

const gitHash = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    try {
      const gitDir = resolve(process.cwd(), '../.git');
      const head = readFileSync(resolve(gitDir, 'HEAD'), 'utf8').trim();
      if (head.startsWith('ref: ')) {
        const ref = head.slice(5);
        return readFileSync(resolve(gitDir, ref), 'utf8').trim().substring(0, 7);
      }
      return head.substring(0, 7);
    } catch {
      return 'unknown';
    }
  }
})();

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __GIT_HASH__: JSON.stringify(gitHash),
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
