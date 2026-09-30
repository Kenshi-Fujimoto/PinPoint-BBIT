import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { createEdgeStoreExpressHandler } from '@edgestore/server/adapters/express';
import { edgeStoreRouter } from './src/services/edgestoreRouter.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Global Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json());

// EdgeStore Cloud Bucket Handler
try {
  const edgeStoreHandler = createEdgeStoreExpressHandler({
    router: edgeStoreRouter,
  });

  app.all('/api/edgestore/*', async (req, res, next) => {
    try {
      await edgeStoreHandler(req, res);
    } catch (err) {
      console.error('EdgeStore request processing error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'EdgeStore processing error', message: err.message });
      }
    }
  });
} catch (err) {
  console.warn('EdgeStore handler initialization deferred:', err.message);
  app.all('/api/edgestore/*', (req, res) => {
    res.status(200).json({
      status: 'fallback',
      configured: false,
      message: 'Running in resilient offline/client compression mode',
    });
  });
}

// Backend Health & Info API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'PinPoint Unified Express Server',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
    services: {
      edgestore: Boolean(process.env.EDGE_STORE_ACCESS_KEY && process.env.EDGE_STORE_SECRET_KEY),
      firestore: Boolean(process.env.VITE_FIREBASE_PROJECT_ID),
    },
  });
});

// Static Assets & Production Single Page Application (SPA) Serving
const distPath = path.join(__dirname, 'dist');

if (fs.existsSync(distPath)) {
  // Serve static assets from dist folder with caching
  app.use(express.static(distPath, {
    maxAge: '1d',
    index: 'index.html'
  }));

  // Fallback route for client-side React SPA routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // Helpful development guidance if running server before running build
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8"/>
          <title>PinPoint - Express Server</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #0c0e14; color: #f3f4f6; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
            .card { background: #161922; border: 1px solid #282e3e; border-radius: 1.5rem; padding: 32px; max-width: 500px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            h2 { color: #818cf8; margin-top: 0; }
            p { color: #9ca3af; font-size: 14px; line-height: 1.6; }
            .btn { display: inline-block; background: #4f46e5; color: white; padding: 10px 20px; border-radius: 12px; text-decoration: none; font-weight: bold; margin-top: 15px; font-size: 13px; }
            code { background: #232838; padding: 2px 6px; border-radius: 6px; color: #38bdf8; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>📍 PinPoint Express Server</h2>
            <p>Production <code>dist/</code> folder not detected yet.</p>
            <p>To serve the full frontend app via Express, run:<br/><code>npm run build</code> then <code>npm start</code></p>
            <a class="btn" href="http://localhost:3000">Open Vite Dev Server (Port 3000) →</a>
          </div>
        </body>
      </html>
    `);
  });
}

// Start listening ONLY if executed directly (e.g. `node server.js` or `npm start`)
const isDirectExecution = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  app.listen(PORT, () => {
    console.log(`📍 PinPoint Express App & API serving on http://localhost:${PORT}`);
  });
}

export default app;
