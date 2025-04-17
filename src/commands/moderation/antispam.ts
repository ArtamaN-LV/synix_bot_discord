import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';

const antispam: Command = {
  data: new SlashCommandBuilder()
    .setName('antispam')
    .setDescription('Configure anti-spam settings for the server')
    .addSubcommand(subcommand =>
      subcommand
        .setName('enable')
        .setDescription('Enable anti-spam protection')
        .addIntegerOption(option =>
          option
            .setName('threshold')
            .setDescription('Number of messages in time window to trigger (default: 5)')
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName('timewindow')
            .setDescription('Time window in seconds (default: 5)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disable anti-spam protection')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('settings')
        .setDescription('View current anti-spam settings')
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
      case 'enable': {
        const threshold = interaction.options.getInteger('threshold') || 5;
        const timeWindow = interaction.options.getInteger('timewindow') || 5;

        try {
          // Here you would typically save these settings to a database
          embed
            .setTitle('✅ Anti-Spam Enabled')
            .setDescription('Anti-spam protection has been enabled for this server.')
            .addFields(
              { name: 'Message Threshold', value: `${threshold} messages`, inline: true },
              { name: 'Time Window', value: `${timeWindow} seconds`, inline: true }
            );
        } catch (error) {
          console.error('Error enabling anti-spam:', error);
          return interaction.reply({
            content: '❌ An error occurred while enabling anti-spam.',
            ephemeral: true
          });
        }
        break;
      }

      case 'disable': {
        try {
          // Here you would typically remove the configuration from the database
          embed
            .setTitle('✅ Anti-Spam Disabled')
            .setDescription('Anti-spam protection has been disabled for this server.');
        } catch (error) {
          console.error('Error disabling anti-spam:', error);
          return interaction.reply({
            content: '❌ An error occurred while disabling anti-spam.',
            ephemeral: true
          });
        }
        break;
      }

      case 'settings': {
        try {
          // Here you would typically fetch the configuration from the database
          // For now, we'll just show a placeholder message
          embed
            .setTitle('📋 Anti-Spam Settings')
            .setDescription('Anti-spam is currently disabled.');
        } catch (error) {
          console.error('Error viewing anti-spam settings:', error);
          return interaction.reply({
            content: '❌ An error occurred while viewing anti-spam settings.',
            ephemeral: true
          });
        }
        break;
      }
    }

    return interaction.reply({ embeds: [embed] });
  }
};

export default antispam; 