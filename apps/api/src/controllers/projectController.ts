import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Project, Scan, deleteProjectCascading } from '@repo-analyzer/database';
import type { ApiResponse } from '@repo-analyzer/shared';

export async function getProjects(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const projects = await Project.find().sort({ createdAt: -1 }).limit(50).lean();
    return res.json({
      success: true,
      data: projects,
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProjectById(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const projectId = String(req.params.projectId);
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'INVALID_ID', message: 'Invalid project ID format.' },
      });
    }

    const project = await Project.findById(projectId).lean();
    if (!project) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Project not found.' },
      });
    }

    return res.json({
      success: true,
      data: project,
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProjectScans(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const projectId = String(req.params.projectId);
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'INVALID_ID', message: 'Invalid project ID format.' },
      });
    }

    const scans = await Scan.find({ projectId: new mongoose.Types.ObjectId(projectId) })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({
      success: true,
      data: scans,
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteProject(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const projectId = String(req.params.projectId);
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'INVALID_ID', message: 'Invalid project ID format.' },
      });
    }

    const deleted = await deleteProjectCascading(projectId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Project not found.' },
      });
    }

    return res.json({
      success: true,
      data: { message: 'Project and associated scan artifacts deleted successfully.' },
      error: null,
    });
  } catch (error) {
    next(error);
  }
}
