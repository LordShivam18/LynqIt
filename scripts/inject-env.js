#!/usr/bin/env node

/**
 * Environment Variable Injection Script for Production Builds
 * This script ensures that environment variables are properly injected
 * into the frontend build process on Render and other deployment platforms.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the environment variables that should be injected
const ENV_VARS = {
  VITE_GOOGLE_CLIENT_ID: process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '461128965954-90fcltci30rissdg8825l3lv5e0ifpfd.apps.googleusercontent.com',
  VITE_API_URL: process.env.VITE_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5001/api'),
  VITE_NODE_ENV: process.env.VITE_NODE_ENV || process.env.NODE_ENV || 'production'
};

// Path to the frontend .env file
const frontendEnvPath = path.resolve(__dirname, '../frontend/.env');

console.log('🔧 Injecting environment variables for production build...');
console.log('Environment variables to inject:', ENV_VARS);

// Create or update the .env file
let envContent = '';

// Add each environment variable
Object.entries(ENV_VARS).forEach(([key, value]) => {
  if (value) {
    envContent += `${key}=${value}\n`;
    console.log(`✅ ${key}=${value}`);
  } else {
    console.warn(`⚠️  ${key} is not set`);
  }
});

// Write the .env file
try {
  fs.writeFileSync(frontendEnvPath, envContent);
  console.log(`✅ Environment file created at: ${frontendEnvPath}`);
} catch (error) {
  console.error('❌ Failed to create environment file:', error);
  process.exit(1);
}

// Also create a runtime config file for additional safety
const runtimeConfigPath = path.resolve(__dirname, '../frontend/public/config.js');
const runtimeConfig = `
// Runtime configuration for production
window.__APP_CONFIG__ = {
  GOOGLE_CLIENT_ID: "${ENV_VARS.VITE_GOOGLE_CLIENT_ID}",
  API_URL: "${ENV_VARS.VITE_API_URL}",
  NODE_ENV: "${ENV_VARS.VITE_NODE_ENV}",
  BUILD_TIME: "${new Date().toISOString()}"
};
`;

try {
  fs.writeFileSync(runtimeConfigPath, runtimeConfig);
  console.log(`✅ Runtime config created at: ${runtimeConfigPath}`);
} catch (error) {
  console.error('❌ Failed to create runtime config:', error);
}

console.log('🎉 Environment injection completed successfully!');
