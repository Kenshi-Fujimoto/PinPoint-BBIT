export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    app: 'PinPoint Vercel Serverless Backend',
    timestamp: new Date().toISOString(),
    services: {
      edgestore: Boolean(process.env.EDGE_STORE_ACCESS_KEY && process.env.EDGE_STORE_SECRET_KEY),
      firestore: Boolean(process.env.VITE_FIREBASE_PROJECT_ID),
    },
  });
}
