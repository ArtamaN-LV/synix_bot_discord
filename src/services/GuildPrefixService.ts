import { SettingsModel } from '../models/settingsModel';

// Default prefix to use if no custom prefix is set
const DEFAULT_PREFIX = '!';

/**
 * Get the command prefix for a guild
 * @param guildId The guild ID
 * @returns The guild's prefix or the default prefix
 */
export async function getGuildPrefix(guildId: string): Promise<string> {
  try {
    // Try to find the guild settings in the database
    const guildSettings = await SettingsModel.findOne({ guildId });
    
    // If guild settings exist and a prefix is set, return it
    if (guildSettings && guildSettings.prefix) {
      return guildSettings.prefix;
    }
    
    // Otherwise, return the default prefix
    return DEFAULT_PREFIX;
  } catch (error) {
    console.error('Error getting guild prefix:', error);
    return DEFAULT_PREFIX;
  }
}

/**
 * Set the command prefix for a guild
 * @param guildId The guild ID
 * @param newPrefix The new prefix to set
 */
export async function setGuildPrefix(guildId: string, newPrefix: string): Promise<void> {
  try {
    // Upsert the guild settings (update if exists, create if not)
    await SettingsModel.findOneAndUpdate(
      { guildId },
      { $set: { prefix: newPrefix } },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Error setting guild prefix:', error);
    throw new Error('Failed to set guild prefix');
  }
}

/**
 * Reset a guild's prefix to the default
 * @param guildId The guild ID
 */
export async function resetGuildPrefix(guildId: string): Promise<void> {
  try {
    // Find the guild settings
    const guildSettings = await SettingsModel.findOne({ guildId });
    
    if (guildSettings) {
      // Remove the prefix field
      guildSettings.prefix = undefined;
      await guildSettings.save();
    }
  } catch (error) {
    console.error('Error resetting guild prefix:', error);
    throw new Error('Failed to reset guild prefix');
  }
} 