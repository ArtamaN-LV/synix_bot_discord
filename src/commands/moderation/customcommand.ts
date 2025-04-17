import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';

const customcommand: Command = {
  data: new SlashCommandBuilder()
    .setName('customcommand')
    .setDescription('Manage custom commands for the server')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a new custom command')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The name of the command')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('response')
            .setDescription('The response of the command')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('edit')
        .setDescription('Edit an existing custom command')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The name of the command to edit')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('response')
            .setDescription('The new response of the command')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('delete')
        .setDescription('Delete a custom command')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The name of the command to delete')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('View all custom commands')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
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
      case 'create': {
        const name = interaction.options.getString('name', true);
        const response = interaction.options.getString('response', true);

        try {
          // Here you would typically save the command to a database
          embed
            .setTitle('✅ Custom Command Created')
            .setDescription(`The command "${name}" has been created.`)
            .addFields(
              { name: 'Command', value: `/${name}`, inline: true },
              { name: 'Response', value: response, inline: true }
            );
        } catch (error) {
          console.error('Error creating custom command:', error);
          return interaction.reply({
            content: '❌ An error occurred while creating the custom command.',
            ephemeral: true
          });
        }
        break;
      }

      case 'edit': {
        const name = interaction.options.getString('name', true);
        const response = interaction.options.getString('response', true);

        try {
          // Here you would typically update the command in the database
          embed
            .setTitle('✅ Custom Command Edited')
            .setDescription(`The command "${name}" has been updated.`)
            .addFields(
              { name: 'Command', value: `/${name}`, inline: true },
              { name: 'New Response', value: response, inline: true }
            );
        } catch (error) {
          console.error('Error editing custom command:', error);
          return interaction.reply({
            content: '❌ An error occurred while editing the custom command.',
            ephemeral: true
          });
        }
        break;
      }

      case 'delete': {
        const name = interaction.options.getString('name', true);

        try {
          // Here you would typically remove the command from the database
          embed
            .setTitle('✅ Custom Command Deleted')
            .setDescription(`The command "${name}" has been deleted.`);
        } catch (error) {
          console.error('Error deleting custom command:', error);
          return interaction.reply({
            content: '❌ An error occurred while deleting the custom command.',
            ephemeral: true
          });
        }
        break;
      }

      case 'list': {
        try {
          // Here you would typically fetch the commands from the database
          // For now, we'll just show a placeholder message
          embed
            .setTitle('📋 Custom Commands')
            .setDescription('No custom commands have been created yet.');
        } catch (error) {
          console.error('Error viewing custom commands:', error);
          return interaction.reply({
            content: '❌ An error occurred while viewing custom commands.',
            ephemeral: true
          });
        }
        break;
      }
    }

    return interaction.reply({ embeds: [embed] });
  }
};

export default customcommand; 