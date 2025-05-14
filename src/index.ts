// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createDynamicRoutes } from './controllers/dynamic.controller';
import { errorHandler } from './middleware/error.middleware';
import { requireAuth, startAuthenticationCheck, isAuthenticated, authError } from './middleware/auth.middleware';
import { setupSwagger } from './utils/api-explorer';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { json } from 'body-parser';
import { debugLog } from './utils/debug';

// Define interfaces for health check response
interface AuthenticationStatus {
  status: 'SUCCESS' | 'FAILED';
  cucmServer?: string;
  cucmVersion?: string;
  error?: string;
}

interface HealthResponse {
  status: string;
  authentication: AuthenticationStatus;
  timestamp: string;
}

const app = express();
const PORT = process.env.PORT || 3000;

function resolvePath(relativePath: string): string {
  // In production, __dirname points to the dist directory
  const baseDir = process.env.NODE_ENV === 'production'
    ? path.join(__dirname, '..')
    : process.cwd();

  return path.join(baseDir, relativePath);
}

// Configure Helmet with relaxed settings for Swagger
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    originAgentCluster: false,
  })
);

// Remove headers that require secure contexts when running over HTTP
app.use((req, res, next) => {
  // Check if we're in production and running over HTTP
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    res.removeHeader('Cross-Origin-Opener-Policy');
  }
  next();
});

// Enable CORS
app.use(cors());

// Body parser for all endpoints
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Apply authentication middleware to protect routes
app.use(requireAuth);

// Start periodic authentication checks
startAuthenticationCheck();

// Setup API Explorer as the API documentation endpoint
debugLog('Setting up API Explorer...', null, 'setup');
setupSwagger(app);

// Add endpoint to get the latest API spec in JSON format
app.get('/api-docs.json', (req, res) => {
  const swaggerFile = JSON.parse(fs.readFileSync(path.join(__dirname, '../swagger-output.json'), 'utf8'));
  res.json(swaggerFile);
});

// Enhanced health check endpoint with authentication status
app.get('/health', async (req: express.Request, res: express.Response) => {
  // Trigger a fresh authentication check
  try {
    // Wait for authentication check to complete
    await import('./middleware/auth.middleware').then(auth => auth.checkAuthentication());
  } catch (error) {
    // We'll handle the result below regardless of success or failure
    debugLog('Health check triggered authentication refresh', error, 'health');
  }
  
  // Now use the updated authentication state
  const authResponse: HealthResponse = {
    status: 'UP',
    authentication: {
      status: isAuthenticated ? 'SUCCESS' : 'FAILED',
      cucmServer: process.env.CUCM_HOST,
      cucmVersion: process.env.CUCM_VERSION
    },
    timestamp: new Date().toISOString()
  };
  
  // If authentication failed, add the error details
  if (!isAuthenticated && authError) {
    authResponse.authentication.error = authError;
  }
  
  res.status(200).json(authResponse);
});

// Redirect root URL to api-explorer endpoint
app.get('/', (req: express.Request, res: express.Response) => {
  res.redirect('/api-explorer');
});

// Redirect old api-docs URL to api-explorer endpoint
app.get('/api-docs', (req: express.Request, res: express.Response) => {
  res.redirect('/api-explorer');
});


// Set up dynamic routes
console.log('Creating dynamic routes...');
createDynamicRoutes(app).catch(err => {
  console.error('Failed to create dynamic routes:', err);
});

// Error handling middleware
app.use(function(err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
  errorHandler(err, req, res, next);
});

// Start the server
app.listen(PORT, () => {
  debugLog(`Server is running on port ${PORT}`, null, 'setup');
  debugLog(`API Documentation:`, null, 'setup');
  debugLog(`- http://localhost:${PORT}/api-explorer (API Explorer UI)`, null, 'setup');
  debugLog(`- http://localhost:${PORT}/api-docs.json (Raw JSON)`, null, 'setup');
  debugLog(`Debug Routes: http://localhost:${PORT}/api/debug/routes`, null, 'setup');
  
  // Keep one console.log for immediate visibility in all environments
  console.log(`🚀 Server started on port ${PORT}, API Explorer at http://localhost:${PORT}/api-explorer`);
});

export default app;