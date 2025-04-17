import { SlashCommandBuilder, ChatInputCommandInteraction, GuildVerificationLevel, GuildExplicitContentFilter, GuildNSFWLevel } from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';

export = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Displays information about the server'),
  
  async execute(interaction: ChatInputCommandInteraction) {
    // Ensure command is used in a guild
    if (!interaction.guild) {
      return interaction.reply({
        embeds: [EmbedBuilderService.error('This command can only be used in a server')],
        ephemeral: true
      });
    }
    
    const { guild } = interaction;
    
    // Fetch more guild data
    await guild.fetch();
    
    // Get verification level in a readable format
    let verificationLevel = 'Unknown';
    switch (guild.verificationLevel) {
      case GuildVerificationLevel.None:
        verificationLevel = 'None';
        break;
      case GuildVerificationLevel.Low:
        verificationLevel = 'Low';
        break;
      case GuildVerificationLevel.Medium:
        verificationLevel = 'Medium';
        break;
      case GuildVerificationLevel.High:
        verificationLevel = 'High';
        break;
      case GuildVerificationLevel.VeryHigh:
        verificationLevel = 'Very High';
        break;
    }
    
    // Get content filter level in a readable format
    let contentFilter = 'Unknown';
    switch (guild.explicitContentFilter) {
      case GuildExplicitContentFilter.Disabled:
        contentFilter = 'Disabled';
        break;
      case GuildExplicitContentFilter.MembersWithoutRoles:
        contentFilter = 'Members Without Roles';
        break;
      case GuildExplicitContentFilter.AllMembers:
        contentFilter = 'All Members';
        break;
    }
    
    // Get NSFW level in a readable format
    let nsfwLevel = 'Unknown';
    switch (guild.nsfwLevel) {
      case GuildNSFWLevel.Default:
        nsfwLevel = 'Default';
        break;
      case GuildNSFWLevel.Explicit:
        nsfwLevel = 'Explicit';
        break;
      case GuildNSFWLevel.Safe:
        nsfwLevel = 'Safe';
        break;
      case GuildNSFWLevel.AgeRestricted:
        nsfwLevel = 'Age Restricted';
        break;
    }
    
    // Get channel counts
    const totalChannels = guild.channels.cache.size;
    const textChannels = guild.channels.cache.filter(channel => channel.isTextBased() && !channel.isThread()).size;
    const voiceChannels = guild.channels.cache.filter(channel => channel.isVoiceBased()).size;
    const categoryChannels = guild.channels.cache.filter(channel => channel.type === 4).size; // 4 is CategoryChannel
    
    // Create the embed
    const serverEmbed = EmbedBuilderService.createEmbed()
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL({ size: 256 }) || '')
      .addFields(
        { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
        { name: 'Created On', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
        { name: 'Server ID', value: guild.id, inline: true },
        { name: 'Members', value: guild.memberCount.toString(), inline: true },
        { name: 'Boost Level', value: `Level ${guild.premiumTier}`, inline: true },
        { name: 'Boosts', value: guild.premiumSubscriptionCount?.toString() || '0', inline: true },
        { name: 'Channels', value: `Total: ${totalChannels}\nText: ${textChannels}\nVoice: ${voiceChannels}\nCategories: ${categoryChannels}`, inline: true },
        { name: 'Verification', value: verificationLevel, inline: true },
        { name: 'Content Filter', value: contentFilter, inline: true }
      );
    
    // Add server banner if it exists
    if (guild.banner) {
      serverEmbed.setImage(guild.bannerURL({ size: 1024 }) || '');
    }
    
    return interaction.reply({ embeds: [serverEmbed] });
  },
  
  category: 'utility',
  cooldown: 10, // 10 seconds cooldown
} as Command; 