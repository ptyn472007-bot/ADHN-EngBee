import { defineConfig } from 'vite';
import { handleApiRequest } from './server/api.js';

export default defineConfig({
  plugins: [
    {
      name: 'engbee-api-server',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/api/')) {
            try {
              const handled = await handleApiRequest(req, res);
              if (handled) return;
            } catch (err) {
              console.error('[API Middleware Error]', err);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Internal Server Error' }));
              return;
            }
          }
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/api/')) {
            try {
              const handled = await handleApiRequest(req, res);
              if (handled) return;
            } catch (err) {
              console.error('[API Preview Error]', err);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Internal Server Error' }));
              return;
            }
          }
          next();
        });
      }
    }
  ],
  server: {
    host: true, // Lắng nghe trên mọi card mạng 0.0.0.0 để máy khác cùng mạng truy cập được
    port: 5173
  },
  preview: {
    host: true,
    port: 5173
  }
});
