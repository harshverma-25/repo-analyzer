import mongoose, { Schema, Document } from 'mongoose';

export interface IProjectDocument extends Document {
  owner: string;
  repo: string;
  canonicalUrl: string;
  displayName: string;
  defaultBranch?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProjectDocument>(
  {
    owner: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    repo: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    canonicalUrl: {
      type: String,
      required: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    defaultBranch: {
      type: String,
      trim: true,
      default: 'main',
    },
  },
  {
    timestamps: true,
  }
);

ProjectSchema.index({ owner: 1, repo: 1 }, { unique: true });
ProjectSchema.index({ canonicalUrl: 1 });
ProjectSchema.index({ createdAt: -1 });

export const Project = (mongoose.models.Project as mongoose.Model<IProjectDocument>) ||
  mongoose.model<IProjectDocument>('Project', ProjectSchema);
