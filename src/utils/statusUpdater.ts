import { ActivityType, Client, TextChannel } from 'discord.js';

/**
 * Updates the bot's status with dynamic information
 */
export class StatusUpdater {
  private static client: Client;
  private static interval: NodeJS.Timeout | null = null;
  private static currentStatusIndex = 0;
  
  // Array of status update functions
  private static statusUpdates = [
    // Watching members status
    (client: Client) => {
      const memberCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
      client.user?.setActivity(`${memberCount} Members`, { type: ActivityType.Watching });
    },
    
    // Watching server boosters status
    (client: Client) => {
      try {
        // Count total boosters across all servers
        let boosterCount = 0;
        
        client.guilds.cache.forEach(guild => {
          // Get premium subscribers (boosters)
          const premiumSubscribers = guild.members.cache.filter(member => member.premiumSince !== null);
          boosterCount += premiumSubscribers.size;
        });
        
        client.user?.setActivity(`${boosterCount} Boosters`, { type: ActivityType.Watching });
      } catch (error) {
        console.error('Error counting boosters:', error);
        // Fallback to default status
        client.user?.setActivity('/help', { type: ActivityType.Watching });
      }
    },
    
    // Help command status
    (client: Client) => {
      client.user?.setActivity('/help', { type: ActivityType.Watching });
    }
  ];
  
  /**
   * Initialize the status updater with the client
   */
  public static init(client: Client, intervalMinutes = 5): void {
    this.client = client;
    
    // Initial status update
    this.updateStatus();
    
    // Set interval for status rotation (default: 5 minutes)
    this.interval = setInterval(() => {
      this.updateStatus();
    }, intervalMinutes * 60 * 1000);
  }
  
  /**
   * Update the bot status with the next status in rotation
   */
  public static updateStatus(): void {
    if (!this.client?.user) return;
    
    // Get the next status function
    const statusFunction = this.statusUpdates[this.currentStatusIndex];
    
    // Update status
    try {
      statusFunction(this.client);
    } catch (error) {
      console.error('Error updating status:', error);
      // Fallback to default status
      this.client.user.setActivity('/help', { type: ActivityType.Watching });
    }
    
    // Move to next status (with wraparound)
    this.currentStatusIndex = (this.currentStatusIndex + 1) % this.statusUpdates.length;
  }
  
  /**
   * Stop the status rotation
   */
  public static stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
} 