import { Events, GuildMember } from 'discord.js';
import { StatusUpdater } from '../utils/statusUpdater';
import { ChannelUpdater } from '../utils/channelUpdater';
import { Logger } from '../utils/logger';

export = {
  name: Events.GuildMemberAdd,
  execute(member: GuildMember) {
    try {
      // Update status to reflect new member count
      StatusUpdater.updateStatus();
      
      // Update stats channel
      ChannelUpdater.updateChannels();
      
      Logger.info(`Member ${member.user.tag} joined guild ${member.guild.name}`);
    } catch (error) {
      Logger.error('Error in guildMemberAdd event:');
      Logger.error(error as Error);
    }
  }
}; 