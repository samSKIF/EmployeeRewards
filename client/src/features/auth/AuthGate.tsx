import React from 'react';

export default function AuthGate() {
  // Always use the auth-page with marketing content
  const AuthPage = React.lazy(() => import('../../pages/auth-page'));
  return (
    <React.Suspense fallback={null}>
      <AuthPage />
    </React.Suspense>
  );
}