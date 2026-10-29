export * from './connection.js';
export * from './models/Project.js';
export * from './models/Scan.js';
export * from './models/ScanArtifact.js';
export * from './models/AIConversation.js';

import mongoose from 'mongoose';
import { Project } from './models/Project.js';
import { Scan } from './models/Scan.js';
import { ScanArtifact } from './models/ScanArtifact.js';
import { AIConversation } from './models/AIConversation.js';

/**
 * Cascades deletion of a project, its scans, all scan artifacts, and conversations.
 */
export async function deleteProjectCascading(projectId: string): Promise<boolean> {
  const pId = new mongoose.Types.ObjectId(projectId);
  
  // Find all scans for this project
  const scans = await Scan.find({ projectId: pId }).select('_id');
  const scanIds = scans.map((s) => s._id);

  if (scanIds.length > 0) {
    // Delete all scan artifacts
    await ScanArtifact.deleteMany({ scanId: { $in: scanIds } });
    // Delete all conversations
    await AIConversation.deleteMany({ scanId: { $in: scanIds } });
    // Delete all scans
    await Scan.deleteMany({ _id: { $in: scanIds } });
  }

  // Delete project
  const res = await Project.deleteOne({ _id: pId });
  return (res.deletedCount || 0) > 0;
}
