import { Request, Response, NextFunction } from 'express';
import axlService from 'cisco-axl';
import { axlConfig } from '../config/axl.config';
import { debugLog } from '../utils/debug';

// Store authentication state - make these exports so they can be accessed from other files
export let isAuthenticated = false;
export let authError: string | null = null;
export let lastCheckTime = 0;
export const AUTH_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Checks if AXL authentication is working
 * @returns Promise that resolves to true if authenticated, otherwise rejects with error
 */
export async function checkAuthentication(): Promise<boolean> {
  // Don't recheck too frequently - cache the result for 5 minutes
  const now = Date.now();
  if (isAuthenticated && (now - lastCheckTime < AUTH_CACHE_DURATION)) {
    debugLog('Using cached authentication status (success)', null, 'auth');
    return Promise.resolve(true);
  }

  if (!axlConfig.host || !axlConfig.user || !axlConfig.pass) {
    authError = 'Missing AXL configuration (host, user, or password)';
    isAuthenticated = false;
    return Promise.reject(new Error(authError));
  }

  try {
    debugLog('Testing AXL authentication...', null, 'auth');
    
    // Create a new AXL service instance
    const axlClient = new axlService(axlConfig.host, axlConfig.user, axlConfig.pass, axlConfig.version);
    
    // Test authentication
    await axlClient.testAuthentication();
    
    // If successful, update status
    debugLog('AXL authentication successful', null, 'auth');
    isAuthenticated = true;
    authError = null;
    lastCheckTime = now;
    return true;
  } catch (error: any) {
    // If failed, update status
    isAuthenticated = false;
    authError = error.message || 'Unknown authentication error';
    debugLog(`AXL authentication failed: ${authError}`, error, 'auth');
    return Promise.reject(error);
  }
}

/**
 * Middleware to verify AXL authentication before allowing access to protected routes
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Health check endpoint should always be accessible regardless of auth status
  if (req.path === '/health') {
    // Force recheck for health endpoint, but don't block it
    lastCheckTime = 0;
    return next();
  }
  
  // Check routes that should be protected
  const protectedRoutes = ['/api-explorer', '/api-docs.json', '/api/axl/'];
  const isProtectedRoute = protectedRoutes.some(route => 
    req.path === route || req.path.startsWith(route));
  
  // Skip auth check for non-protected routes
  if (!isProtectedRoute) {
    return next();
  }

  checkAuthentication()
    .then(() => {
      // Authentication successful, proceed
      next();
    })
    .catch(error => {
      // Authentication failed
      // For API calls, return JSON error
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({
          error: 'AUTHENTICATION_FAILED',
          message: `AXL authentication failed: ${authError}`,
          statusCode: 401,
          serverInfo: `${axlConfig.host} (version ${axlConfig.version})`,
        });
      }
      
      // For Swagger UI or API Explorer, show error page
      const errorHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Authentication Error - Cisco AXL REST API</title>
        <link rel="icon" href="/favicon.ico" type="image/x-icon">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
          }
          .error-container {
            background-color: #f8f9fa;
            border-left: 5px solid #dc3545;
            padding: 20px;
            border-radius: 4px;
            margin-bottom: 20px;
          }
          h1 {
            color: #333;
            margin-top: 0;
          }
          h2 {
            color: #dc3545;
            margin-top: 0;
          }
          pre {
            background-color: #f1f1f1;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            font-family: 'Monaco', 'Menlo', 'Consolas', 'Courier New', monospace;
          }
          .btn {
            display: inline-block;
            background-color: #4990e2;
            color: white;
            padding: 10px 15px;
            text-decoration: none;
            border-radius: 4px;
            margin-right: 10px;
            margin-top: 20px;
          }
          .btn:hover {
            background-color: #3a7fd5;
          }
          .cisco-logo {
            max-width: 100px;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <img src="/logo.png" alt="Cisco Logo" class="cisco-logo">
        <div class="error-container">
          <h1>Authentication Error</h1>
          <h2>Cannot connect to CUCM server</h2>
          <p>The API could not authenticate with the Cisco Unified Communications Manager server. Please check your connection and credentials.</p>
          
          <h3>Error Details:</h3>
          <pre>${authError || 'Unknown error'}</pre>
          
          <h3>Configuration:</h3>
          <pre>CUCM Host: ${axlConfig.host}
CUCM Version: ${axlConfig.version}
CUCM User: ${axlConfig.user}</pre>
        </div>
        
        <p>Please verify:</p>
        <ul>
          <li>The CUCM host is reachable and AXL service is enabled</li>
          <li>The credentials provided are correct</li>
          <li>The AXL version matches the CUCM server version</li>
          <li>Network connectivity is available between this application and the CUCM server</li>
        </ul>
        
        <a href="/health" class="btn">Check Connection Status</a>
        <a href="/" class="btn">Retry</a>
      </body>
      </html>
      `;
      
      res.status(401).send(errorHtml);
    });
}

// Periodic authentication check
export function startAuthenticationCheck() {
  // Check authentication every 5 minutes
  setInterval(() => {
    checkAuthentication()
      .then(() => {
        debugLog('Periodic authentication check: Success', null, 'auth');
      })
      .catch(error => {
        debugLog('Periodic authentication check: Failed', error, 'auth');
      });
  }, AUTH_CACHE_DURATION);
  
  // Initial check
  checkAuthentication()
    .then(() => {
      debugLog('Initial authentication check: Success', null, 'auth');
    })
    .catch(error => {
      debugLog('Initial authentication check: Failed', error, 'auth');
    });
}