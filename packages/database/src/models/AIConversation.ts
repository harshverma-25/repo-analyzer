import mongoose, { Schema, Document } from 'mongoose';

export interface IAIConversationDocument extends Document {
  scanId: mongoose.Types.ObjectId;
  question: string;
  answer: string;
  referencedFiles: string[];
  createdAt: Date;
}

const AIConversationSchema = new Schema<IAIConversationDocument>(
  {
    scanId: {
      type: Schema.Types.ObjectId,
      ref: 'Scan',
      required: true,
      index: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
    },
    referencedFiles: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

AIConversationSchema.index({ scanId: 1, createdAt: -1 });

export const AIConversation =
  (mongoose.models.AIConversation as mongoose.Model<IAIConversationDocument>) ||
  mongoose.model<IAIConversationDocument>('AIConversation', AIConversationSchema);
