import { Events, GuildChannel } from 'discord.js';
import { StatusUpdater } from '../utils/statusUpdater';
import { Logger } from '../utils/logger';

export = {
  name: Events.ChannelDelete,
  execute(channel: GuildChannel) {
    try {
      // If this was a ticket channel, update the status
      if (channel.name.startsWith('ticket-')) {
        StatusUpdater.updateStatus();
        Logger.info(`Ticket channel deleted: ${channel.name} in ${channel.guild.name}`);
      }
    } catch (error) {
      Logger.error('Error in channelDelete event:');
      Logger.error(error as Error);
    }
  }
}; 