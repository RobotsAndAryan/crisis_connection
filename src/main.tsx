import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Register offline-first Service Worker for zero-signal field deployment
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration skipped in restricted dev contexts
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
