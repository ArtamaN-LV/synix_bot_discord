import mongoose, { Schema, Document } from 'mongoose';

// Interface for Item document
export interface IItem extends Document {
  itemId: string;
  name: string;
  description: string;
  price: number;
  sellPrice: number;
  emoji: string;
  category: string;
  isLimited: boolean;
  stock?: number;
}

// Schema for the Item model
const ItemSchema: Schema = new Schema({
  itemId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  sellPrice: { type: Number, required: true },
  emoji: { type: String, required: true },
  category: { type: String, required: true },
  isLimited: { type: Boolean, default: false },
  stock: { type: Number }
}, {
  timestamps: true
});

// Create and export the Item model
export default mongoose.model<IItem>('Item', ItemSchema); 