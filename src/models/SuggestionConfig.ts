import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interface for Suggestion Configuration document
 */
export interface ISuggestionConfig extends Document {
  guildId: string;
  channelId: string;
  reviewRoleId?: string;
  outcomeChannelId?: string;
  requireApproval?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schema for suggestion configurations
 */
const SuggestionConfigSchema = new Schema(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    channelId: {
      type: String,
      required: true
    },
    reviewRoleId: {
      type: String
    },
    outcomeChannelId: {
      type: String
    },
    requireApproval: {
      type: Boolean,
      default: false
    }
  },
  { 
    timestamps: true 
  }
);

/**
 * Model for suggestion configurations
 */
export const SuggestionConfigModel = mongoose.model<ISuggestionConfig>('SuggestionConfig', SuggestionConfigSchema);

/**
 * Get or create suggestion configuration for a guild
 * @param guildId Guild ID
 */
export async function getGuildSuggestionConfig(guildId: string): Promise<ISuggestionConfig | null> {
  try {
    return await SuggestionConfigModel.findOne({ guildId });
  } catch (error) {
    console.error('Error fetching guild suggestion config:', error);
    return null;
  }
}

/**
 * Save suggestion configuration for a guild
 * @param guildId Guild ID
 * @param config Configuration object
 */
export async function saveGuildSuggestionConfig(
  guildId: string, 
  config: {
    channelId: string;
    reviewRoleId?: string;
    outcomeChannelId?: string;
    requireApproval?: boolean;
  }
): Promise<ISuggestionConfig | null> {
  try {
    return await SuggestionConfigModel.findOneAndUpdate(
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
    console.error('Error saving guild suggestion config:', error);
    return null;
  }
} 