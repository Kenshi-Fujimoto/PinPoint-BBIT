import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { initializeFirebase } from './services/firebase';
import './index.css';

/**
 * Resolve the Firebase configuration *before* the first render so the UI knows
 * whether real Google sign-in is available (build-time .env, runtime
 * /api/config or window.__PINPOINT_FIREBASE_CONFIG__ — see services/firebase.js).
 * The promise never rejects and resolves immediately when there is no backend.
 */
initializeFirebase().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
