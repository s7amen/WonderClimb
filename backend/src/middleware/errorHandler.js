import pino from 'pino';
import { config } from '../config/env.js';

const logger = pino({ level: config.logLevel });

export const errorHandler = (err, req, res, next) => {
  // Log error details (without sensitive data)
  logger.error({
    err: {
      message: err.message,
      stack: config.nodeEnv === 'development' ? err.stack : undefined,
    },
    path: req.path,
    method: req.method,
    statusCode: err.statusCode || 500,
  });

  // Don't leak error details in production
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 && config.nodeEnv === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(statusCode).json({
    error: {
      message,
      ...(config.nodeEnv === 'development' && { stack: err.stack }),
    },
  });
};

export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

