import { User } from 'discord.js';

/**
 * Interface for ticket data
 */
export interface TicketData {
  id: string;
  channelId: string;
  userId: string;
  category: string;
  description: string;
  createdAt: Date;
  closed: boolean;
  claimedBy?: string;
}

/**
 * Interface for blacklist entry
 */
export interface BlacklistEntry {
  userId: string;
  reason: string;
  moderatorId: string;
  timestamp: string;
}

/**
 * Interface for ticket configuration
 */
export interface TicketConfig {
  categoryId: string;
  supportRoleId: string;
  logsChannelId?: string;
  ticketLimit: number;
  guildId: string;
} 