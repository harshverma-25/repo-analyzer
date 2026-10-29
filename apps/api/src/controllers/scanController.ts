import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Project, Scan, ScanArtifact, AIConversation } from '@repo-analyzer/database';
import {
  CreateScanRequestSchema,
  AIExplainRequestSchema,
  type ApiResponse,
  type FullScanReport,
} from '@repo-analyzer/shared';
import { parseAndValidateGitHubUrl } from '@repo-analyzer/analyzer';
import { scanQueue } from '../jobs/scanQueue.js';
import { getAIProvider } from '@repo-analyzer/ai';

export async function createScan(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const validated = CreateScanRequestSchema.parse(req.body);
    const parsed = parseAndValidateGitHubUrl(validated.repoUrl);

    // Find or create Project
    let project = await Project.findOne({
      owner: parsed.owner.toLowerCase(),
      repo: parsed.repo.toLowerCase(),
    });

    if (!project) {
      project = await Project.create({
        owner: parsed.owner.toLowerCase(),
        repo: parsed.repo.toLowerCase(),
        canonicalUrl: parsed.canonicalUrl,
        displayName: parsed.displayName,
        defaultBranch: validated.branch || 'main',
      });
    }

    // Create Scan document
    const scan = await Scan.create({
      projectId: project._id,
      commitSha: 'pending',
      requestedRevision: validated.branch || 'HEAD',
      status: 'queued',
      stage: 'queued',
      progressPercentage: 0,
      analyzerVersion: '1.0.0',
    });

    // Enqueue scan execution asynchronously
    scanQueue.enqueue({
      scanId: scan._id.toString(),
      projectId: project._id.toString(),
      repoUrl: parsed.canonicalUrl,
      branch: validated.branch,
    });

    return res.status(202).json({
      success: true,
      data: {
        scanId: scan._id.toString(),
        status: scan.status,
        stage: scan.stage,
        progressPercentage: scan.progressPercentage,
        message: 'Scan has been successfully enqueued.',
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

export async function getScanStatus(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const scanId = String(req.params.scanId);
    if (!mongoose.Types.ObjectId.isValid(scanId)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'INVALID_ID', message: 'Invalid scan ID format.' },
      });
    }

    const scan = await Scan.findById(scanId);
    if (!scan) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Scan not found.' },
      });
    }

    return res.json({
      success: true,
      data: {
        scanId: scan._id.toString(),
        status: scan.status,
        stage: scan.stage,
        progressPercentage: scan.progressPercentage,
        commitSha: scan.commitSha,
        errorMessage: scan.errorMessage,
        startedAt: scan.startedAt,
        completedAt: scan.completedAt,
        summaryMetrics: scan.summaryMetrics,
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

export async function getScanReport(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const scanId = String(req.params.scanId);
    if (!mongoose.Types.ObjectId.isValid(scanId)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'INVALID_ID', message: 'Invalid scan ID format.' },
      });
    }

    const scan = await Scan.findById(scanId);
    if (!scan) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Scan not found.' },
      });
    }

    const project = await Project.findById(scan.projectId);
    const artifacts = await ScanArtifact.find({ scanId: scan._id });

    const artifactMap: Record<string, any> = {};
    for (const art of artifacts) {
      artifactMap[art.artifactType] = art.data;
    }

    const fullReport: FullScanReport = {
      scan: {
        id: scan._id.toString(),
        projectId: scan.projectId.toString(),
        commitSha: scan.commitSha,
        requestedRevision: scan.requestedRevision,
        status: scan.status,
        stage: scan.stage,
        progressPercentage: scan.progressPercentage,
        analyzerVersion: scan.analyzerVersion,
        startedAt: scan.startedAt?.toISOString(),
        completedAt: scan.completedAt?.toISOString(),
        errorMessage: scan.errorMessage,
        summaryMetrics: scan.summaryMetrics,
        createdAt: scan.createdAt.toISOString(),
        updatedAt: scan.updatedAt.toISOString(),
      },
      project: {
        id: project ? project._id.toString() : '',
        owner: project?.owner || '',
        repo: project?.repo || '',
        canonicalUrl: project?.canonicalUrl || '',
        displayName: project?.displayName || '',
        defaultBranch: project?.defaultBranch,
        createdAt: project ? project.createdAt.toISOString() : '',
        updatedAt: project ? project.updatedAt.toISOString() : '',
      },
      statistics: artifactMap['statistics'] || {
        totalFiles: 0,
        analyzedFiles: 0,
        skippedFiles: 0,
        totalLines: 0,
        codeLines: 0,
        blankLines: 0,
        commentLines: 0,
        languages: [],
        largestFiles: [],
        skippedReasons: {},
      },
      technologies: artifactMap['technologies'] || [],
      endpoints: artifactMap['endpoints'] || [],
      databaseModels: artifactMap['database_models'] || [],
      architectureGraph: artifactMap['architecture_graph'] || { nodes: [], edges: [] },
      securityFindings: artifactMap['security_findings'] || [],
      folderTree: artifactMap['folder_tree'] || { name: 'root', path: '', type: 'directory', children: [] },
      aiSummary: artifactMap['ai_summary'] || {
        overview: 'Analysis complete.',
        keyFeatures: [],
        architectureOverview: '',
        moduleHighlights: [],
        suggestedExplorationPaths: [],
        securitySummary: '',
      },
    };

    return res.json({
      success: true,
      data: fullReport,
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

export function getScanArtifactByType(artifactType: string) {
  return async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const scanId = String(req.params.scanId);
      if (!mongoose.Types.ObjectId.isValid(scanId)) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { code: 'INVALID_ID', message: 'Invalid scan ID format.' },
        });
      }

      const artifact = await ScanArtifact.findOne({
        scanId: new mongoose.Types.ObjectId(scanId),
        artifactType,
      });

      if (!artifact) {
        return res.status(404).json({
          success: false,
          data: null,
          error: { code: 'NOT_FOUND', message: `Artifact "${artifactType}" not found for this scan.` },
        });
      }

      return res.json({
        success: true,
        data: artifact.data,
        error: null,
      });
    } catch (error) {
      next(error);
    }
  };
}

export async function explainScanAI(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const scanId = String(req.params.scanId);
    const validated = AIExplainRequestSchema.parse(req.body);

    if (!mongoose.Types.ObjectId.isValid(scanId)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'INVALID_ID', message: 'Invalid scan ID format.' },
      });
    }

    const scan = await Scan.findById(scanId);
    if (!scan) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Scan not found.' },
      });
    }

    const project = await Project.findById(scan.projectId);
    const artifacts = await ScanArtifact.find({ scanId: scan._id });
    const artifactMap: Record<string, any> = {};
    for (const art of artifacts) {
      artifactMap[art.artifactType] = art.data;
    }

    const aiProvider = getAIProvider();
    const explanation = await aiProvider.explainQuestion(validated.question, {
      repoName: project?.displayName || 'Repository',
      commitSha: scan.commitSha,
      statistics: artifactMap['statistics'] || { totalFiles: 0, codeLines: 0, languages: [], largestFiles: [] },
      technologies: artifactMap['technologies'] || [],
      endpoints: artifactMap['endpoints'] || [],
      databaseModels: artifactMap['database_models'] || [],
      securityFindings: artifactMap['security_findings'] || [],
    });

    // Save conversation to database
    await AIConversation.create({
      scanId: scan._id,
      question: validated.question,
      answer: explanation.answer,
      referencedFiles: explanation.referencedFiles,
    });

    return res.json({
      success: true,
      data: explanation,
      error: null,
    });
  } catch (error) {
    next(error);
  }
}
