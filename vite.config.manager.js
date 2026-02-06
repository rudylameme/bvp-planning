import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuration Vite pour le build Manager
// App complète avec les 2 univers (Manager + Équipe)
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
