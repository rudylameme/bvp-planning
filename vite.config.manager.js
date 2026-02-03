import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuration Vite pour le build Manager
// Déploiement Vercel: https://manager-bvp.vercel.app/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist-manager',
    rollupOptions: {
      input: './index.html'
    }
  }
})
