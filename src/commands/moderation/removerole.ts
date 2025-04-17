import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  GuildMember,
  Role,
  EmbedBuilder
} from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';

export = {
  data: new SlashCommandBuilder()
    .setName('removerole')
    .setDescription('Remove a role from a user or multiple users')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('The role to remove')
        .setRequired(true)
    )
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to remove the role from')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for removing the role')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('all')
        .setDescription('Remove the role from all members who have it')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('silent')
        .setDescription('Don\'t notify users about the role removal')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      if (!interaction.guild) {
        const guildOnlyEmbed = EmbedBuilderService.warning('This command can only be used in a server.');
        return await interaction.reply({ embeds: [guildOnlyEmbed], ephemeral: true });
      }

      // Get command options
      const role = interaction.options.getRole('role', true) as Role;
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const removeAll = interaction.options.getBoolean('all') || false;
      const silent = interaction.options.getBoolean('silent') || false;
      
      // Check bot permissions
      const me = interaction.guild.members.me;
      if (!me) {
        const errorEmbed = EmbedBuilderService.error('Failed to get bot member information.');
        return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
      
      // Check if the bot can manage this role
      if (me.roles.highest.position <= role.position) {
        const errorEmbed = EmbedBuilderService.error(
          'I cannot remove this role because it is higher than or equal to my highest role.'
        );
        return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
      
      // Check if the user can manage this role
      const member = interaction.member as GuildMember;
      if (member.roles.highest.position <= role.position && interaction.guild.ownerId !== member.id) {
        const errorEmbed = EmbedBuilderService.error(
          'You cannot remove this role because it is higher than or equal to your highest role.'
        );
        return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }

      // If removing from all members
      if (removeAll) {
        await interaction.deferReply();
        
        const membersWithRole = role.members;
        
        if (membersWithRole.size === 0) {
          const noMembersEmbed = EmbedBuilderService.warning('No members have this role.');
          return await interaction.editReply({ embeds: [noMembersEmbed] });
        }
        
        let successCount = 0;
        let failCount = 0;
        
        const auditReason = `Bulk role removal by ${interaction.user.tag} | Reason: ${reason}`;
        
        // Process members in chunks to avoid rate limits
        const promises = membersWithRole.map(async (member) => {
          try {
            await member.roles.remove(role, auditReason);
            
            // Send DM to notify the user if not silent
            if (!silent) {
              try {
                const notificationEmbed = new EmbedBuilder()
                  .setTitle('Role Removed')
                  .setDescription(`The role **${role.name}** has been removed from you in **${interaction.guild?.name}**`)
                  .setColor(0xE74C3C)
                  .addFields({ name: 'Reason', value: reason })
                  .setTimestamp();
                
                await member.send({ embeds: [notificationEmbed] }).catch(() => {
                  // Silently fail if DM cannot be sent
                });
              } catch (error) {
                // Ignore errors when sending DMs
              }
            }
            
            successCount++;
          } catch (error) {
            console.error(`Failed to remove role from ${member.user.tag}:`, error);
            failCount++;
          }
        });
        
        await Promise.allSettled(promises);
        
        const resultsEmbed = EmbedBuilderService.success(
          `Role removal operation complete.\n` +
          `Role: **${role.name}**\n` +
          `✅ Successfully removed from: ${successCount} member(s)\n` +
          `❌ Failed to remove from: ${failCount} member(s)`
        );
        
        return await interaction.editReply({ embeds: [resultsEmbed] });
      } 
      // If removing from a specific user
      else if (user) {
        // Ensure the user is a member of the guild
        const targetMember = await interaction.guild.members.fetch(user.id).catch(() => null);
        
        if (!targetMember) {
          const errorEmbed = EmbedBuilderService.error('This user is not a member of this server.');
          return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
        
        // Check if the user has the role
        if (!targetMember.roles.cache.has(role.id)) {
          const errorEmbed = EmbedBuilderService.warning(`${user.tag} does not have the role **${role.name}**.`);
          return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
        
        // Remove the role
        const auditReason = `Removed by ${interaction.user.tag} | Reason: ${reason}`;
        
        await targetMember.roles.remove(role, auditReason);
        
        // Send DM to notify the user if not silent
        if (!silent) {
          try {
            const notificationEmbed = new EmbedBuilder()
              .setTitle('Role Removed')
              .setDescription(`The role **${role.name}** has been removed from you in **${interaction.guild.name}**`)
              .setColor(0xE74C3C)
              .addFields({ name: 'Reason', value: reason })
              .setTimestamp();
            
            await targetMember.send({ embeds: [notificationEmbed] }).catch(() => {
              // Silently fail if DM cannot be sent
            });
          } catch (error) {
            // Ignore errors when sending DMs
          }
        }
        
        const successEmbed = EmbedBuilderService.success(
          `Successfully removed the role **${role.name}** from ${user.tag}.`
        );
        
        return await interaction.reply({ embeds: [successEmbed] });
      } 
      // No user specified and not removing from all
      else {
        const errorEmbed = EmbedBuilderService.error(
          'You must either specify a user or use the "all" option to remove the role from all members.'
        );
        return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    } catch (error) {
      console.error('Error in removerole command:', error);
      const errorEmbed = EmbedBuilderService.error('An error occurred while executing the removerole command.');
      
      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] }).catch(() => {});
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
      }
    }
  }
} as Command; 