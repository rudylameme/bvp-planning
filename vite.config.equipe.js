import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuration Vite pour le build Équipe
// Déploiement Vercel: https://equipe-bvp.vercel.app/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist-equipe',
    rollupOptions: {
      input: './index.html'
    }
  }
})
