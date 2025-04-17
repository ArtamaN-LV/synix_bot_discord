import { Events, GuildMember, PartialGuildMember } from 'discord.js';
import { StatusUpdater } from '../utils/statusUpdater';
import { ChannelUpdater } from '../utils/channelUpdater';
import { Logger } from '../utils/logger';

export = {
  name: Events.GuildMemberUpdate,
  execute(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
    try {
      // Check if premium status changed (boosting)
      const wasBooster = oldMember.premiumSince !== null;
      const isBooster = newMember.premiumSince !== null;
      
      // If boost status changed, update the status
      if (wasBooster !== isBooster) {
        // Update bot status
        StatusUpdater.updateStatus();
        
        // Update stats channel
        ChannelUpdater.updateChannels();
        
        // Log the change
        if (isBooster) {
          Logger.info(`Member ${newMember.user.tag} started boosting ${newMember.guild.name}`);
        } else {
          Logger.info(`Member ${newMember.user.tag} stopped boosting ${newMember.guild.name}`);
        }
      }
    } catch (error) {
      Logger.error('Error in guildMemberUpdate event:');
      Logger.error(error as Error);
    }
  }
}; 