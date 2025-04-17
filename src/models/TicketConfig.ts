import mongoose, { Schema, Document } from 'mongoose';
import { TicketConfig } from '../types/ticket';

/**
 * Interface for Ticket Configuration document
 */
export interface ITicketConfig extends Document, TicketConfig {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schema for ticket configurations
 */
const TicketConfigSchema = new Schema(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    categoryId: {
      type: String,
      required: true
    },
    supportRoleId: {
      type: String,
      required: true
    },
    logsChannelId: {
      type: String
    },
    ticketLimit: {
      type: Number,
      default: 1
    }
  },
  { 
    timestamps: true 
  }
);

/**
 * Model for ticket configurations
 */
export const TicketConfigModel = mongoose.model<ITicketConfig>('TicketConfig', TicketConfigSchema);

/**
 * Get ticket configuration for a guild
 * @param guildId Guild ID
 */
export async function getGuildTicketConfig(guildId: string): Promise<ITicketConfig | null> {
  try {
    return await TicketConfigModel.findOne({ guildId });
  } catch (error) {
    console.error('Error fetching guild ticket config:', error);
    return null;
  }
}

/**
 * Save ticket configuration for a guild
 * @param guildId Guild ID
 * @param config Configuration object
 */
export async function saveGuildTicketConfig(
  guildId: string, 
  config: {
    categoryId: string;
    supportRoleId: string;
    logsChannelId?: string;
    ticketLimit: number;
  }
): Promise<ITicketConfig | null> {
  try {
    return await TicketConfigModel.findOneAndUpdate(
      { guildId }, 
      { 
        guildId,
        ...config
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );
  } catch (error) {
    console.error('Error saving guild ticket config:', error);
    return null;
  }
} 