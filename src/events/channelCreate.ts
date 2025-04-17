import { Events, GuildChannel } from 'discord.js';
import { StatusUpdater } from '../utils/statusUpdater';
import { Logger } from '../utils/logger';

export = {
  name: Events.ChannelCreate,
  execute(channel: GuildChannel) {
    try {
      // If this is a ticket channel, update the status
      if (channel.name.startsWith('ticket-')) {
        StatusUpdater.updateStatus();
        Logger.info(`Ticket channel created: ${channel.name} in ${channel.guild.name}`);
      }
    } catch (error) {
      Logger.error('Error in channelCreate event:');
      Logger.error(error as Error);
    }
  }
}; 