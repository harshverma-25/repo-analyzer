import { Router, type IRouter } from 'express';
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
apiRouter.post('/scans', createScan);
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
apiRouter.post('/scans/:scanId/ai/explain', explainScanAI);

// ==========================================
// Projects & Scan History
// ==========================================
apiRouter.get('/projects', getProjects);
apiRouter.get('/projects/:projectId', getProjectById);
apiRouter.get('/projects/:projectId/scans', getProjectScans);
apiRouter.delete('/projects/:projectId', deleteProject);
