import mongoose from 'mongoose';
import { Logger } from './logger';
import dotenv from 'dotenv';

dotenv.config();

export class Database {
  static async connect(): Promise<void> {
    try {
      const mongoURI = process.env.MONGODB_URI;
      
      if (!mongoURI) {
        Logger.warn('MongoDB URI is not defined in environment variables. Database features will be disabled.');
        return;
      }
      
      await mongoose.connect(mongoURI);
      Logger.info('Connected to MongoDB');
    } catch (error) {
      Logger.error('Failed to connect to MongoDB:');
      Logger.error(error as Error);
    }
  }

  static async disconnect(): Promise<void> {
    try {
      await mongoose.disconnect();
      Logger.info('Disconnected from MongoDB');
    } catch (error) {
      Logger.error('Error disconnecting from MongoDB:');
      Logger.error(error as Error);
    }
  }
} 