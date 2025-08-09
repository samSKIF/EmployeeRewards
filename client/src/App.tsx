import { Switch, Route, useLocation } from 'wouter';
import { useState, useEffect } from 'react';

// Simple welcome component for now
const WelcomePage = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Welcome to ThrivioHR</h1>
      <p className="text-gray-600 mb-6">
        Your comprehensive HR and employee engagement platform is ready!
      </p>
      <div className="space-y-3">
        <div className="flex items-center text-green-600">
          <span className="mr-2">✓</span>
          <span>OpenTelemetry tracing enabled</span>
        </div>
        <div className="flex items-center text-green-600">
          <span className="mr-2">✓</span>
          <span>PII encryption configured</span>
        </div>
        <div className="flex items-center text-green-600">
          <span className="mr-2">✓</span>
          <span>Event bus operational</span>
        </div>
        <div className="flex items-center text-green-600">
          <span className="mr-2">✓</span>
          <span>Multi-tenant architecture</span>
        </div>
      </div>
    </div>
  </div>
);

function App() {
  const [location, setLocation] = useLocation();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    setAppReady(true);
  }, []);

  return (
    <div>
      {appReady && (
        <Switch>
          <Route path="/" component={WelcomePage} />
          <Route>
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Page Not Found</h2>
                <p className="text-gray-600">The requested page is not available yet.</p>
                <button 
                  onClick={() => setLocation('/')}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Go Home
                </button>
              </div>
            </div>
          </Route>
        </Switch>
      )}
    </div>
  );
}

export default App;