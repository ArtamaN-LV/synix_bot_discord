import { ReportSettings } from '../models/ReportSettings';
import { Logger } from '../utils/logger';

export class ReportService {
  /**
   * Get the report channel ID for a guild
   */
  static async getReportChannel(guildId: string): Promise<string | null> {
    try {
      const settings = await ReportSettings.findOne({ guildId });
      return settings?.reportChannelId || null;
    } catch (error) {
      Logger.error(`Error getting report channel for guild ${guildId}: ${error}`);
      return null;
    }
  }

  /**
   * Set the report channel ID for a guild
   */
  static async setReportChannel(guildId: string, channelId: string): Promise<boolean> {
    try {
      await ReportSettings.findOneAndUpdate(
        { guildId },
        { $set: { reportChannelId: channelId } },
        { upsert: true, new: true }
      );
      return true;
    } catch (error) {
      Logger.error(`Error setting report channel for guild ${guildId}: ${error}`);
      return false;
    }
  }
} 