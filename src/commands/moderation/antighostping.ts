import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';

const antighostping: Command = {
  data: new SlashCommandBuilder()
    .setName('antighostping')
    .setDescription('Configure anti-ghost-ping detection for the server')
    .addSubcommand(subcommand =>
      subcommand
        .setName('enable')
        .setDescription('Enable anti-ghost-ping detection')
        .addIntegerOption(option =>
          option
            .setName('timewindow')
            .setDescription('Time window in seconds to detect ghost pings (default: 5)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disable anti-ghost-ping detection')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('settings')
        .setDescription('View current anti-ghost-ping settings')
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
        const timeWindow = interaction.options.getInteger('timewindow') || 5;

        try {
          // Here you would typically save these settings to a database
          embed
            .setTitle('✅ Anti-Ghost-Ping Enabled')
            .setDescription('Anti-ghost-ping detection has been enabled for this server.')
            .addFields(
              { name: 'Detection Time Window', value: `${timeWindow} seconds`, inline: true }
            );
        } catch (error) {
          console.error('Error enabling anti-ghost-ping:', error);
          return interaction.reply({
            content: '❌ An error occurred while enabling anti-ghost-ping.',
            ephemeral: true
          });
        }
        break;
      }

      case 'disable': {
        try {
          // Here you would typically remove the configuration from the database
          embed
            .setTitle('✅ Anti-Ghost-Ping Disabled')
            .setDescription('Anti-ghost-ping detection has been disabled for this server.');
        } catch (error) {
          console.error('Error disabling anti-ghost-ping:', error);
          return interaction.reply({
            content: '❌ An error occurred while disabling anti-ghost-ping.',
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
            .setTitle('📋 Anti-Ghost-Ping Settings')
            .setDescription('Anti-ghost-ping detection is currently disabled.');
        } catch (error) {
          console.error('Error viewing anti-ghost-ping settings:', error);
          return interaction.reply({
            content: '❌ An error occurred while viewing anti-ghost-ping settings.',
            ephemeral: true
          });
        }
        break;
      }
    }

    return interaction.reply({ embeds: [embed] });
  }
};

export default antighostping; 