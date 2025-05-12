// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createDynamicRoutes } from './controllers/dynamic.controller';
import { errorHandler } from './middleware/error.middleware';
import { setupSwagger } from './utils/api-explorer';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { json } from 'body-parser';

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
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Enable CORS
app.use(cors());

// Add middleware to sanitize JSON for apply* endpoints before parsing
app.use('/api/axl/apply*', (req, res, next) => {
  // Only process POST and PUT requests with bodies
  if ((req.method === 'POST' || req.method === 'PUT') && req.headers['content-type']?.includes('application/json')) {
    let data = '';

    req.on('data', chunk => {
      data += chunk;
    });

    req.on('end', () => {
      // Skip empty bodies
      if (!data.trim()) {
        req.body = {};
        return next();
      }

      // Log the raw body for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log(`Raw apply* endpoint request body: ${data}`);
      }

      // Pre-process JSON to handle common syntax errors
      let cleanedJson: string = data
        // Remove comments (both single line // and multi-line /* */)
        .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
        // Remove trailing commas in objects
        .replace(/,\s*}/g, '}')
        // Remove trailing commas in arrays
        .replace(/,\s*\]/g, ']')
        // Replace single quotes with double quotes for properties and string values
        .replace(/'([^']*?)'/g, '"$1"')
        // Replace single-quoted property names with double quotes
        .replace(/(\w+)'/g, '"$1"')
        .replace(/'(\w+)/g, '"$1')
        // Ensure property names are double-quoted (this is a common error at position 53)
        .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')
        // Fix boolean values that might be capitalized (True/False)
        .replace(/":\s*True\b/g, '": true')
        .replace(/":\s*False\b/g, '": false')
        // Handle unquoted string values (riskier, but useful for apply endpoints)
        .replace(/":\s*([a-zA-Z0-9_\-]+)(\s*[,}])/g, '": "$1"$2');

      // Log the cleaned JSON (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log(`Cleaned apply* endpoint JSON: ${cleanedJson}`);
      }

      try {
        // Parse the cleaned JSON
        req.body = JSON.parse(cleanedJson);
        next();
      } catch (error) {
        // Safely access error message for any error type
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`JSON parse error in apply* endpoint: ${errorMessage}`);

        // Create a more descriptive error with the original and cleaned JSON
        const enhancedError: any = new Error(`JSON parsing error: ${errorMessage}`);
        enhancedError.originalBody = data;
        enhancedError.cleanedBody = cleanedJson;
        enhancedError.parseError = error;

        // Still failed to parse JSON, pass enhanced error to next middleware
        next(enhancedError);
      }
    });
  } else {
    next();
  }
});

// Special JSON parser for apply* endpoints with relaxed JSON parsing
// This is a backup to the custom middleware above
app.use('/api/axl/apply*', express.json({
  strict: false,  // Allow non-standard JSON like trailing commas
  limit: '10mb'   // Increased size limit for large payloads
}));

// Normal body parser for all other endpoints
app.use(express.json());

// Setup API Explorer as the API documentation endpoint
console.log('Setting up API Explorer...');
setupSwagger(app);

// Add endpoint to get the latest API spec in JSON format
app.get('/api-docs.json', (req, res) => {
  const swaggerFile = JSON.parse(fs.readFileSync(path.join(__dirname, '../swagger-output.json'), 'utf8'));
  res.json(swaggerFile);
});

// Basic health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.status(200).send({ status: 'UP' });
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
  console.log(`Server is running on port ${PORT}`);
  console.log(`API Documentation:`);
  console.log(`- http://localhost:${PORT}/api-explorer (API Explorer UI)`);
  console.log(`- http://localhost:${PORT}/api-docs.json (Raw JSON)`);
  console.log(`Debug Routes: http://localhost:${PORT}/api/debug/routes`);
});

export default app;