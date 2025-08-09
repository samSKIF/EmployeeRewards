import React from 'react';

// Env flag supports both Vite and Next-style names
const uiPref =
  (import.meta as any).env?.VITE_AUTH_UI ||
  (process?.env as any)?.NEXT_PUBLIC_AUTH_UI ||
  'legacy';

export default function AuthGate() {
  const useLegacy = String(uiPref).toLowerCase() === 'legacy';
  // Lazy load to avoid bundling both eagerly
  const Legacy = React.lazy(() => import('./LegacyAuth'));
  const Modern = React.lazy(() => import('./ModernAuth'));
  return (
    <React.Suspense fallback={null}>
      {useLegacy ? <Legacy /> : <Modern />}
    </React.Suspense>
  );
}