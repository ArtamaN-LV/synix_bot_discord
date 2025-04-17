import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  PermissionFlagsBits
} from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { LevelingService } from '../../services/LevelingService';

export = {
  data: new SlashCommandBuilder()
    .setName('levelset')
    .setDescription('Configure leveling system settings')
    .addSubcommand(subcommand =>
      subcommand
        .setName('enable')
        .setDescription('Enable or disable the leveling system')
        .addBooleanOption(option =>
          option
            .setName('status')
            .setDescription('Enable or disable leveling')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('xprate')
        .setDescription('Set the XP rate multiplier for the server')
        .addNumberOption(option =>
          option
            .setName('multiplier')
            .setDescription('The XP rate multiplier (0.5-3.0)')
            .setMinValue(0.5)
            .setMaxValue(3.0)
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('announcements')
        .setDescription('Configure level-up announcements')
        .addStringOption(option =>
          option
            .setName('mode')
            .setDescription('Where to send level-up messages')
            .setRequired(true)
            .addChoices(
              { name: 'Current Channel', value: 'current' },
              { name: 'DM', value: 'dm' },
              { name: 'Specific Channel', value: 'channel' },
              { name: 'Disabled', value: 'disabled' }
            )
        )
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('The channel for level-up announcements (if using channel mode)')
            .setRequired(false)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      // Check if command is used in a guild
      if (!interaction.guild) {
        return interaction.reply({
          embeds: [EmbedBuilderService.error('This command can only be used in a server.')],
          ephemeral: true
        });
      }
      
      const subcommand = interaction.options.getSubcommand();
      
      // Handle each setting subcommand
      if (subcommand === 'enable') {
        const enabled = interaction.options.getBoolean('status', true);
        
        // Update setting in leveling service
        await LevelingService.setServerSetting(interaction.guild.id, 'enabled', enabled);
        
        return interaction.reply({
          embeds: [EmbedBuilderService.success(`Leveling system has been ${enabled ? 'enabled' : 'disabled'} for this server.`)]
        });
      } 
      
      else if (subcommand === 'xprate') {
        const multiplier = interaction.options.getNumber('multiplier', true);
        
        // Update XP rate multiplier
        await LevelingService.setServerSetting(interaction.guild.id, 'xpMultiplier', multiplier);
        
        return interaction.reply({
          embeds: [EmbedBuilderService.success(`XP rate multiplier has been set to ${multiplier}x for this server.`)]
        });
      } 
      
      else if (subcommand === 'announcements') {
        const mode = interaction.options.getString('mode', true);
        const channel = interaction.options.getChannel('channel');
        
        // Validate channel is provided if mode is 'channel'
        if (mode === 'channel' && !channel) {
          return interaction.reply({
            embeds: [EmbedBuilderService.warning('You must specify a channel when using channel mode.')],
            ephemeral: true
          });
        }
        
        // Update announcement settings
        await LevelingService.setServerSetting(interaction.guild.id, 'announceMode', mode);
        
        if (mode === 'channel' && channel) {
          await LevelingService.setServerSetting(interaction.guild.id, 'announceChannel', channel.id);
        }
        
        // Format user-friendly message
        const modeMessages = {
          'current': 'Level-up announcements will be sent in the channel where XP is earned.',
          'dm': 'Level-up announcements will be sent as direct messages to users.',
          'channel': `Level-up announcements will be sent in ${channel}.`,
          'disabled': 'Level-up announcements have been disabled.'
        };
        
        return interaction.reply({
          embeds: [EmbedBuilderService.success(modeMessages[mode as keyof typeof modeMessages])]
        });
      }
      
      return interaction.reply({
        embeds: [EmbedBuilderService.error('Invalid subcommand. Please try again.')],
        ephemeral: true
      });
    } catch (error) {
      console.error('Error in levelset command:', error);
      return interaction.reply({
        embeds: [EmbedBuilderService.error('An error occurred while updating leveling settings.')],
        ephemeral: true
      });
    }
  },
  
  category: 'leveling',
  cooldown: 5,
} as Command; 