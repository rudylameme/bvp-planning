import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuration Vite pour V4
export default defineConfig({
  plugins: [
    react(),
    // Plugin pour servir index-v4.html comme page d'accueil
    {
      name: 'serve-v4-index',
      configureServer(server) {
        // Middleware au début de la chaîne
        return () => {
          server.middlewares.use((req, res, next) => {
            // Rediriger / vers /index-v4.html
            if (req.url === '/' || req.url === '/index.html') {
              res.writeHead(302, { Location: '/index-v4.html' });
              res.end();
              return;
            }
            next();
          });
        };
      },
    },
  ],
  server: {
    port: 5176,
  },
})
