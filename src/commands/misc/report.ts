import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  TextChannel,
  ChannelType,
  User,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
  ButtonInteraction
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';
import { ReportService } from '../../services/ReportService';
import { EmbedBuilderService } from '../../utils/embedBuilder';

export = {
  category: 'misc',
  cooldown: 3600, // 1 hour cooldown
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Report a user to moderators')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Set up the report system')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('The channel where reports will be sent')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a new report')
        .addUserOption(option => 
          option
            .setName('user')
            .setDescription('The user to report')
            .setRequired(true)
        )
        .addStringOption(option => 
          option
            .setName('reason')
            .setDescription('Reason for the report')
            .setRequired(true)
        )
        .addAttachmentOption(option => 
          option
            .setName('evidence')
            .setDescription('Optional screenshot or evidence')
        )
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      
      if (subcommand === 'setup') {
        // Check if user has administrator permissions
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({
            content: '❌ This command is restricted to administrators only.',
            ephemeral: true
          });
        }

        const channel = interaction.options.getChannel('channel', true);
        
        // Set the report channel
        const success = await ReportService.setReportChannel(interaction.guildId!, channel.id);
        
        if (success) {
          return interaction.reply({
            embeds: [EmbedBuilderService.success(`Report channel set to ${channel}`)],
            ephemeral: true
          });
        } else {
          return interaction.reply({
            embeds: [EmbedBuilderService.error('Failed to set report channel. Please try again.')],
            ephemeral: true
          });
        }
      }
      
      if (subcommand === 'create') {
        // Get options
        const reportedUser = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason', true);
        const evidence = interaction.options.getAttachment('evidence');
        
        // Prevent self-reports
        if (reportedUser.id === interaction.user.id) {
          return interaction.reply({
            content: 'You cannot report yourself.',
            ephemeral: true
          });
        }
        
        // Prevent reporting the bot
        if (reportedUser.id === interaction.client.user?.id) {
          return interaction.reply({
            content: 'You cannot report me. If you\'re experiencing issues, please contact a server administrator.',
            ephemeral: true
          });
        }
        
        // Create report ID
        const reportId = `REP-${Date.now().toString().slice(-6)}`;
        
        // Create report embed
        const reportEmbed = new EmbedBuilder()
          .setColor(COLORS.ERROR)
          .setTitle(`User Report #${reportId}`)
          .addFields(
            { name: 'Reported User', value: `${reportedUser} (${reportedUser.id})`, inline: false },
            { name: 'Reason', value: reason, inline: false },
            { name: 'Reported By', value: `${interaction.user} (${interaction.user.id})`, inline: false },
            { name: 'Channel', value: `<#${interaction.channelId}>`, inline: true },
            { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
          )
          .setFooter({ text: `Report ID: ${reportId}` })
          .setTimestamp();
        
        // Add evidence if provided
        if (evidence) {
          reportEmbed.setImage(evidence.url);
          reportEmbed.addFields({ 
            name: 'Evidence Attached', 
            value: `[View Attachment](${evidence.url})`,
            inline: false 
          });
        }
        
        // Get report channel ID
        const reportChannelId = await ReportService.getReportChannel(interaction.guildId!);
        
        // Handle missing report channel
        if (!reportChannelId) {
          return interaction.reply({
            content: 'The reporting system is not properly configured. Please contact an administrator.',
            ephemeral: true
          });
        }
        
        // Attempt to send to reports channel
        try {
          const reportChannel = await interaction.client.channels.fetch(reportChannelId);
          
          // Check if the channel is a text channel
          if (!reportChannel || reportChannel.type !== ChannelType.GuildText) {
            return interaction.reply({
              content: 'The reporting system is not properly configured. Please contact an administrator.',
              ephemeral: true
            });
          }
          
          // Send the report
          await (reportChannel as TextChannel).send({
            embeds: [reportEmbed]
          });
          
          // Send confirmation to user
          return interaction.reply({
            content: 'Your report has been submitted to the moderation team. Thank you for helping keep the server safe.',
            ephemeral: true
          });
          
        } catch (error) {
          console.error('Error sending report:', error instanceof Error ? error.message : String(error));
          
          return interaction.reply({
            content: 'There was an error submitting your report. Please try again later or contact a moderator directly.',
            ephemeral: true
          });
        }
      }
    } catch (error) {
      console.error('Error processing report command:', error instanceof Error ? error.message : String(error));
      
      return interaction.reply({
        content: 'There was an error processing your command. Please try again later.',
        ephemeral: true
      });
    }
  }
} as Command; 