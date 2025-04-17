import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  Role,
  PermissionFlagsBits
} from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';

// Import type extensions
import '../../types/discord';

export = {
  data: new SlashCommandBuilder()
    .setName('roleinfo')
    .setDescription('Display information about a role')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(option => 
      option.setName('role')
        .setDescription('The role to show information about')
        .setRequired(true)),
  
  async execute(interaction: ChatInputCommandInteraction) {
    // Check if user has administrator permissions
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: '❌ This command is restricted to administrators only.',
        ephemeral: true
      });
    }

    const roleOption = interaction.options.getRole('role');
    
    if (!roleOption) {
      return interaction.reply({
        embeds: [EmbedBuilderService.error('Failed to get role information.')],
        ephemeral: true
      });
    }
    
    try {
      // Fetch the complete role from the guild if possible
      let role: Role | null = null;
      if (interaction.guild) {
        role = interaction.guild.roles.cache.get(roleOption.id) as Role;
      }
      
      // If role couldn't be fetched, use the partial data with safer properties
      if (!role) {
        const embed = EmbedBuilderService.createEmbed()
          .setColor(COLORS.INFO)
          .setTitle(`Role Information: ${roleOption.name}`)
          .addFields(
            { name: 'Name', value: roleOption.name, inline: true },
            { name: 'ID', value: roleOption.id, inline: true }
          );
        
        return interaction.reply({ embeds: [embed] });
      }
      
      // We now have a full Role object
      // Get role color as hex
      const hexColor = role.hexColor.toUpperCase();
      
      // Format date
      const createdAt = Math.floor(role.createdTimestamp / 1000);
      
      // Calculate permissions
      const permissionsArray = getRolePermissionsArray(role);
      
      // Create the embed
      const embed = EmbedBuilderService.createEmbed()
        .setColor(role.color || COLORS.INFO)
        .setTitle(`Role Information: ${role.name}`)
        .addFields(
          { name: 'Name', value: role.name, inline: true },
          { name: 'ID', value: role.id, inline: true },
          { name: 'Color', value: hexColor, inline: true },
          { name: 'Position', value: role.position.toString(), inline: true },
          { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
          { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
          { name: 'Created At', value: `<t:${createdAt}:F>`, inline: true },
          { name: 'Members', value: role.members.size.toString(), inline: true }
        );
      
      // Add permissions if the role has any
      if (permissionsArray.length > 0) {
        embed.addFields({ 
          name: 'Key Permissions', 
          value: permissionsArray.join(', '), 
          inline: false 
        });
      }
      
      // Add permissions flag value for debugging/advanced users
      if (typeof role.permissions !== 'string') {
        embed.addFields({
          name: 'Permission Flags',
          value: `\`${role.permissions.bitfield.toString()}\``,
          inline: false
        });
      }
      
      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error getting role info:', error);
      return interaction.reply({
        embeds: [EmbedBuilderService.error('An error occurred while fetching role information.')],
        ephemeral: true
      });
    }
  },
  
  category: 'utility',
  cooldown: 5,
} as Command;

/**
 * Get an array of human-readable permission names from a role
 */
function getRolePermissionsArray(role: Role): string[] {
  const permissions = [];
  
  // Map of important permissions to check and their display names
  const permissionChecks: Record<string, string> = {
    [PermissionFlagsBits.Administrator.toString()]: 'Administrator',
    [PermissionFlagsBits.ManageGuild.toString()]: 'Manage Server',
    [PermissionFlagsBits.ManageRoles.toString()]: 'Manage Roles',
    [PermissionFlagsBits.ManageChannels.toString()]: 'Manage Channels',
    [PermissionFlagsBits.KickMembers.toString()]: 'Kick Members',
    [PermissionFlagsBits.BanMembers.toString()]: 'Ban Members',
    [PermissionFlagsBits.ManageMessages.toString()]: 'Manage Messages',
    [PermissionFlagsBits.MentionEveryone.toString()]: 'Mention Everyone',
    [PermissionFlagsBits.MuteMembers.toString()]: 'Mute Members',
    [PermissionFlagsBits.DeafenMembers.toString()]: 'Deafen Members',
    [PermissionFlagsBits.MoveMembers.toString()]: 'Move Members',
    [PermissionFlagsBits.ManageNicknames.toString()]: 'Manage Nicknames',
    [PermissionFlagsBits.ManageWebhooks.toString()]: 'Manage Webhooks',
    [PermissionFlagsBits.ManageEmojisAndStickers.toString()]: 'Manage Emojis & Stickers',
    [PermissionFlagsBits.ModerateMembers.toString()]: 'Timeout Members',
    [PermissionFlagsBits.ViewAuditLog.toString()]: 'View Audit Log',
    [PermissionFlagsBits.ViewGuildInsights.toString()]: 'View Server Insights'
  };
  
  // Check for important permissions
  for (const [flag, name] of Object.entries(permissionChecks)) {
    if (role.permissions.has(BigInt(flag))) {
      permissions.push(name);
    }
  }
  
  // If the role has Administrator, it's the only permission that matters
  if (role.permissions.has(PermissionFlagsBits.Administrator)) {
    return ['Administrator'];
  }
  
  return permissions;
} 