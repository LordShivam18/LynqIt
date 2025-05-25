// Environment configuration for production-ready deployment

// Helper function to get Google Client ID with multiple fallbacks
const getGoogleClientIdWithFallbacks = () => {
  // Try multiple sources in order of preference
  const sources = [
    import.meta.env.VITE_GOOGLE_CLIENT_ID,
    window.__APP_CONFIG__?.GOOGLE_CLIENT_ID,
    '461128965954-90fcltci30rissdg8825l3lv5e0ifpfd.apps.googleusercontent.com' // Hardcoded fallback
  ];

  for (const source of sources) {
    if (source && source !== 'your-google-oauth-client-id-here') {
      console.log('🔑 Using Google Client ID from:', source === import.meta.env.VITE_GOOGLE_CLIENT_ID ? 'Vite env' :
                  source === window.__APP_CONFIG__?.GOOGLE_CLIENT_ID ? 'Runtime config' : 'Hardcoded fallback');
      return source;
    }
  }

  console.error('❌ No valid Google Client ID found in any source');
  return null;
};

export const getEnvironmentConfig = () => {
  const isDevelopment = import.meta.env.MODE === 'development';
  const isProduction = import.meta.env.MODE === 'production';

  return {
    // Environment detection
    isDevelopment,
    isProduction,

    // API Configuration
    apiBaseUrl: isDevelopment
      ? 'http://localhost:5001/api'
      : '/api',

    // Frontend URLs
    frontendUrl: isDevelopment
      ? 'http://localhost:5173'
      : window.location.origin,

    // Socket.IO Configuration
    socketUrl: isDevelopment
      ? 'http://localhost:5001'
      : window.location.origin,

    // OAuth Configuration with multiple fallbacks
    oauth: {
      googleClientId: getGoogleClientIdWithFallbacks(),
    },

    // Debug info for production
    debug: {
      googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      nodeEnv: import.meta.env.NODE_ENV,
      mode: import.meta.env.MODE,
    },

    // Feature flags
    features: {
      enableAnalytics: isProduction,
      enableErrorReporting: isProduction,
      enableDebugMode: isDevelopment,
      enableServiceWorker: isProduction,
    },

    // Security settings
    security: {
      enableCSP: isProduction,
      enableHTTPS: isProduction,
      cookieSecure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
    },

    // Performance settings
    performance: {
      enableCompression: isProduction,
      enableCaching: isProduction,
      enableLazyLoading: true,
    },

    // App metadata
    app: {
      name: 'LynqIt',
      version: '1.0.0',
      description: 'Connect & Chat - Secure messaging platform',
      author: 'LynqIt Team',
    }
  };
};

// Export singleton instance
export const ENV = getEnvironmentConfig();

// Utility functions
export const isProduction = () => ENV.isProduction;
export const isDevelopment = () => ENV.isDevelopment;
export const getApiUrl = (endpoint = '') => `${ENV.apiBaseUrl}${endpoint}`;
export const getFrontendUrl = (path = '') => `${ENV.frontendUrl}${path}`;
export const getSocketUrl = () => ENV.socketUrl;
export const getGoogleClientId = () => ENV.oauth.googleClientId;
