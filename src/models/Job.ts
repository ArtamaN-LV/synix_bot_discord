import mongoose, { Schema, Document } from 'mongoose';

// Interface for Job document
export interface IJob extends Document {
  jobId: string;
  name: string;
  description: string;
  salary: {
    min: number;
    max: number;
  };
  xpReward: number;
  failRate: number; // 0-100% chance to fail
  cooldown: number; // in minutes
  requiredLevel: number;
}

// Schema for the Job model
const JobSchema: Schema = new Schema({
  jobId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  salary: {
    min: { type: Number, required: true },
    max: { type: Number, required: true }
  },
  xpReward: { type: Number, required: true },
  failRate: { type: Number, default: 5, min: 0, max: 100 },
  cooldown: { type: Number, default: 30, min: 1 },
  requiredLevel: { type: Number, default: 1, min: 1 }
}, {
  timestamps: true
});

// Create and export the Job model
export default mongoose.model<IJob>('Job', JobSchema); 