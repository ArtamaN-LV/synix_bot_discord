import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  GuildMember,
  User,
  EmbedBuilder,
  time,
  UserResolvable,
  TextChannel
} from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { COLORS } from '../../utils/constants';

// Function to parse duration string (e.g., "1d", "2h", "30m") to milliseconds
function parseDuration(durationStr: string): number | null {
  const regex = /^(\d+)([smhd])$/;
  const match = durationStr.match(regex);
  
  if (!match) return null;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value * 1000; // seconds to ms
    case 'm': return value * 60 * 1000; // minutes to ms
    case 'h': return value * 60 * 60 * 1000; // hours to ms
    case 'd': return value * 24 * 60 * 60 * 1000; // days to ms
    default: return null;
  }
}

// These commands have been consolidated into a single moderation.ts file
// The individual files have been removed

export const data = new SlashCommandBuilder()
  .setName('moderation')
  .setDescription('All moderation commands in one place')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  
  // Ban subcommand
  .addSubcommand(subcommand =>
    subcommand
      .setName('ban')
      .setDescription('Ban a user from the server')
      .addUserOption(option => 
        option
          .setName('user')
          .setDescription('The user to ban')
          .setRequired(true)
      )
      .addStringOption(option => 
        option
          .setName('reason')
          .setDescription('The reason for banning')
          .setRequired(false)
      )
      .addBooleanOption(option => 
        option
          .setName('delete_messages')
          .setDescription('Delete messages from the user')
          .setRequired(false)
      )
      .addIntegerOption(option => 
        option
          .setName('days')
          .setDescription('Number of days of messages to delete (0-7)')
          .setMinValue(0)
          .setMaxValue(7)
          .setRequired(false)
      )
  )
  
  // Unban subcommand
  .addSubcommand(subcommand =>
    subcommand
      .setName('unban')
      .setDescription('Unban a user from the server')
      .addStringOption(option => 
        option
          .setName('user_id')
          .setDescription('The ID of the user to unban')
          .setRequired(true)
      )
      .addStringOption(option => 
        option
          .setName('reason')
          .setDescription('The reason for unbanning')
          .setRequired(false)
      )
  )
  
  // Timeout (mute) subcommand
  .addSubcommand(subcommand =>
    subcommand
      .setName('timeout')
      .setDescription('Timeout (mute) a user')
      .addUserOption(option => 
        option
          .setName('user')
          .setDescription('The user to timeout')
          .setRequired(true)
      )
      .addStringOption(option => 
        option
          .setName('duration')
          .setDescription('Timeout duration (e.g. 1h, 30m, 1d)')
          .setRequired(true)
      )
      .addStringOption(option => 
        option
          .setName('reason')
          .setDescription('The reason for timeout')
          .setRequired(false)
      )
  )
  
  // Clear timeout subcommand
  .addSubcommand(subcommand =>
    subcommand
      .setName('cleartimeout')
      .setDescription('Remove a timeout from a user')
      .addUserOption(option => 
        option
          .setName('user')
          .setDescription('The user to remove timeout from')
          .setRequired(true)
      )
      .addStringOption(option => 
        option
          .setName('reason')
          .setDescription('The reason for removing timeout')
          .setRequired(false)
      )
  )
  
  // Warn subcommand
  .addSubcommand(subcommand =>
    subcommand
      .setName('warn')
      .setDescription('Warn a user')
      .addUserOption(option => 
        option
          .setName('user')
          .setDescription('The user to warn')
          .setRequired(true)
      )
      .addStringOption(option => 
        option
          .setName('reason')
          .setDescription('The reason for warning')
          .setRequired(true)
      )
  )
  
  // Warnlist subcommand
  .addSubcommand(subcommand =>
    subcommand
      .setName('warnlist')
      .setDescription('View warnings for a user')
      .addUserOption(option => 
        option
          .setName('user')
          .setDescription('The user to view warnings for')
          .setRequired(true)
      )
  )
  
  // Unwarn subcommand
  .addSubcommand(subcommand =>
    subcommand
      .setName('unwarn')
      .setDescription('Remove warnings from a user')
      .addUserOption(option => 
        option
          .setName('user')
          .setDescription('The user to remove warnings from')
          .setRequired(true)
      )
      .addStringOption(option => 
        option
          .setName('warning_id')
          .setDescription('Specific warning ID to remove (leave empty to remove all)')
          .setRequired(false)
      )
      .addStringOption(option => 
        option
          .setName('reason')
          .setDescription('The reason for removing warnings')
          .setRequired(false)
      )
  )
  
  // Kick subcommand
  .addSubcommand(subcommand =>
    subcommand
      .setName('kick')
      .setDescription('Kick a user from the server')
      .addUserOption(option => 
        option
          .setName('user')
          .setDescription('The user to kick')
          .setRequired(true)
      )
      .addStringOption(option => 
        option
          .setName('reason')
          .setDescription('The reason for kicking')
          .setRequired(false)
      )
  )
  
  // Nickname subcommand
  .addSubcommand(subcommand =>
    subcommand
      .setName('nickname')
      .setDescription('Change a user\'s nickname')
      .addUserOption(option => 
        option
          .setName('user')
          .setDescription('The user to change nickname for')
          .setRequired(true)
      )
      .addStringOption(option => 
        option
          .setName('nickname')
          .setDescription('The new nickname (leave empty to remove)')
          .setRequired(false)
      )
  )
  
  // Clear history subcommand
  .addSubcommand(subcommand =>
    subcommand
      .setName('clearhistory')
      .setDescription('Clear moderation history for a user')
      .addUserOption(option => 
        option
          .setName('user')
          .setDescription('The user to clear history for')
          .setRequired(true)
      )
      .addStringOption(option => 
        option
          .setName('reason')
          .setDescription('The reason for clearing history')
          .setRequired(false)
      )
  )
  
  // Clear channel subcommand
  .addSubcommand(subcommand =>
    subcommand
      .setName('clearchannel')
      .setDescription('Clear all messages in a channel')
      .addBooleanOption(option => 
        option
          .setName('confirmation')
          .setDescription('Set to true to confirm this action')
          .setRequired(true)
      )
      .addChannelOption(option => 
        option
          .setName('channel')
          .setDescription('The channel to clear (defaults to current channel)')
          .setRequired(false)
      )
      .addStringOption(option => 
        option
          .setName('reason')
          .setDescription('The reason for clearing the channel')
          .setRequired(false)
      )
  )
  
  // History subcommand
  .addSubcommand(subcommand =>
    subcommand
      .setName('history')
      .setDescription('View moderation history for a user')
      .addUserOption(option => 
        option
          .setName('user')
          .setDescription('The user to view history for')
          .setRequired(true)
      )
  )
  
  // Purge subcommand
  .addSubcommand(subcommand =>
    subcommand
      .setName('purge')
      .setDescription('Delete multiple messages')
      .addIntegerOption(option => 
        option
          .setName('amount')
          .setDescription('Number of messages to delete (1-100)')
          .setMinValue(1)
          .setMaxValue(100)
          .setRequired(true)
      )
      .addUserOption(option => 
        option
          .setName('user')
          .setDescription('Delete messages from this user only')
          .setRequired(false)
      )
  )
  
  // Slowmode subcommand
  .addSubcommand(subcommand =>
    subcommand
      .setName('slowmode')
      .setDescription('Set slowmode for a channel')
      .addIntegerOption(option => 
        option
          .setName('seconds')
          .setDescription('Slowmode delay in seconds (0 to disable)')
          .setMinValue(0)
          .setMaxValue(21600) // 6 hours max
          .setRequired(true)
      )
      .addChannelOption(option => 
        option
          .setName('channel')
          .setDescription('The channel to set slowmode for (defaults to current channel)')
          .setRequired(false)
      )
  )
  
  // Tempban subcommand
  .addSubcommand(subcommand =>
    subcommand
      .setName('tempban')
      .setDescription('Temporarily ban a user')
      .addUserOption(option => 
        option
          .setName('user')
          .setDescription('The user to temporarily ban')
          .setRequired(true)
      )
      .addStringOption(option => 
        option
          .setName('duration')
          .setDescription('Ban duration (e.g. 1h, 30m, 1d, 7d)')
          .setRequired(true)
      )
      .addStringOption(option => 
        option
          .setName('reason')
          .setDescription('The reason for temporary ban')
          .setRequired(false)
      )
  )
  
  // Temprole subcommand
  .addSubcommand(subcommand =>
    subcommand
      .setName('temprole')
      .setDescription('Give a user a temporary role')
      .addUserOption(option => 
        option
          .setName('user')
          .setDescription('The user to give the role to')
          .setRequired(true)
      )
      .addRoleOption(option => 
        option
          .setName('role')
          .setDescription('The role to assign temporarily')
          .setRequired(true)
      )
      .addStringOption(option => 
        option
          .setName('duration')
          .setDescription('Role duration (e.g. 1h, 30m, 1d, 7d)')
          .setRequired(true)
      )
      .addStringOption(option => 
        option
          .setName('reason')
          .setDescription('The reason for giving temporary role')
          .setRequired(false)
      )
  )
  
  // Set note subcommand
  .addSubcommand(subcommand =>
    subcommand
      .setName('setnote')
      .setDescription('Add a note about a user')
      .addUserOption(option => 
        option
          .setName('user')
          .setDescription('The user to add a note for')
          .setRequired(true)
      )
      .addStringOption(option => 
        option
          .setName('note')
          .setDescription('The note content')
          .setRequired(true)
      )
  )
  
  // View note subcommand
  .addSubcommand(subcommand =>
    subcommand
      .setName('viewnote')
      .setDescription('View notes about a user')
      .addUserOption(option => 
        option
          .setName('user')
          .setDescription('The user to view notes for')
          .setRequired(true)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    if (!interaction.guild) {
      const guildOnlyEmbed = EmbedBuilderService.warning('This command can only be used in a server.');
      return await interaction.reply({ embeds: [guildOnlyEmbed], ephemeral: true });
    }

    // Get the subcommand
    const subcommand = interaction.options.getSubcommand();

    // Execute the appropriate subcommand handler
    switch (subcommand) {
      case 'ban':
        await handleBan(interaction);
        break;
      case 'unban':
        await handleUnban(interaction);
        break;
      case 'timeout':
        await handleTimeout(interaction);
        break;
      case 'cleartimeout':
        await handleClearTimeout(interaction);
        break;
      case 'warn':
        // Handler for warn command - to be implemented
        await interaction.reply({ content: 'This command is not yet implemented', ephemeral: true });
        break;
      case 'warnlist':
        // Handler for warnlist command - to be implemented
        await interaction.reply({ content: 'This command is not yet implemented', ephemeral: true });
        break;
      case 'unwarn':
        // Handler for unwarn command - to be implemented
        await interaction.reply({ content: 'This command is not yet implemented', ephemeral: true });
        break;
      case 'kick':
        await handleKick(interaction);
        break;
      case 'nickname':
        await handleNickname(interaction);
        break;
      case 'clearhistory':
        // Handler for clearhistory command - to be implemented
        await interaction.reply({ content: 'This command is not yet implemented', ephemeral: true });
        break;
      case 'clearchannel':
        await handleClearChannel(interaction);
        break;
      case 'history':
        // Handler for history command - to be implemented
        await interaction.reply({ content: 'This command is not yet implemented', ephemeral: true });
        break;
      case 'purge':
        await handlePurge(interaction);
        break;
      case 'slowmode':
        // Handler for slowmode command - to be implemented
        await interaction.reply({ content: 'This command is not yet implemented', ephemeral: true });
        break;
      case 'tempban':
        // Handler for tempban command - to be implemented
        await interaction.reply({ content: 'This command is not yet implemented', ephemeral: true });
        break;
      case 'temprole':
        // Handler for temprole command - to be implemented
        await interaction.reply({ content: 'This command is not yet implemented', ephemeral: true });
        break;
      case 'setnote':
        // Handler for setnote command - to be implemented
        await interaction.reply({ content: 'This command is not yet implemented', ephemeral: true });
        break;
      case 'viewnote':
        // Handler for viewnote command - to be implemented
        await interaction.reply({ content: 'This command is not yet implemented', ephemeral: true });
        break;
      default:
        const errorEmbed = EmbedBuilderService.error(`Unknown subcommand: ${subcommand}`);
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  } catch (error) {
    console.error('Error in moderation command:', error);
    
    const errorEmbed = EmbedBuilderService.error('An error occurred while executing the moderation command.');
    
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
  }
}

// Ban command handler
async function handleBan(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  
  const targetUser = interaction.options.getUser('user');
  if (!targetUser) {
    return await interaction.editReply({
      embeds: [EmbedBuilderService.error('User not found.')]
    });
  }
  
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const deleteMessageDays = interaction.options.getInteger('days') || 0;
  
  // Check if the target user can be banned
  const member = interaction.guild?.members.cache.get(targetUser.id);
  if (member) {
    // Check if the bot can ban this user (role hierarchy)
    if (!member.bannable) {
      return await interaction.editReply({
        embeds: [EmbedBuilderService.error('I cannot ban this user. They may have a higher role than me.')]
      });
    }
    
    // Check if the user trying to ban has a higher role than the target
    const executorMember = interaction.member as GuildMember;
    if (executorMember.roles.highest.position <= member.roles.highest.position) {
      return await interaction.editReply({
        embeds: [EmbedBuilderService.error('You cannot ban this user as they have an equal or higher role than you.')]
      });
    }
  }
  
  try {
    // Ban the user
    await interaction.guild?.members.ban(targetUser.id, {
      deleteMessageSeconds: deleteMessageDays * 86400, // Convert days to seconds
      reason: `${reason} (Banned by ${interaction.user.tag})`
    });
    
    // Create success embed
    const banEmbed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setTitle('User Banned')
      .setDescription(`**${targetUser.tag}** has been banned from the server.`)
      .addFields(
        { name: 'User ID', value: targetUser.id },
        { name: 'Reason', value: reason },
        { name: 'Message History', value: `${deleteMessageDays} days of messages deleted` }
      )
      .setThumbnail(targetUser.displayAvatarURL())
      .setFooter({ text: `Banned by ${interaction.user.tag}` })
      .setTimestamp();
    
    return await interaction.editReply({ embeds: [banEmbed] });
  } catch (error) {
    console.error('Error banning user:', error);
    return await interaction.editReply({
      embeds: [EmbedBuilderService.error(`Failed to ban the user: ${error}`)]
    });
  }
}

// Unban command handler
async function handleUnban(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  
  const userId = interaction.options.getString('user_id');
  if (!userId) {
    return await interaction.editReply({
      embeds: [EmbedBuilderService.error('User ID is required.')]
    });
  }
  
  const reason = interaction.options.getString('reason') || 'No reason provided';
  
  try {
    // Check if the user is banned
    const bans = await interaction.guild?.bans.fetch();
    const bannedUser = bans?.find(ban => ban.user.id === userId);
    
    if (!bannedUser) {
      return await interaction.editReply({
        embeds: [EmbedBuilderService.error('This user is not banned.')]
      });
    }
    
    // Unban the user
    await interaction.guild?.members.unban(userId, `${reason} (Unbanned by ${interaction.user.tag})`);
    
    // Create success embed
    const unbanEmbed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setTitle('User Unbanned')
      .setDescription(`User with ID **${userId}** has been unbanned from the server.`)
      .addFields(
        { name: 'User ID', value: userId },
        { name: 'Reason', value: reason }
      )
      .setFooter({ text: `Unbanned by ${interaction.user.tag}` })
      .setTimestamp();
    
    return await interaction.editReply({ embeds: [unbanEmbed] });
  } catch (error) {
    console.error('Error unbanning user:', error);
    return await interaction.editReply({
      embeds: [EmbedBuilderService.error(`Failed to unban the user: ${error}`)]
    });
  }
}

// Kick command handler
async function handleKick(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  
  const targetUser = interaction.options.getUser('user');
  if (!targetUser) {
    return await interaction.editReply({
      embeds: [EmbedBuilderService.error('User not found.')]
    });
  }
  
  const reason = interaction.options.getString('reason') || 'No reason provided';
  
  // Check if the target user is in the guild
  const member = interaction.guild?.members.cache.get(targetUser.id);
  if (!member) {
    return await interaction.editReply({
      embeds: [EmbedBuilderService.error('This user is not in the server.')]
    });
  }
  
  // Check if the bot can kick this user
  if (!member.kickable) {
    return await interaction.editReply({
      embeds: [EmbedBuilderService.error('I cannot kick this user. They may have a higher role than me.')]
    });
  }
  
  // Check if the user trying to kick has a higher role than the target
  const executorMember = interaction.member as GuildMember;
  if (executorMember.roles.highest.position <= member.roles.highest.position) {
    return await interaction.editReply({
      embeds: [EmbedBuilderService.error('You cannot kick this user as they have an equal or higher role than you.')]
    });
  }
  
  try {
    // Kick the user
    await member.kick(`${reason} (Kicked by ${interaction.user.tag})`);
    
    // Create success embed
    const kickEmbed = new EmbedBuilder()
      .setColor(COLORS.WARNING)
      .setTitle('User Kicked')
      .setDescription(`**${targetUser.tag}** has been kicked from the server.`)
      .addFields(
        { name: 'User ID', value: targetUser.id },
        { name: 'Reason', value: reason }
      )
      .setThumbnail(targetUser.displayAvatarURL())
      .setFooter({ text: `Kicked by ${interaction.user.tag}` })
      .setTimestamp();
    
    return await interaction.editReply({ embeds: [kickEmbed] });
  } catch (error) {
    console.error('Error kicking user:', error);
    return await interaction.editReply({
      embeds: [EmbedBuilderService.error(`Failed to kick the user: ${error}`)]
    });
  }
}

// Timeout command handler
async function handleTimeout(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  
  const targetUser = interaction.options.getUser('user');
  if (!targetUser) {
    return await interaction.editReply({
      embeds: [EmbedBuilderService.error('User not found.')]
    });
  }
  
  const durationString = interaction.options.getString('duration');
  if (!durationString) {
    return await interaction.editReply({
      embeds: [EmbedBuilderService.error('Duration is required.')]
    });
  }
  
  const reason = interaction.options.getString('reason') || 'No reason provided';
  
  // Check if the target user is in the guild
  const member = interaction.guild?.members.cache.get(targetUser.id);
  if (!member) {
    return await interaction.editReply({
      embeds: [EmbedBuilderService.error('This user is not in the server.')]
    });
  }
  
  // Check if the bot can timeout this user
  if (!member.moderatable) {
    return await interaction.editReply({
      embeds: [EmbedBuilderService.error('I cannot timeout this user. They may have a higher role than me.')]
    });
  }
  
  // Check if the user trying to timeout has a higher role than the target
  const executorMember = interaction.member as GuildMember;
  if (executorMember.roles.highest.position <= member.roles.highest.position) {
    return await interaction.editReply({
      embeds: [EmbedBuilderService.error('You cannot timeout this user as they have an equal or higher role than you.')]
    });
  }
  
  try {
    // Parse duration string to milliseconds
    const durationMs = parseDuration(durationString);
    if (!durationMs || durationMs <= 0) {
      return await interaction.editReply({
        embeds: [EmbedBuilderService.error('Invalid duration format. Valid formats: 30s, 5m, 2h, 1d.')]
      });
    }
    
    // Check if duration is within Discord's limits (max 28 days)
    const maxTimeoutDuration = 28 * 24 * 60 * 60 * 1000; // 28 days in milliseconds
    if (durationMs > maxTimeoutDuration) {
      return await interaction.editReply({
        embeds: [EmbedBuilderService.error('Timeout duration cannot exceed 28 days.')]
      });
    }
    
    // Set timeout
    await member.timeout(durationMs, `${reason} (Timed out by ${interaction.user.tag})`);
    
    const endTime = new Date(Date.now() + durationMs);
    
    // Create success embed
    const timeoutEmbed = new EmbedBuilder()
      .setColor(COLORS.WARNING)
      .setTitle('User Timed Out')
      .setDescription(`**${targetUser.tag}** has been timed out.`)
      .addFields(
        { name: 'User ID', value: targetUser.id },
        { name: 'Duration', value: durationString },
        { name: 'Expires', value: `<t:${Math.floor(endTime.getTime() / 1000)}:R>` },
        { name: 'Reason', value: reason }
      )
      .setThumbnail(targetUser.displayAvatarURL())
      .setFooter({ text: `Timed out by ${interaction.user.tag}` })
      .setTimestamp();
    
    return await interaction.editReply({ embeds: [timeoutEmbed] });
  } catch (error) {
    console.error('Error timing out user:', error);
    return await interaction.editReply({
      embeds: [EmbedBuilderService.error(`Failed to timeout the user: ${error}`)]
    });
  }
}

// Clear timeout command handler
async function handleClearTimeout(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  
  const targetUser = interaction.options.getUser('user');
  if (!targetUser) {
    return await interaction.editReply({
      embeds: [EmbedBuilderService.error('User not found.')]
    });
  }
  
  const reason = interaction.options.getString('reason') || 'No reason provided';
  
  // Check if the target user is in the guild
  const member = interaction.guild?.members.cache.get(targetUser.id);
  if (!member) {
    return await interaction.editReply({
      embeds: [EmbedBuilderService.error('This user is not in the server.')]
    });
  }
  
  // Check if the user is timed out
  if (!member.communicationDisabledUntil) {
    return await interaction.editReply({
      embeds: [EmbedBuilderService.error('This user is not timed out.')]
    });
  }
  
  try {
    // Remove timeout
    await member.timeout(null, `${reason} (Timeout removed by ${interaction.user.tag})`);
    
    // Create success embed
    const clearTimeoutEmbed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setTitle('Timeout Removed')
      .setDescription(`Timeout has been removed from **${targetUser.tag}**.`)
      .addFields(
        { name: 'User ID', value: targetUser.id },
        { name: 'Reason', value: reason }
      )
      .setThumbnail(targetUser.displayAvatarURL())
      .setFooter({ text: `Timeout removed by ${interaction.user.tag}` })
      .setTimestamp();
    
    return await interaction.editReply({ embeds: [clearTimeoutEmbed] });
  } catch (error) {
    console.error('Error removing timeout:', error);
    return await interaction.editReply({
      embeds: [EmbedBuilderService.error(`Failed to remove timeout: ${error}`)]
    });
  }
}

// Nickname command handler
async function handleNickname(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  
  const targetUser = interaction.options.getUser('user');
  if (!targetUser) {
    return await interaction.editReply({
      embeds: [EmbedBuilderService.error('User not found.')]
    });
  }
  
  const newNickname = interaction.options.getString('nickname') || null; // null will reset the nickname
  
  // Check if the target user is in the guild
  const member = interaction.guild?.members.cache.get(targetUser.id);
  if (!member) {
    return await interaction.editReply({
      embeds: [EmbedBuilderService.error('This user is not in the server.')]
    });
  }
  
  // Check if the bot can manage this user's nickname
  if (!member.manageable) {
    return await interaction.editReply({
      embeds: [EmbedBuilderService.error('I cannot change this user\'s nickname. They may have a higher role than me.')]
    });
  }
  
  // Check if the user trying to change nickname has a higher role than the target
  const executorMember = interaction.member as GuildMember;
  if (executorMember.roles.highest.position <= member.roles.highest.position && interaction.user.id !== interaction.guild?.ownerId) {
    return await interaction.editReply({
      embeds: [EmbedBuilderService.error('You cannot change this user\'s nickname as they have an equal or higher role than you.')]
    });
  }
  
  try {
    const oldNickname = member.nickname || member.user.username;
    
    // Set new nickname
    await member.setNickname(newNickname, `Nickname changed by ${interaction.user.tag}`);
    
    // Create success embed
    const nicknameEmbed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setTitle('Nickname Changed')
      .setDescription(`**${targetUser.tag}**'s nickname has been ${newNickname ? 'changed' : 'reset'}.`)
      .addFields(
        { name: 'User ID', value: targetUser.id },
        { name: 'Old Nickname', value: oldNickname },
        { name: 'New Nickname', value: newNickname || 'Reset to username' }
      )
      .setThumbnail(targetUser.displayAvatarURL())
      .setFooter({ text: `Changed by ${interaction.user.tag}` })
      .setTimestamp();
    
    return await interaction.editReply({ embeds: [nicknameEmbed] });
  } catch (error) {
    console.error('Error changing nickname:', error);
    return await interaction.editReply({
      embeds: [EmbedBuilderService.error(`Failed to change nickname: ${error}`)]
    });
  }
}

// Purge command handler
async function handlePurge(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  
  const amount = interaction.options.getInteger('amount');
  if (!amount || amount < 1 || amount > 100) {
    return await interaction.editReply({
      embeds: [EmbedBuilderService.error('You must specify a number between 1 and 100.')]
    });
  }
  
  const targetUser = interaction.options.getUser('user');
  const channel = interaction.channel as TextChannel;
  
  try {
    // Fetch messages to delete
    let fetchedMessages = await channel.messages.fetch({ limit: amount });
    
    // Filter messages if a user is specified
    if (targetUser) {
      fetchedMessages = fetchedMessages.filter(msg => msg.author.id === targetUser.id);
    }
    
    // Filter out messages older than 14 days (Discord API limitation)
    const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
    const messagesToDelete = fetchedMessages.filter(msg => msg.createdTimestamp > twoWeeksAgo);
    
    if (messagesToDelete.size === 0) {
      return await interaction.editReply({
        embeds: [EmbedBuilderService.warning('No messages found that can be deleted (must be under 14 days old).')]
      });
    }
    
    // Delete messages
    const deleted = await channel.bulkDelete(messagesToDelete, true);
    
    // Create success embed
    const purgeEmbed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setTitle('Messages Purged')
      .setDescription(`Successfully deleted ${deleted.size} messages.`)
      .addFields(
        { name: 'Channel', value: channel.toString() },
        { name: 'User Filter', value: targetUser ? targetUser.tag : 'None' }
      )
      .setFooter({ text: `Purged by ${interaction.user.tag}` })
      .setTimestamp();
    
    return await interaction.editReply({ embeds: [purgeEmbed] });
  } catch (error) {
    console.error('Error purging messages:', error);
    return await interaction.editReply({
      embeds: [EmbedBuilderService.error(`Failed to purge messages: ${error}`)]
    });
  }
}

// Clear channel command handler
async function handleClearChannel(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
    return await interaction.editReply({
      embeds: [EmbedBuilderService.error('You need the Manage Channels permission to use this command.')]
    });
  }
  
  const channel = interaction.channel as TextChannel;
  const confirmation = interaction.options.getBoolean('confirmation');
  
  if (!confirmation) {
    return await interaction.editReply({
      embeds: [EmbedBuilderService.warning('You must confirm this action by setting the confirmation option to true.')]
    });
  }
  
  try {
    // Clone the channel (creates a new one with same permissions and settings)
    const newChannel = await channel.clone({
      reason: `Channel cleared by ${interaction.user.tag}`
    });
    
    // Delete the old channel
    await channel.delete(`Channel cleared by ${interaction.user.tag}`);
    
    // Send confirmation message in new channel
    await newChannel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.SUCCESS)
          .setTitle('Channel Cleared')
          .setDescription(`This channel was cleared by ${interaction.user}.`)
          .setTimestamp()
      ]
    });
    
    // No need to edit reply as the channel where the command was used is gone
  } catch (error) {
    console.error('Error clearing channel:', error);
    try {
      return await interaction.editReply({
        embeds: [EmbedBuilderService.error(`Failed to clear channel: ${error}`)]
      });
    } catch {
      // If the original channel is gone and we can't edit the reply, just ignore
    }
  }
} 