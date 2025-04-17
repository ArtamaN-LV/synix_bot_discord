import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  ChannelType,
  GuildChannel,
  TextChannel,
  VoiceChannel,
  CategoryChannel,
  ThreadChannel,
  ForumChannel,
  PermissionFlagsBits,
  DMChannel,
  Channel
} from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';

// Import type extensions
import '../../types/discord';

export = {
  data: new SlashCommandBuilder()
    .setName('channelinfo')
    .setDescription('Display information about a channel')
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('The channel to show information about (defaults to current channel)')
        .setRequired(false)),
  
  async execute(interaction: ChatInputCommandInteraction) {
    // Get the target channel (either specified or current channel)
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
    
    if (!targetChannel) {
      return interaction.reply({
        embeds: [EmbedBuilderService.error('Failed to get channel information.')],
        ephemeral: true
      });
    }
    
    try {
      // For DM channels, show limited info
      if (targetChannel.type === ChannelType.DM) {
        const dmChannel = targetChannel as DMChannel;
        const embed = EmbedBuilderService.createEmbed()
          .setColor(COLORS.INFO)
          .setTitle('Channel Information')
          .addFields(
            { name: 'Type', value: 'DM', inline: true },
            { name: 'ID', value: targetChannel.id, inline: true }
          );
        
        return interaction.reply({ embeds: [embed] });
      }
      
      // Otherwise, it's a guild channel with more information
      const guildChannel = targetChannel as GuildChannel;
      
      // Format channel type for display
      const channelTypeMap: Record<number, string> = {
        [ChannelType.GuildText]: 'Text Channel',
        [ChannelType.GuildVoice]: 'Voice Channel',
        [ChannelType.GuildCategory]: 'Category',
        [ChannelType.GuildAnnouncement]: 'Announcement Channel',
        [ChannelType.AnnouncementThread]: 'Announcement Thread',
        [ChannelType.PublicThread]: 'Public Thread',
        [ChannelType.PrivateThread]: 'Private Thread',
        [ChannelType.GuildStageVoice]: 'Stage Channel',
        [ChannelType.GuildForum]: 'Forum Channel',
        [ChannelType.GuildMedia]: 'Media Channel'
      };
      
      const channelTypeDisplay = channelTypeMap[guildChannel.type] || 'Unknown Channel Type';
      
      // Create base embed with common information
      const embed = EmbedBuilderService.createEmbed()
        .setColor(COLORS.INFO)
        .setTitle(`${getChannelIcon(guildChannel.type)} Channel Information: #${guildChannel.name}`)
        .addFields(
          { name: 'Name', value: guildChannel.name, inline: true },
          { name: 'Type', value: channelTypeDisplay, inline: true },
          { name: 'ID', value: guildChannel.id, inline: true },
          { name: 'Created At', value: `<t:${Math.floor(guildChannel.createdTimestamp / 1000)}:F>`, inline: true }
        );
      
      // Add position and category information if available
      if ('position' in guildChannel) {
        embed.addFields({ name: 'Position', value: guildChannel.position.toString(), inline: true });
      }
      
      if ('parent' in guildChannel && guildChannel.parent) {
        embed.addFields({ name: 'Category', value: guildChannel.parent.name, inline: true });
      }
      
      // Add type-specific information
      if (guildChannel.type === ChannelType.GuildText || guildChannel.type === ChannelType.GuildAnnouncement) {
        const textChannel = guildChannel as TextChannel;
        
        // Add text channel specific fields
        embed.addFields(
          { name: 'Topic', value: textChannel.topic || 'No topic set', inline: false }
        );
        
        if (textChannel.rateLimitPerUser > 0) {
          embed.addFields({ name: 'Slowmode', value: `${textChannel.rateLimitPerUser} seconds`, inline: true });
        }
        
        embed.addFields({ 
          name: 'NSFW', 
          value: textChannel.nsfw ? 'Yes' : 'No', 
          inline: true 
        });
      } 
      else if (guildChannel.type === ChannelType.GuildVoice || guildChannel.type === ChannelType.GuildStageVoice) {
        const voiceChannel = guildChannel as VoiceChannel;
        
        // Add voice channel specific fields
        if (voiceChannel.userLimit > 0) {
          embed.addFields({ name: 'User Limit', value: voiceChannel.userLimit.toString(), inline: true });
        }
        
        embed.addFields(
          { name: 'Bitrate', value: `${Math.floor(voiceChannel.bitrate / 1000)} kbps`, inline: true }
        );
      }
      else if (guildChannel.type === ChannelType.GuildForum) {
        const forumChannel = guildChannel as ForumChannel;
        
        // Add forum channel specific fields
        embed.addFields(
          { name: 'Available Tags', value: forumChannel.availableTags.length > 0 ? 
              forumChannel.availableTags.map(tag => `\`${tag.name}\``).join(', ') : 
              'No tags', 
            inline: false 
          }
        );
      }
      
      // Add permissions information
      const everyonePerms = guildChannel.permissionsFor(guildChannel.guild.roles.everyone);
      
      if (everyonePerms) {
        const viewChannel = everyonePerms.has(PermissionFlagsBits.ViewChannel) ? '✅' : '❌';
        const sendMessages = everyonePerms.has(PermissionFlagsBits.SendMessages) ? '✅' : '❌';
        
        embed.addFields({ 
          name: 'Default Permissions', 
          value: `View Channel: ${viewChannel}\nSend Messages: ${sendMessages}`, 
          inline: false 
        });
      }
      
      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error getting channel info:', error);
      return interaction.reply({
        embeds: [EmbedBuilderService.error('An error occurred while fetching channel information.')],
        ephemeral: true
      });
    }
  },
  
  category: 'utility',
  cooldown: 5,
} as Command;

/**
 * Get an appropriate emoji for the channel type
 */
function getChannelIcon(channelType: number): string {
  switch (channelType) {
    case ChannelType.GuildText:
      return '📝';
    case ChannelType.GuildVoice:
      return '🔊';
    case ChannelType.GuildCategory:
      return '📁';
    case ChannelType.GuildAnnouncement:
      return '📢';
    case ChannelType.AnnouncementThread:
    case ChannelType.PublicThread:
    case ChannelType.PrivateThread:
      return '🧵';
    case ChannelType.GuildStageVoice:
      return '🎭';
    case ChannelType.GuildForum:
      return '📊';
    case ChannelType.GuildMedia:
      return '🖼️';
    default:
      return '#️⃣';
  }
} 