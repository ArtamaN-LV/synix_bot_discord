import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  PermissionFlagsBits,
  EmbedBuilder,
  ButtonBuilder, 
  ActionRowBuilder, 
  ButtonStyle,
  ChannelType,
  Message
} from 'discord.js';
import { Command } from '../../interfaces/command';
import '../../interfaces/commandExtensions'; // Import extensions
import { COLORS } from '../../utils/constants';
import { Logger } from '../../utils/logger';
import { VerificationController } from '../../utils/verificationController';

// Define the command
const command: Command = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Set up or manage the verification system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Create a verification channel and role')
        .addRoleOption(option => 
          option
            .setName('role')
            .setDescription('Role to give upon verification (leave empty to create a new role)')
            .setRequired(false)
        )
        .addChannelOption(option => 
          option
            .setName('channel')
            .setDescription('Channel to use for verification (leave empty to create a new channel)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addStringOption(option => 
          option
            .setName('message')
            .setDescription('Custom verification message (leave empty for default)')
            .setRequired(false)
        )
        .addBooleanOption(option => 
          option
            .setName('captcha')
            .setDescription('Enable CAPTCHA verification (requires users to solve a simple problem)')
            .setRequired(false)
        )
        .addIntegerOption(option => 
          option
            .setName('timeout')
            .setDescription('Auto-kick users who don\'t verify within this many minutes (0 to disable)')
            .setMinValue(0)
            .setMaxValue(1440) // 24 hours max
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disable the verification system')
        .addBooleanOption(option => 
          option
            .setName('delete_channel')
            .setDescription('Delete the verification channel')
            .setRequired(false)
        )
        .addBooleanOption(option => 
          option
            .setName('delete_role')
            .setDescription('Delete the verification role')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('logs')
        .setDescription('View verification logs')
        .addIntegerOption(option => 
          option
            .setName('limit')
            .setDescription('Number of logs to show')
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(false)
        )
    ),

  category: 'moderation',
  cooldown: 10, // 10 seconds cooldown

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'setup') {
      await setupVerification(interaction);
    } else if (subcommand === 'disable') {
      await disableVerification(interaction);
    } else if (subcommand === 'logs') {
      await showVerificationLogs(interaction);
    }
  }
};

/**
 * Sets up the verification system
 */
async function setupVerification(interaction: ChatInputCommandInteraction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const roleId = interaction.options.getRole('role')?.id || null;
    const channelId = interaction.options.getChannel('channel')?.id || null;
    const customMessage = interaction.options.getString('message');
    const enableCaptcha = interaction.options.getBoolean('captcha') ?? false;
    const timeoutMinutes = interaction.options.getInteger('timeout') ?? 0;

    // Use the VerificationController to set up verification
    const result = await VerificationController.setupVerification(
      interaction.guild!,
      roleId,
      channelId,
      customMessage,
      enableCaptcha,
      timeoutMinutes
    );

    // The controller has already set up the right permissions for the channel
    // No need to modify permissions here again

    // Create the verification message
    const defaultMessage = "Welcome to the server! To gain access to all channels, please verify yourself by clicking the button below.";
    const messageContent = customMessage || defaultMessage;

    const verifyEmbed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle('Server Verification')
      .setDescription(messageContent)
      .setFooter({ text: enableCaptcha ? 'You will need to solve a simple CAPTCHA to verify' : 'Click the button below to verify' });

    const verifyButton = new ButtonBuilder()
      .setCustomId('verify_button')
      .setLabel('Verify')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅');

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(verifyButton);

    const verifyMessage = await result.channel.send({
      embeds: [verifyEmbed],
      components: [row]
    });

    // Pin the message
    await verifyMessage.pin();

    // Update permissions for all other channels
    const updatedCount = await VerificationController.updateChannelPermissions(
      interaction.guild!,
      result.role.id,
      result.channel.id
    );

    // Send success response
    const successEmbed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setTitle('Verification System Set Up')
      .setDescription(
        `Verification system has been set up successfully!\n\n` +
        `- Verification Channel: ${result.channel}\n` +
        `- Verification Role: ${result.role}\n` +
        `- CAPTCHA Enabled: ${enableCaptcha ? 'Yes' : 'No'}\n` +
        `- Auto-Timeout: ${timeoutMinutes > 0 ? `${timeoutMinutes} minutes` : 'Disabled'}\n\n` +
        `Updated permissions for ${updatedCount} channels to only be visible to verified members.\n` +
        `The verification channel is now only visible to unverified users.`
      );

    await interaction.editReply({ embeds: [successEmbed] });
  } catch (error) {
    Logger.error('Error setting up verification system:');
    Logger.error(error as Error);
    
    await interaction.editReply({ 
      content: 'An error occurred while setting up the verification system. Please check the bot permissions and try again.' 
    });
  }
}

/**
 * Disables the verification system
 */
async function disableVerification(interaction: ChatInputCommandInteraction) {
  try {
    // Defer the reply to prevent timeout
    await interaction.deferReply({ ephemeral: true });
    
    let settings;
    try {
      // Check if verification is set up
      settings = await VerificationController.getVerificationSettings(interaction.guildId!);
    } catch (error) {
      Logger.error('Error getting verification settings:');
      Logger.error(error as Error);
      return interaction.editReply({
        content: 'An error occurred while retrieving verification settings. Please try again later.'
      });
    }
    
    if (!settings || !settings.enabled) {
      return interaction.editReply({
        content: 'The verification system is not currently enabled in this server.'
      });
    }

    // Store role and channel IDs before disabling
    const roleId = settings.roleId;
    const channelId = settings.channelId;

    // Get user choices for deletion
    const shouldDeleteChannel = interaction.options.getBoolean('delete_channel') ?? true;
    const shouldDeleteRole = interaction.options.getBoolean('delete_role') ?? true;

    // Disable verification
    VerificationController.disableVerification(interaction.guildId!);

    // Reset channel permissions
    const updatedCount = await VerificationController.resetChannelPermissions(interaction.guild!);

    // Try to delete the verification channel and role based on user choices
    let deletedChannel = false;
    let deletedRole = false;
    let channelStatus = '⏭️ Skipped verification channel deletion (not requested).';
    let roleStatus = '⏭️ Skipped verification role deletion (not requested).';
    
    if (shouldDeleteChannel) {
      try {
        // Try to get the verification channel
        const channel = await interaction.guild!.channels.fetch(channelId).catch(() => null);
        if (channel) {
          // Delete the channel
          await channel.delete('Verification system disabled');
          deletedChannel = true;
          channelStatus = '✅ Verification channel deleted successfully.';
        } else {
          channelStatus = '❌ Could not find the verification channel (already deleted?).';
        }
      } catch (error) {
        Logger.error('Error deleting verification channel:');
        Logger.error(error as Error);
        channelStatus = '❌ Error deleting verification channel (insufficient permissions?).';
      }
    }
    
    if (shouldDeleteRole) {
      try {
        // Try to get the verification role
        const role = await interaction.guild!.roles.fetch(roleId).catch(() => null);
        if (role) {
          // Delete the role
          await role.delete('Verification system disabled');
          deletedRole = true;
          roleStatus = '✅ Verification role deleted successfully.';
        } else {
          roleStatus = '❌ Could not find the verification role (already deleted?).';
        }
      } catch (error) {
        Logger.error('Error deleting verification role:');
        Logger.error(error as Error);
        roleStatus = '❌ Error deleting verification role (insufficient permissions?).';
      }
    }

    // Send success message with details of what was done
    const successEmbed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle('Verification System Disabled')
      .setDescription(
        'The verification system has been disabled.\n\n' +
        `Reset permissions for ${updatedCount} channels to allow everyone to view them.\n\n` +
        `${channelStatus}\n` +
        `${roleStatus}`
      );

    await interaction.editReply({
      embeds: [successEmbed]
    });
  } catch (error) {
    Logger.error('Error disabling verification system:');
    Logger.error(error as Error);
    
    // Make sure we have an active interaction to reply to
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ 
        content: 'An error occurred while disabling the verification system.',
        ephemeral: true
      });
    } else {
      await interaction.editReply({ 
        content: 'An error occurred while disabling the verification system.'
      });
    }
  }
}

/**
 * Shows verification logs
 */
async function showVerificationLogs(interaction: ChatInputCommandInteraction) {
  try {
    // Defer the reply to prevent timeout
    await interaction.deferReply({ ephemeral: true });
    
    let settings;
    try {
      // First check if verification is set up at all
      settings = await VerificationController.getVerificationSettings(interaction.guildId!);
    } catch (error) {
      Logger.error('Error getting verification settings:');
      Logger.error(error as Error);
      return interaction.editReply({
        content: 'An error occurred while retrieving verification settings. Please try again later.'
      });
    }
    
    if (!settings) {
      return interaction.editReply({
        content: 'Verification has never been set up on this server.'
      });
    }
    
    const limit = interaction.options.getInteger('limit') || 10;
    
    // Get logs from the controller
    const logs = VerificationController.getVerificationLogs(interaction.guildId!, limit);
    
    if (logs.length === 0) {
      return interaction.editReply({
        content: 'No verification logs found for this server.'
      });
    }

    // Create embed with logs
    const logsEmbed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle('Verification Logs')
      .setDescription(
        logs.map((log, index) => {
          const date = new Date(log.timestamp).toLocaleString();
          return `**${index + 1}.** ${log.username} (${log.userId}) - ${log.action} - ${date}`;
        }).join('\n\n')
      )
      .setFooter({ text: `Showing ${Math.min(logs.length, limit)} logs${settings.enabled ? '' : ' (Verification system is currently disabled)'}` });

    await interaction.editReply({
      embeds: [logsEmbed]
    });
  } catch (error) {
    Logger.error('Error showing verification logs:');
    Logger.error(error as Error);
    
    // Make sure we have an active interaction to reply to
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ 
        content: 'An error occurred while retrieving verification logs.',
        ephemeral: true
      });
    } else {
      await interaction.editReply({ 
        content: 'An error occurred while retrieving verification logs.'
      });
    }
  }
}

/**
 * Handles text-based verification
 */
command.textVerify = async function(message: Message) {
  return VerificationController.handleTextVerification(message);
};

// Export both as CommonJS default export and named export for dynamic imports
module.exports = command;
module.exports.textVerify = command.textVerify;
export { command as default };
export const textVerify = command.textVerify;

// Export the button verification handler
export const handleVerifyButton = VerificationController.handleButtonVerification; 