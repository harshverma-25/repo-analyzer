import mongoose, { Schema, Document } from 'mongoose';
import type { ScanStatus, ScanStage, ScanSummaryMetrics } from '@repo-analyzer/shared';

export interface IScanDocument extends Document {
  projectId: mongoose.Types.ObjectId;
  commitSha: string;
  requestedRevision?: string;
  status: ScanStatus;
  stage: ScanStage;
  progressPercentage: number;
  analyzerVersion: string;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  summaryMetrics?: ScanSummaryMetrics;
  createdAt: Date;
  updatedAt: Date;
}

const SummaryMetricsSchema = new Schema(
  {
    totalFiles: { type: Number, default: 0 },
    analyzedFiles: { type: Number, default: 0 },
    skippedFiles: { type: Number, default: 0 },
    totalLines: { type: Number, default: 0 },
    codeLines: { type: Number, default: 0 },
    blankLines: { type: Number, default: 0 },
    commentLines: { type: Number, default: 0 },
    endpointCount: { type: Number, default: 0 },
    modelCount: { type: Number, default: 0 },
    securityFindingsCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const ScanSchema = new Schema<IScanDocument>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    commitSha: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    requestedRevision: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed', 'cancelled'],
      default: 'queued',
      index: true,
    },
    stage: {
      type: String,
      enum: [
        'queued',
        'validating',
        'resolving_revision',
        'fetching_tree',
        'analyzing_code',
        'generating_ai_insights',
        'completed',
        'failed',
      ],
      default: 'queued',
    },
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    analyzerVersion: {
      type: String,
      default: '1.0.0',
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    errorMessage: {
      type: String,
    },
    summaryMetrics: {
      type: SummaryMetricsSchema,
    },
  },
  {
    timestamps: true,
  }
);

ScanSchema.index({ projectId: 1, commitSha: 1 });
ScanSchema.index({ projectId: 1, status: 1 });
ScanSchema.index({ createdAt: -1 });

export const Scan = (mongoose.models.Scan as mongoose.Model<IScanDocument>) ||
  mongoose.model<IScanDocument>('Scan', ScanSchema);
