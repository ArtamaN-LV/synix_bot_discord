import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';

export = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Displays information about a user')
    .addUserOption(option => 
      option
        .setName('user')
        .setDescription('The user to get info on')
        .setRequired(false)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    
    // Get member data if in a guild
    let member: GuildMember | null = null;
    if (interaction.guild) {
      member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    }
    
    // Create embed
    const userEmbed = EmbedBuilderService.createEmbed()
      .setTitle(`User Information: ${targetUser.tag}`)
      .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Username', value: targetUser.username, inline: true },
        { name: 'User ID', value: targetUser.id, inline: true },
        { name: 'Account Created', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: true }
      );
    
    // Add member-specific info if available
    if (member) {
      // Get join date
      const joinedTimestamp = member.joinedTimestamp;
      const joinedAt = joinedTimestamp ? `<t:${Math.floor(joinedTimestamp / 1000)}:R>` : 'Unknown';
      
      // Get roles (excluding @everyone)
      const roles = member.roles.cache
        .filter(role => role.id !== interaction.guild!.id)
        .sort((a, b) => b.position - a.position)
        .map(role => `<@&${role.id}>`)
        .join(', ') || 'None';
      
      // Get nickname
      const nickname = member.nickname || 'None';
      
      // Add fields to embed
      userEmbed.addFields(
        { name: 'Nickname', value: nickname, inline: true },
        { name: 'Joined Server', value: joinedAt, inline: true },
        { name: `Roles [${member.roles.cache.size - 1}]`, value: roles.substring(0, 1024) || 'None' }
      );
      
      // Set color to match member's display color if they have one
      if (member.displayHexColor && member.displayHexColor !== '#000000') {
        userEmbed.setColor(member.displayHexColor);
      }
    }
    
    // Add banner if user has one
    if (targetUser.banner) {
      userEmbed.setImage(targetUser.bannerURL({ size: 1024 }) || '');
    }
    
    return interaction.reply({ embeds: [userEmbed] });
  },
  
  category: 'utility',
  cooldown: 5, // 5 seconds cooldown
} as Command; 