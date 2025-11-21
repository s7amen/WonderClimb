import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { httpLogger } from './middleware/logging.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import apiRoutes from './routes/index.js';
import pino from 'pino';

const logger = pino({ level: config.logLevel });

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.nodeEnv === 'production' 
    ? process.env.CORS_ORIGIN?.split(',') || false
    : true, // Allow all origins in development
  credentials: true,
}));

// Middleware
app.use(httpLogger);
app.use(apiRateLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (for test page)
app.use(express.static('public'));

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'WonderClimb API',
    version: '0.1.0',
    docs: '/api/v1/docs',
  });
});

// API routes
app.use('/api/v1', apiRoutes);

// Error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await connectDB();
    
    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await disconnectDB();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await disconnectDB();
  process.exit(0);
});

// Only start server if not in test environment
if (config.nodeEnv !== 'test') {
  startServer();
}

export default app;

