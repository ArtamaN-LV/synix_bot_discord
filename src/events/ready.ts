import { Client, Events } from 'discord.js';
import { Logger } from '../utils/logger';
import { StatusUpdater } from '../utils/statusUpdater';
import { ChannelUpdater } from '../utils/channelUpdater';

export = {
  name: Events.ClientReady,
  once: true,
  execute(client: Client) {
    if (!client.user) return;
    
    Logger.info(`Logged in as ${client.user.tag}!`);
    Logger.info(`Ready to serve ${client.guilds.cache.size} guilds`);
    
    // Initialize status updater with a 5-minute interval
    StatusUpdater.init(client, 5);
    
    // Initialize channel updater with a 10-minute interval
    ChannelUpdater.init(client, 10);
  },
}; 