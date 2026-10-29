import mongoose, { Schema, Document } from 'mongoose';

export type ArtifactType =
  | 'statistics'
  | 'technologies'
  | 'endpoints'
  | 'database_models'
  | 'architecture_graph'
  | 'security_findings'
  | 'folder_tree'
  | 'ai_summary';

export interface IScanArtifactDocument extends Document {
  scanId: mongoose.Types.ObjectId;
  artifactType: ArtifactType;
  data: any;
  createdAt: Date;
}

const ScanArtifactSchema = new Schema<IScanArtifactDocument>(
  {
    scanId: {
      type: Schema.Types.ObjectId,
      ref: 'Scan',
      required: true,
      index: true,
    },
    artifactType: {
      type: String,
      required: true,
      enum: [
        'statistics',
        'technologies',
        'endpoints',
        'database_models',
        'architecture_graph',
        'security_findings',
        'folder_tree',
        'ai_summary',
      ],
    },
    data: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

ScanArtifactSchema.index({ scanId: 1, artifactType: 1 }, { unique: true });

export const ScanArtifact =
  (mongoose.models.ScanArtifact as mongoose.Model<IScanArtifactDocument>) ||
  mongoose.model<IScanArtifactDocument>('ScanArtifact', ScanArtifactSchema);
