// Environment configuration for production-ready deployment

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

    // OAuth Configuration
    oauth: {
      googleClientId: isDevelopment
        ? (import.meta.env.VITE_GOOGLE_CLIENT_ID || '461128965954-90fcltci30rissdg8825l3lv5e0ifpfd.apps.googleusercontent.com')
        : '461128965954-90fcltci30rissdg8825l3lv5e0ifpfd.apps.googleusercontent.com', // Production Google Client ID
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
