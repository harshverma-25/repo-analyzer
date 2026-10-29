import mongoose, { Schema } from 'mongoose';

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
});

UserSchema.index({ email: 1 }, { unique: true });

export const User = mongoose.model('User', UserSchema);
