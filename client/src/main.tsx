// Browser-safe polyfill for process.env - MUST BE FIRST to prevent "process is not defined" errors
(globalThis as any).process = (globalThis as any).process || { env: {} };
(window as any).process = (window as any).process || { env: {} };
if (typeof global !== 'undefined') {
  (global as any).process = (global as any).process || { env: {} };
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';

// Import and initialize i18n before rendering the app
import './i18n';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
