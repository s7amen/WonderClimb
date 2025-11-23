import express from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { config } from '../config/env.js';

const router = express.Router();

// Only enable docs in non-production or protect with admin auth
if (config.nodeEnv !== 'production') {
  // Public docs in development
  router.get('/docs', (req, res) => {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const openApiPath = join(__dirname, '../../../specs/001-core-booking-attendance/contracts/openapi.yaml');
      const openApiContent = readFileSync(openApiPath, 'utf8');
      
      res.setHeader('Content-Type', 'text/yaml');
      res.send(openApiContent);
    } catch (error) {
      res.status(500).json({
        error: {
          message: 'Failed to load API documentation',
        },
      });
    }
  });
} else {
  // Protected docs in production (admin only)
  router.get('/docs', authenticate, requireRole('admin'), (req, res) => {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const openApiPath = join(__dirname, '../../../specs/001-core-booking-attendance/contracts/openapi.yaml');
      const openApiContent = readFileSync(openApiPath, 'utf8');
      
      res.setHeader('Content-Type', 'text/yaml');
      res.send(openApiContent);
    } catch (error) {
      res.status(500).json({
        error: {
          message: 'Failed to load API documentation',
        },
      });
    }
  });
}

export default router;

