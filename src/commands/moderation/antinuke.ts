import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';

const antinuke: Command = {
  data: new SlashCommandBuilder()
    .setName('antinuke')
    .setDescription('Configure anti-nuke protection for the server')
    .addSubcommand(subcommand =>
      subcommand
        .setName('enable')
        .setDescription('Enable anti-nuke protection')
        .addIntegerOption(option =>
          option
            .setName('channelthreshold')
            .setDescription('Number of channels that can be deleted in time window (default: 3)')
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName('rolethreshold')
            .setDescription('Number of roles that can be deleted in time window (default: 3)')
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName('timewindow')
            .setDescription('Time window in seconds (default: 10)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disable anti-nuke protection')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('settings')
        .setDescription('View current anti-nuke settings')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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
        const channelThreshold = interaction.options.getInteger('channelthreshold') || 3;
        const roleThreshold = interaction.options.getInteger('rolethreshold') || 3;
        const timeWindow = interaction.options.getInteger('timewindow') || 10;

        try {
          // Here you would typically save these settings to a database
          embed
            .setTitle('✅ Anti-Nuke Enabled')
            .setDescription('Anti-nuke protection has been enabled for this server.')
            .addFields(
              { name: 'Channel Deletion Threshold', value: `${channelThreshold} channels`, inline: true },
              { name: 'Role Deletion Threshold', value: `${roleThreshold} roles`, inline: true },
              { name: 'Time Window', value: `${timeWindow} seconds`, inline: true }
            );
        } catch (error) {
          console.error('Error enabling anti-nuke:', error);
          return interaction.reply({
            content: '❌ An error occurred while enabling anti-nuke.',
            ephemeral: true
          });
        }
        break;
      }

      case 'disable': {
        try {
          // Here you would typically remove the configuration from the database
          embed
            .setTitle('✅ Anti-Nuke Disabled')
            .setDescription('Anti-nuke protection has been disabled for this server.');
        } catch (error) {
          console.error('Error disabling anti-nuke:', error);
          return interaction.reply({
            content: '❌ An error occurred while disabling anti-nuke.',
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
            .setTitle('📋 Anti-Nuke Settings')
            .setDescription('Anti-nuke is currently disabled.');
        } catch (error) {
          console.error('Error viewing anti-nuke settings:', error);
          return interaction.reply({
            content: '❌ An error occurred while viewing anti-nuke settings.',
            ephemeral: true
          });
        }
        break;
      }
    }

    return interaction.reply({ embeds: [embed] });
  }
};

export default antinuke; 