import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuration Vite pour le build Équipe
// Déploiement Vercel: https://equipe-bvp.vercel.app/
export default defineConfig({
  plugins: [react()],
  base: '/',
  define: {
    'import.meta.env.VITE_APP_MODE': JSON.stringify('equipe')
  },
  build: {
    outDir: 'dist-equipe',
    rollupOptions: {
      input: './index.html'
    }
  }
})
