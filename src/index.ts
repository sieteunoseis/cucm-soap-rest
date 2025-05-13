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