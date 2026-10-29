import { Router, type IRouter } from 'express';
import rateLimit from 'express-rate-limit';
import { isDatabaseConnected } from '@repo-analyzer/database';
import { getAIProvider } from '@repo-analyzer/ai';
import {
  createScan,
  getScanStatus,
  getScanReport,
  getScanArtifactByType,
  explainScanAI,
} from '../controllers/scanController.js';
import {
  getProjects,
  getProjectById,
  getProjectScans,
  deleteProject,
} from '../controllers/projectController.js';

export const apiRouter: IRouter = Router();

// ==========================================
// Rate Limiters for Security & Abuse Prevention
// ==========================================
const scanCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 scan requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many repository scan requests created from this IP. Please try again after 15 minutes.',
    },
  },
});

const aiExplainLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 AI queries per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many AI explanation queries submitted. Please try again in a few minutes.',
    },
  },
});

// ==========================================
// Health & Diagnostics
// ==========================================
apiRouter.get('/health', (req, res) => {
  const aiProvider = getAIProvider();
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: isDatabaseConnected() ? 'connected' : 'disconnected',
      aiProvider: aiProvider.name,
      geminiConfigured: aiProvider.isAvailable(),
    },
    error: null,
  });
});

// ==========================================
// Scan Pipeline
// ==========================================
apiRouter.post('/scans', scanCreateLimiter, createScan);
apiRouter.get('/scans/:scanId', getScanStatus);
apiRouter.get('/scans/:scanId/report', getScanReport);

// Granular Artifacts
apiRouter.get('/scans/:scanId/stats', getScanArtifactByType('statistics'));
apiRouter.get('/scans/:scanId/technologies', getScanArtifactByType('technologies'));
apiRouter.get('/scans/:scanId/endpoints', getScanArtifactByType('endpoints'));
apiRouter.get('/scans/:scanId/architecture', getScanArtifactByType('architecture_graph'));
apiRouter.get('/scans/:scanId/folder-tree', getScanArtifactByType('folder_tree'));
apiRouter.get('/scans/:scanId/models', getScanArtifactByType('database_models'));
apiRouter.get('/scans/:scanId/security', getScanArtifactByType('security_findings'));

// Grounded AI Exploration
apiRouter.post('/scans/:scanId/ai/explain', aiExplainLimiter, explainScanAI);

// ==========================================
// Projects & Scan History
// ==========================================
apiRouter.get('/projects', getProjects);
apiRouter.get('/projects/:projectId', getProjectById);
apiRouter.get('/projects/:projectId/scans', getProjectScans);
apiRouter.delete('/projects/:projectId', deleteProject);
