import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config/index.js';
import { connectDatabase, disconnectDatabase } from '@repo-analyzer/database';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { scanQueue } from './jobs/scanQueue.js';

export const app: Express = express();

// Security Hardening: Disable Express signature and attach security headers
app.disable('x-powered-by');
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Performance: Response compression for JSON payloads
app.use(compression());

// Middlewares
const allowedOrigins = config.corsOrigin === '*'
  ? true
  : Array.from(new Set([
      ...config.corsOrigin.split(',').map((s) => s.trim()).filter(Boolean),
      'http://localhost:3000',
    ]));

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Request body limits bounded to 1mb for DoS prevention
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 30-second request timeout middleware
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        data: null,
        error: { code: 'REQUEST_TIMEOUT', message: 'Request timed out after 30 seconds.' },
      });
    }
  });
  next();
});

// Request logging in development
if (config.nodeEnv !== 'test') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[API] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });
}

// Mount REST API
app.use('/api/v1', apiRouter);

// Centralized Error Handler
app.use(errorHandler);

// Server startup
let server: any;

export async function startServer() {
  try {
    console.log(`[Server] Connecting to MongoDB at ${config.mongodbUri}...`);
    await connectDatabase(config.mongodbUri);

    // Reconcile any scans that were interrupted by a prior server reboot
    await scanQueue.reconcileInterruptedScans();

    server = app.listen(config.port, () => {
      console.log(`[Server] Repo Analyzer API listening on port ${config.port} (${config.nodeEnv})`);
      console.log(`[Server] Health check endpoint: http://localhost:${config.port}/api/v1/health`);
    });

    return server;
  } catch (error) {
    console.error('[Server] Critical failure during startup:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[Server] Gracefully shutting down...');
  if (server) {
    server.close();
  }
  await disconnectDatabase();
  process.exit(0);
});

// Auto-start when executed directly
if (process.env.NODE_ENV !== 'test') {
  startServer();
}
