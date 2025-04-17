import User, { IUser } from '../models/User';
import { Logger } from '../utils/logger';

// Server settings type
interface LevelingServerSettings {
  enabled: boolean;
  xpMultiplier: number;
  announceMode: 'current' | 'dm' | 'channel' | 'disabled';
  announceChannel?: string;
  levelRoles: {
    level: number;
    roleId: string;
  }[];
}

// In-memory storage for server settings
const serverSettings = new Map<string, LevelingServerSettings>();

export class LevelingService {
  /**
   * Get a user's profile or create if not exists
   */
  static async getUser(userId: string): Promise<IUser> {
    try {
      let user = await User.findOne({ userId });
      
      // Create new user if not found
      if (!user) {
        user = new User({ userId });
        await user.save();
      }
      
      return user;
    } catch (error) {
      Logger.error(`Error getting user for leveling: ${error}`);
      throw error;
    }
  }
  
  /**
   * Get server settings
   */
  static getServerSettings(guildId: string): LevelingServerSettings {
    if (!serverSettings.has(guildId)) {
      // Default settings
      serverSettings.set(guildId, {
        enabled: true,
        xpMultiplier: 1,
        announceMode: 'current',
        levelRoles: []
      });
    }
    
    return serverSettings.get(guildId)!;
  }
  
  /**
   * Update a server setting
   */
  static async setServerSetting(
    guildId: string, 
    setting: keyof LevelingServerSettings, 
    value: any
  ): Promise<void> {
    const settings = this.getServerSettings(guildId);
    
    // Handle special cases
    if (setting === 'levelRoles') {
      // Ensure levelRoles is an array
      if (!Array.isArray(value)) {
        throw new Error('levelRoles must be an array');
      }
      
      // Validate levelRoles structure
      for (const role of value) {
        if (typeof role.level !== 'number' || typeof role.roleId !== 'string') {
          throw new Error('Invalid levelRole structure');
        }
      }
    }
    
    // Update the setting
    (settings as any)[setting] = value;
    
    Logger.info(`Updated leveling setting ${setting} for guild ${guildId}`);
  }
  
  /**
   * Add a level role
   */
  static async addLevelRole(guildId: string, level: number, roleId: string): Promise<void> {
    const settings = this.getServerSettings(guildId);
    
    // Remove any existing role for this level
    settings.levelRoles = settings.levelRoles.filter(lr => lr.level !== level);
    
    // Add the new role
    settings.levelRoles.push({ level, roleId });
    
    // Sort by level
    settings.levelRoles.sort((a, b) => a.level - b.level);
    
    Logger.info(`Added level role for level ${level} in guild ${guildId}`);
  }
  
  /**
   * Remove a level role
   */
  static async removeLevelRole(guildId: string, level: number): Promise<boolean> {
    const settings = this.getServerSettings(guildId);
    const initialLength = settings.levelRoles.length;
    
    settings.levelRoles = settings.levelRoles.filter(lr => lr.level !== level);
    
    const removed = initialLength > settings.levelRoles.length;
    if (removed) {
      Logger.info(`Removed level role for level ${level} in guild ${guildId}`);
    }
    
    return removed;
  }
  
  /**
   * Get level roles
   */
  static getLevelRoles(guildId: string): { level: number; roleId: string }[] {
    return this.getServerSettings(guildId).levelRoles;
  }
  
  /**
   * Add XP to a user and handle level ups
   * @returns Object with user data and levelUp boolean
   */
  static async addXP(userId: string, amount: number): Promise<{ user: IUser; levelUp: boolean; newLevel?: number }> {
    try {
      const user = await this.getUser(userId);
      const oldLevel = user.level;
      
      // Add XP
      user.xp += amount;
      
      // Check for level up
      const newLevel = this.calculateLevel(user.xp);
      let levelUp = false;
      
      if (newLevel > oldLevel) {
        user.level = newLevel;
        levelUp = true;
      }
      
      await user.save();
      
      return {
        user,
        levelUp,
        newLevel: levelUp ? newLevel : undefined
      };
    } catch (error) {
      Logger.error(`Error adding XP to user ${userId}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Calculate level based on XP
   * Level formula: √(XP / 100)
   */
  static calculateLevel(xp: number): number {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }
  
  /**
   * Calculate XP needed for a given level
   */
  static xpForLevel(level: number): number {
    return Math.pow(level - 1, 2) * 100;
  }
  
  /**
   * Get the top users by level
   */
  static async getLeaderboard(limit: number = 10): Promise<IUser[]> {
    try {
      return await User.find({ xp: { $gt: 0 } })
        .sort({ level: -1, xp: -1 })
        .limit(limit);
    } catch (error) {
      Logger.error(`Error getting leveling leaderboard: ${error}`);
      throw error;
    }
  }
  
  /**
   * Reset a user's XP
   */
  static async resetXP(userId: string): Promise<IUser> {
    try {
      const user = await this.getUser(userId);
      user.xp = 0;
      user.level = 1;
      await user.save();
      return user;
    } catch (error) {
      Logger.error(`Error resetting XP for user ${userId}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Get a user's rank on the leaderboard
   */
  static async getUserRank(userId: string): Promise<number> {
    try {
      const user = await this.getUser(userId);
      
      // Count users with higher level or same level but more XP
      const higherUsers = await User.countDocuments({
        $or: [
          { level: { $gt: user.level } },
          { level: user.level, xp: { $gt: user.xp } }
        ]
      });
      
      // Rank is 1-indexed
      return higherUsers + 1;
    } catch (error) {
      Logger.error(`Error getting rank for user ${userId}: ${error}`);
      throw error;
    }
  }

  private static calculateRequiredXP(level: number): number {
    // Base XP required for level 1
    const baseXP = 1000;
    // Multiplier for each level
    const multiplier = 1.5;
    // Calculate XP required for the next level
    return Math.floor(baseXP * Math.pow(multiplier, level - 1));
  }
} 