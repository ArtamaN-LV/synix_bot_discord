import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember, User } from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';

// Import type extensions
import '../../types/discord';

export = {
  data: new SlashCommandBuilder()
    .setName('whois')
    .setDescription('Get detailed information about a user')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to get information about')
        .setRequired(false)),
  
  async execute(interaction: ChatInputCommandInteraction) {
    // Get the target user (or the command user if no user was specified)
    const targetUser = interaction.options.getUser('user') || interaction.user;
    
    if (!interaction.guild) {
      return interaction.reply({
        embeds: [EmbedBuilderService.error('This command can only be used in a server')],
        ephemeral: true
      });
    }
    
    try {
      // Fetch the GuildMember object
      const member = await interaction.guild.members.fetch(targetUser.id);
      
      // Create the embed
      const whoisEmbed = EmbedBuilderService.createEmbed()
        .setColor(member.displayHexColor || COLORS.INFO)
        .setTitle(`User Information: ${targetUser.tag}`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: 'User ID', value: targetUser.id, inline: true },
          { name: 'Nickname', value: member.nickname || 'None', inline: true },
          { name: 'Bot', value: targetUser.bot ? 'Yes' : 'No', inline: true },
          { name: 'Account Created', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>\n(<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>)`, inline: false },
          { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp! / 1000)}:F>\n(<t:${Math.floor(member.joinedTimestamp! / 1000)}:R>)`, inline: false }
        );
      
      // Add roles if the user has any
      const roles = member.roles.cache
        .filter(role => role.id !== interaction.guild?.id) // Filter out @everyone role
        .sort((a, b) => b.position - a.position) // Sort by position
        .map(role => `<@&${role.id}>`);
      
      whoisEmbed.addFields({
        name: `Roles [${roles.length}]`,
        value: roles.length ? roles.join(' ') : 'None'
      });
      
      // Add banner if available
      if (targetUser.banner) {
        whoisEmbed.setImage(targetUser.bannerURL({ size: 1024 })!);
      }
      
      await interaction.reply({ embeds: [whoisEmbed] });
    } catch (error) {
      console.error('Error fetching user info:', error);
      return interaction.reply({
        embeds: [EmbedBuilderService.error('Failed to fetch user information.')],
        ephemeral: true
      });
    }
  },
  
  category: 'utility',
  cooldown: 5, // 5 seconds cooldown
} as Command; 