/**
 * Custom Next.js Server
 * Utilisé pour le déploiement sur des hébergeurs comme Hostinger
 * En développement, utilisez 'npm run dev' à la place
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Initialisation de l'app Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);

      // Headers de sécurité basiques
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');

      // Gestion des routes via Next.js
      await handle(req, res, parsedUrl);

    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Internal Server Error');
    }
  })
    .once('error', (err) => {
      console.error('Server error:', err);
      process.exit(1);
    })
    .listen(port, hostname, () => {
      console.log(`
╔════════════════════════════════════════════╗
║  Splash Banana - Production Vidéo IA       ║
╠════════════════════════════════════════════╣
║  Server ready on:                          ║
║  → http://${hostname}:${port}                      ║
║  Mode: ${dev ? 'Development' : 'Production'}                          ║
╚════════════════════════════════════════════╝
      `);
    });
});

// Gestion propre de l'arrêt du serveur
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
