import pino from 'pino';
import pinoHttp from 'pino-http';
import { config } from '../config/env.js';

const logger = pino({ level: config.logLevel });

// Create pino-http logger middleware
export const httpLogger = pinoHttp({
  logger,
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      // Don't log sensitive headers
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: (err) => ({
      type: err.type,
      message: err.message,
      // Don't log stack traces or sensitive data
    }),
  },
  // Don't log request/response bodies to avoid logging sensitive data
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 400 && res.statusCode < 500) {
      return 'warn';
    } else if (res.statusCode >= 500 || err) {
      return 'error';
    }
    return 'info';
  },
});

export default logger;

