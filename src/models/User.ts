import mongoose, { Schema, Document } from 'mongoose';

// Interface for inventory items
export interface InventoryItem {
  itemId: string;
  name: string;
  quantity: number;
  price: number;
}

// Interface for User document
export interface IUser extends Document {
  userId: string;
  wallet: number;
  bank: number;
  inventory: InventoryItem[];
  lastDaily: Date;
  lastWork: Date;
  workStreak: number;
  job: string | null;
  xp: number;
  level: number;
}

// Schema for the User model
const UserSchema: Schema = new Schema({
  userId: { type: String, required: true, unique: true },
  wallet: { type: Number, default: 0 },
  bank: { type: Number, default: 0 },
  inventory: [
    {
      itemId: { type: String, required: true },
      name: { type: String, required: true },
      quantity: { type: Number, default: 1 },
      price: { type: Number, required: true }
    }
  ],
  lastDaily: { type: Date, default: null },
  lastWork: { type: Date, default: null },
  workStreak: { type: Number, default: 0 },
  job: { type: String, default: null },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 }
}, {
  timestamps: true
});

// Create and export the User model
export default mongoose.model<IUser>('User', UserSchema);