import { axiosInstance } from '../lib/axios';

export const checkBackendHealth = async () => {
  try {
    const response = await axiosInstance.get('/health');
    return response.data;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return {
      status: 'ERROR',
      message: 'Backend unreachable',
      error: error.message
    };
  }
};

export const logHealthStatus = async () => {
  const health = await checkBackendHealth();
  console.log('🏥 Backend Health Check:', health);
  
  if (health.googleOAuth) {
    if (health.googleOAuth.configured) {
      console.log('✅ Google OAuth is configured on backend');
    } else {
      console.log('❌ Google OAuth is NOT configured on backend');
    }
  }
  
  return health;
};
