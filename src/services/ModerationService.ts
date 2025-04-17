import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger';

/**
 * Interface for a warning object
 */
export interface Warning {
  id: string;
  userId: string;
  guildId: string;
  moderatorId: string;
  reason: string;
  timestamp: number;
}

/**
 * Service for handling moderation actions like warnings
 */
export class ModerationService {
  // In-memory storage for warnings
  private static warnings: Warning[] = [];
  
  /**
   * Add a warning to a user
   * @param guildId The guild ID
   * @param userId The user ID to warn
   * @param moderatorId The moderator who issued the warning
   * @param reason The reason for the warning
   * @returns The created warning object
   */
  static async addWarning(guildId: string, userId: string, moderatorId: string, reason: string): Promise<Warning> {
    const warning: Warning = {
      id: uuidv4(),
      userId,
      guildId,
      moderatorId,
      reason,
      timestamp: Date.now()
    };
    
    this.warnings.push(warning);
    Logger.info(`Warning added for ${userId} in guild ${guildId} by ${moderatorId}: ${reason}`);
    
    return warning;
  }
  
  /**
   * Get all warnings for a user in a guild
   * @param guildId The guild ID
   * @param userId The user ID to get warnings for
   * @returns Array of warning objects
   */
  static async getWarnings(guildId: string, userId: string): Promise<Warning[]> {
    return this.warnings.filter(w => w.guildId === guildId && w.userId === userId);
  }
  
  /**
   * Remove a warning by ID
   * @param warningId The warning ID to remove
   * @returns Boolean indicating if the warning was removed
   */
  static async removeWarning(warningId: string): Promise<boolean> {
    const initialLength = this.warnings.length;
    this.warnings = this.warnings.filter(w => w.id !== warningId);
    
    const removed = initialLength > this.warnings.length;
    
    if (removed) {
      Logger.info(`Warning ${warningId} was removed`);
    } else {
      Logger.warn(`Attempted to remove warning ${warningId}, but it was not found`);
    }
    
    return removed;
  }
  
  /**
   * Clear all warnings for a user in a guild
   * @param guildId The guild ID
   * @param userId The user ID to clear warnings for
   * @returns Number of warnings removed
   */
  static async clearWarnings(guildId: string, userId: string): Promise<number> {
    const initialLength = this.warnings.length;
    this.warnings = this.warnings.filter(w => !(w.guildId === guildId && w.userId === userId));
    
    const removedCount = initialLength - this.warnings.length;
    
    if (removedCount > 0) {
      Logger.info(`Cleared ${removedCount} warnings for ${userId} in guild ${guildId}`);
    }
    
    return removedCount;
  }
} 