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
  </React.StrictMode>,
);