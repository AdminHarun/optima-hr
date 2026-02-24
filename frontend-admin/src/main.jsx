import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { register as registerServiceWorker } from './utils/serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <App />
);

// Register PWA Service Worker
registerServiceWorker();
