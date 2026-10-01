import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

/**
 * Firebase env vars are read from `.env*` files (and the shell/Vercel
 * environment), accepting the common aliases so a project that already has
 * FIREBASE_API_KEY / REACT_APP_FIREBASE_API_KEY works without renaming:
 *   VITE_FIREBASE_API_KEY · FIREBASE_API_KEY · REACT_APP_FIREBASE_API_KEY · NEXT_PUBLIC_FIREBASE_API_KEY
 *
 * The merged object is (a) inlined into the bundle as `__PINPOINT_FIREBASE_ENV__`
 * and (b) injected into index.html as `window.__PINPOINT_FIREBASE_CONFIG__`.
 * The HTML injection is what makes the aliases work in `vite dev` too — Vite
 * skips `define` in dev mode, so a plain `FIREBASE_API_KEY` in .env would
 * otherwise stay invisible until a production build. Values can still be
 * supplied at runtime by the host through /api/config (Express/Vercel).
 *
 * Only these six public web-config fields are ever read or injected — admin
 * secrets such as FIREBASE_PRIVATE_KEY never reach the client.
 */
function resolveFirebaseEnv(mode, envDir = process.cwd()) {
  const env = loadEnv(mode, envDir, '');
  const pick = (...names) => {
    for (const name of names) {
      const value = env[name];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
  };

  return {
    apiKey: pick('VITE_FIREBASE_API_KEY', 'FIREBASE_API_KEY', 'REACT_APP_FIREBASE_API_KEY', 'NEXT_PUBLIC_FIREBASE_API_KEY'),
    authDomain: pick('VITE_FIREBASE_AUTH_DOMAIN', 'FIREBASE_AUTH_DOMAIN', 'REACT_APP_FIREBASE_AUTH_DOMAIN', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId: pick('VITE_FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_ID', 'REACT_APP_FIREBASE_PROJECT_ID', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
    storageBucket: pick('VITE_FIREBASE_STORAGE_BUCKET', 'FIREBASE_STORAGE_BUCKET', 'REACT_APP_FIREBASE_STORAGE_BUCKET', 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: pick('VITE_FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_MESSAGING_SENDER_ID', 'REACT_APP_FIREBASE_MESSAGING_SENDER_ID', 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
    appId: pick('VITE_FIREBASE_APP_ID', 'FIREBASE_APP_ID', 'REACT_APP_FIREBASE_APP_ID', 'NEXT_PUBLIC_FIREBASE_APP_ID'),
  };
}

/**
 * Injects the resolved Firebase config into the served/built index.html.
 * Works identically in `vite dev`, `vite build` and `vite preview`.
 */
function firebaseRuntimeConfigPlugin() {
  let firebaseConfig = {};
  return {
    name: 'pinpoint:firebase-runtime-config',
    configResolved(config) {
      firebaseConfig = resolveFirebaseEnv(config.mode, config.envDir || process.cwd());
    },
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          injectTo: 'head-prepend',
          children: `window.__PINPOINT_FIREBASE_CONFIG__ = ${JSON.stringify(firebaseConfig)};`,
        },
      ];
    },
  };
}

export default defineConfig(({ mode }) => ({
  define: {
    __PINPOINT_FIREBASE_ENV__: JSON.stringify(resolveFirebaseEnv(mode)),
  },
  plugins: [
    firebaseRuntimeConfigPlugin(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png', 'icons/*.svg'],
      manifest: {
        id: '/',
        name: 'PinPoint',
        short_name: 'PinPoint',
        description: 'PinPoint — Hyperlocal Campus Civic Issue Resolution & Lost Item Platform',
        theme_color: '#0071E3',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'unsplash-images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.basemaps\.cartocdn\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'carto-map-tiles-cache',
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 60 * 24 * 14, // 14 Days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          leaflet: ['leaflet', 'react-leaflet'],
          firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: false,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
}));

