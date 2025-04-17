import { suggestionConfig } from '../commands/misc/suggest';
import { getGuildSuggestionConfig } from '../models/SuggestionConfig';

export class SuggestionManager {
  static async getConfig(guildId: string) {
    try {
      // Try to fetch from database first
      const dbConfig = await getGuildSuggestionConfig(guildId);
      
      if (dbConfig) {
        // Use database config
        return {
          channelId: dbConfig.channelId,
          reviewRoleId: dbConfig.reviewRoleId,
          outcomeChannelId: dbConfig.outcomeChannelId,
          requireApproval: dbConfig.requireApproval
        };
      }
    } catch (error) {
      console.error('Error fetching suggestion config from database:', error);
    }
    
    // Fallback to memory map
    return suggestionConfig.get(guildId) || {
      channelId: process.env.SUGGESTION_CHANNEL_ID,
      reviewRoleId: process.env.SUGGESTION_REVIEW_ROLE_ID,
      outcomeChannelId: process.env.SUGGESTION_OUTCOME_CHANNEL_ID,
      requireApproval: process.env.SUGGESTION_REQUIRE_APPROVAL === 'true'
    };
  }

  static async getOutcomeChannelId(guildId: string): Promise<string | undefined> {
    const config = await this.getConfig(guildId);
    return config.outcomeChannelId || process.env.SUGGESTION_OUTCOME_CHANNEL_ID;
  }
} 