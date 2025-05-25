import { useState } from 'react';
import { getGoogleClientId, ENV } from '../config/environment';

const EnvironmentDebug = () => {
  const [showDebug, setShowDebug] = useState(false);

  if (import.meta.env.MODE === 'production') {
    return null; // Don't show in production unless needed
  }

  const debugInfo = {
    environment: import.meta.env.MODE,
    nodeEnv: import.meta.env.NODE_ENV,
    viteGoogleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    googleClientId: getGoogleClientId(),
    currentOrigin: window.location.origin,
    apiUrl: ENV.apiBaseUrl,
    frontendUrl: ENV.frontendUrl,
    socketUrl: ENV.socketUrl,
    isProduction: ENV.isProduction,
    isDevelopment: ENV.isDevelopment,
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="btn btn-sm btn-outline"
        title="Toggle Debug Info"
      >
        🐛
      </button>
      
      {showDebug && (
        <div className="absolute bottom-12 right-0 bg-base-100 border border-base-300 rounded-lg p-4 shadow-lg max-w-md">
          <h3 className="font-bold mb-2">Environment Debug</h3>
          <div className="text-xs space-y-1">
            {Object.entries(debugInfo).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="font-mono text-primary">{key}:</span>
                <span className="font-mono text-secondary ml-2 break-all">
                  {typeof value === 'boolean' ? value.toString() : value || 'undefined'}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowDebug(false)}
            className="btn btn-xs btn-ghost mt-2"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default EnvironmentDebug;
