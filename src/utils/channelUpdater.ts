import { Client, Guild, VoiceChannel, PermissionFlagsBits } from 'discord.js';
import { Logger } from './logger';
import { config } from '../config';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

/**
 * Utility class for updating channel names with dynamic information
 */
export class ChannelUpdater {
  private static client: Client;
  private static interval: NodeJS.Timeout | null = null;
  
  /**
   * Initialize the channel updater
   * @param client Discord client instance
   * @param intervalMinutes Time between updates in minutes (default: 10)
   */
  public static init(client: Client, intervalMinutes = 10): void {
    this.client = client;
    
    // Validate config
    const membersChannelId = process.env.MEMBERS_CHANNEL_ID;
    const boostersChannelId = process.env.BOOSTERS_CHANNEL_ID;
    
    if (!membersChannelId && !boostersChannelId) {
      Logger.warn('No stats channel IDs found in environment variables. Dynamic channel updates disabled.');
      return;
    }
    
    // Perform initial update
    this.updateChannels();
    
    // Set up interval for regular updates
    this.interval = setInterval(() => {
      this.updateChannels();
    }, intervalMinutes * 60 * 1000);
    
    Logger.info('Channel updater initialized with update interval of ' + intervalMinutes + ' minutes');
  }
  
  /**
   * Update all dynamic channels
   */
  public static async updateChannels(): Promise<void> {
    if (!this.client) return;
    
    // Always get the latest channel IDs from environment variables
    const membersChannelId = process.env.MEMBERS_CHANNEL_ID;
    const boostersChannelId = process.env.BOOSTERS_CHANNEL_ID;
    
    if (!membersChannelId && !boostersChannelId) {
      Logger.info('No stats channel IDs found in environment variables');
      return;
    }
    
    let membersChannelExists = true;
    let boostersChannelExists = true;
    
    try {
      // Update members channel if configured
      if (membersChannelId) {
        try {
          // Verify the channel exists before trying to update it
          const channel = await this.client.channels.fetch(membersChannelId);
          if (!channel) {
            Logger.warn(`Members channel with ID ${membersChannelId} not found. Removing from environment.`);
            process.env.MEMBERS_CHANNEL_ID = '';
            membersChannelExists = false;
          } else {
            await this.updateMembersChannel(membersChannelId);
          }
        } catch (error) {
          Logger.error(`Error fetching members channel with ID ${membersChannelId}:`);
          Logger.error(error as Error);
          // Clear the invalid channel ID from environment
          process.env.MEMBERS_CHANNEL_ID = '';
          membersChannelExists = false;
        }
      }
      
      // Update boosters channel if configured
      if (boostersChannelId) {
        try {
          // Verify the channel exists before trying to update it
          const channel = await this.client.channels.fetch(boostersChannelId);
          if (!channel) {
            Logger.warn(`Boosters channel with ID ${boostersChannelId} not found. Removing from environment.`);
            process.env.BOOSTERS_CHANNEL_ID = '';
            boostersChannelExists = false;
          } else {
            await this.updateBoostersChannel(boostersChannelId);
          }
        } catch (error) {
          Logger.error(`Error fetching boosters channel with ID ${boostersChannelId}:`);
          Logger.error(error as Error);
          // Clear the invalid channel ID from environment
          process.env.BOOSTERS_CHANNEL_ID = '';
          boostersChannelExists = false;
        }
      }
      
      // Update .env file if any channel was missing
      if (membersChannelId && !membersChannelExists) {
        await this.updateEnvFile('MEMBERS_CHANNEL_ID', '');
      }
      
      if (boostersChannelId && !boostersChannelExists) {
        await this.updateEnvFile('BOOSTERS_CHANNEL_ID', '');
      }
      
    } catch (error) {
      Logger.error('Error updating channel names:');
      Logger.error(error as Error);
    }
  }
  
  /**
   * Updates a value in the .env file
   */
  private static async updateEnvFile(key: string, value: string): Promise<void> {
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      
      // Read existing .env file
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }
      
      // Create regex to find the key
      const keyRegex = new RegExp(`^${key}=.*`, 'm');
      
      // Check if key exists
      if (keyRegex.test(envContent)) {
        // Replace existing key
        if (value) {
          envContent = envContent.replace(keyRegex, `${key}=${value}`);
        } else {
          // Remove key if value is empty
          envContent = envContent.replace(keyRegex, '');
        }
      } else if (value) {
        // Add new key if it doesn't exist and value is not empty
        envContent += `\n${key}=${value}`;
      }
      
      // Write updated content back to .env file
      fs.writeFileSync(envPath, envContent);
      
      // Reload environment variables
      dotenv.config();
      
      Logger.info(`Updated ${key} in .env file: ${value ? 'Set new value' : 'Removed'}`);
    } catch (error) {
      Logger.error(`Error updating ${key} in .env file:`);
      Logger.error(error as Error);
    }
  }
  
  /**
   * Update the members count voice channel
   */
  private static async updateMembersChannel(channelId: string): Promise<void> {
    try {
      // Get the channel
      const channel = await this.client.channels.fetch(channelId) as VoiceChannel;
      
      if (!channel || channel.type !== 2) { // 2 is GUILD_VOICE
        Logger.warn(`Members channel with ID ${channelId} not found or is not a voice channel`);
        return;
      }
      
      const guild = channel.guild;
      
      // Get member count
      const memberCount = this.formatNumber(guild.memberCount);
      
      // Update channel name
      const newChannelName = `Members: ${memberCount}`;
      
      // Only update if the name has changed to avoid rate limits
      if (channel.name !== newChannelName) {
        await channel.setName(newChannelName);
        Logger.info(`Updated members channel name to: ${newChannelName}`);
      } else {
        Logger.info(`Members channel name already up to date: ${newChannelName}`);
      }
    } catch (error) {
      Logger.error('Error updating members channel:');
      Logger.error(error as Error);
    }
  }
  
  /**
   * Update the boosters count voice channel
   */
  private static async updateBoostersChannel(channelId: string): Promise<void> {
    try {
      // Get the channel
      const channel = await this.client.channels.fetch(channelId) as VoiceChannel;
      
      if (!channel || channel.type !== 2) { // 2 is GUILD_VOICE
        Logger.warn(`Boosters channel with ID ${channelId} not found or is not a voice channel`);
        return;
      }
      
      const guild = channel.guild;
      
      // Get booster count
      const boosterCount = this.formatNumber(guild.premiumSubscriptionCount || 0);
      
      // Update channel name
      const newChannelName = `Boosters: ${boosterCount}`;
      
      // Only update if the name has changed to avoid rate limits
      if (channel.name !== newChannelName) {
        await channel.setName(newChannelName);
        Logger.info(`Updated boosters channel name to: ${newChannelName}`);
      } else {
        Logger.info(`Boosters channel name already up to date: ${newChannelName}`);
      }
    } catch (error) {
      Logger.error('Error updating boosters channel:');
      Logger.error(error as Error);
    }
  }
  
  /**
   * Format a number with commas (e.g., 1,234)
   */
  private static formatNumber(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  
  /**
   * Stop the channel updater
   */
  public static stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
} 