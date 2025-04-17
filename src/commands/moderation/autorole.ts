import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder, 
  Role,
  PermissionFlagsBits
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';

const autorole: Command = {
  data: new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('Manage automatic role assignment for new members')
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set the role to be automatically assigned to new members')
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('The role to automatically assign')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove the current autorole configuration')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View the current autorole configuration')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false),
  category: 'moderation',
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      return interaction.reply({
        content: '❌ This command can only be used in a server.',
        ephemeral: true
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const embed = new EmbedBuilder().setColor(COLORS.INFO);

    switch (subcommand) {
      case 'set': {
        const role = interaction.options.getRole('role') as Role;
        
        // Check if the role is manageable
        if (!role.editable) {
          return interaction.reply({
            content: '❌ I cannot manage this role. Please ensure I have the correct permissions and the role is below my highest role.',
            ephemeral: true
          });
        }

        // Save the autorole configuration
        try {
          // Here you would typically save this to a database
          // For now, we'll just acknowledge the change
          embed
            .setTitle('✅ Autorole Set')
            .setDescription(`New members will now automatically receive the ${role} role.`)
            .addFields(
              { name: 'Role', value: `${role}`, inline: true },
              { name: 'Role ID', value: role.id, inline: true }
            );
        } catch (error) {
          console.error('Error setting autorole:', error);
          return interaction.reply({
            content: '❌ An error occurred while setting the autorole.',
            ephemeral: true
          });
        }
        break;
      }

      case 'remove': {
        try {
          // Here you would typically remove the configuration from the database
          embed
            .setTitle('✅ Autorole Removed')
            .setDescription('Automatic role assignment has been disabled.');
        } catch (error) {
          console.error('Error removing autorole:', error);
          return interaction.reply({
            content: '❌ An error occurred while removing the autorole.',
            ephemeral: true
          });
        }
        break;
      }

      case 'view': {
        try {
          // Here you would typically fetch the configuration from the database
          // For now, we'll just show a placeholder message
          embed
            .setTitle('📋 Current Autorole Configuration')
            .setDescription('No autorole is currently configured.');
        } catch (error) {
          console.error('Error viewing autorole:', error);
          return interaction.reply({
            content: '❌ An error occurred while viewing the autorole configuration.',
            ephemeral: true
          });
        }
        break;
      }
    }

    return interaction.reply({ embeds: [embed] });
  }
};

export default autorole; 