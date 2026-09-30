import { createEdgeStoreNextHandler } from '@edgestore/server/adapters/next/pages';
import { edgeStoreRouter } from '../../src/services/edgestoreRouter.js';

let edgeStoreHandler = null;

try {
  edgeStoreHandler = createEdgeStoreNextHandler({
    router: edgeStoreRouter,
  });
} catch (e) {
  console.warn('EdgeStore handler initialization deferred:', e.message);
}

export default async function handler(req, res) {
  if (!process.env.EDGE_STORE_ACCESS_KEY || !process.env.EDGE_STORE_SECRET_KEY) {
    return res.status(200).json({
      status: 'pending_configuration',
      message: 'EDGE_STORE_ACCESS_KEY and EDGE_STORE_SECRET_KEY need to be added to Vercel Environment Variables.',
      configured: false
    });
  }

  if (edgeStoreHandler) {
    return edgeStoreHandler(req, res);
  }

  return res.status(500).json({ error: 'EdgeStore router failed to initialize' });
}
