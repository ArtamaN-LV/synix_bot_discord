import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interface for guild settings document
 */
export interface IGuildSettings extends Document {
  guildId: string;
  prefix?: string;
  welcomeChannelId?: string;
  welcomeMessage?: string;
  logChannelId?: string;
  autoRole?: string;
  levelUpMessage?: string;
  disabledCommands?: string[];
  customCommands?: {
    name: string;
    response: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schema for guild settings
 */
const GuildSettingsSchema = new Schema(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    prefix: {
      type: String,
      maxlength: 5
    },
    welcomeChannelId: String,
    welcomeMessage: String,
    logChannelId: String,
    autoRole: String,
    levelUpMessage: String,
    disabledCommands: [String],
    customCommands: [
      {
        name: String,
        response: String
      }
    ]
  },
  { 
    timestamps: true 
  }
);

/**
 * Model for guild settings
 */
export const SettingsModel = mongoose.model<IGuildSettings>('GuildSettings', GuildSettingsSchema);

/**
 * Initialize a new guild in the database
 * @param guildId The guild ID
 */
export async function initializeGuild(guildId: string): Promise<IGuildSettings> {
  try {
    // Check if guild settings already exist
    const existingSettings = await SettingsModel.findOne({ guildId });
    
    if (existingSettings) {
      return existingSettings;
    }
    
    // Create new guild settings
    const newSettings = new SettingsModel({
      guildId
    });
    
    await newSettings.save();
    return newSettings;
  } catch (error) {
    console.error('Error initializing guild settings:', error);
    throw new Error('Failed to initialize guild settings');
  }
} 