import { ticketConfig } from '../commands/misc/ticket';
import { getGuildTicketConfig } from '../models/TicketConfig';

export class TicketManager {
  static async getConfig(guildId: string) {
    try {
      // Try to fetch from database first
      const dbConfig = await getGuildTicketConfig(guildId);
      
      if (dbConfig) {
        // Use database config
        return {
          categoryId: dbConfig.categoryId,
          supportRoleId: dbConfig.supportRoleId,
          logsChannelId: dbConfig.logsChannelId,
          ticketLimit: dbConfig.ticketLimit
        };
      }
    } catch (error) {
      console.error('Error fetching ticket config from database:', error);
    }
    
    // Fallback to memory map
    return ticketConfig.get(guildId) || {
      categoryId: process.env.TICKET_CATEGORY_ID,
      supportRoleId: process.env.SUPPORT_ROLE_ID,
      logsChannelId: process.env.TICKET_LOGS_CHANNEL,
      ticketLimit: parseInt(process.env.TICKET_LIMIT || '1')
    };
  }

  static async getLogsChannelId(guildId: string): Promise<string | undefined> {
    const config = await this.getConfig(guildId);
    return config.logsChannelId || process.env.TICKET_LOGS_CHANNEL;
  }
} 