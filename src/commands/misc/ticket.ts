import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
  Guild,
  GuildMember,
  TextChannel,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  CategoryChannel,
  User,
  ButtonInteraction
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';
import { saveGuildTicketConfig, getGuildTicketConfig } from '../../models/TicketConfig';
import { TicketManager } from '../../utils/ticketManager';

// Map to store active tickets (in a real implementation, store in database)
const activeTickets = new Map();

// Map to store blacklisted users (in a real implementation, store in database)
const blacklistedUsers = new Map();

// Map to store ticket configuration (in a real implementation, store in database)
const ticketConfig = new Map();

// Export the config map so it can be accessed from outside
// export { ticketConfig };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Support ticket system commands')
    // Create ticket subcommand
    .addSubcommand(subcommand => 
      subcommand
        .setName('create')
        .setDescription('Create a support ticket')
        .addStringOption(option => 
          option
            .setName('category')
            .setDescription('Category of your ticket')
            .setRequired(true)
            .addChoices(
              { name: 'General Support', value: 'general' },
              { name: 'Technical Issue', value: 'technical' },
              { name: 'Report a Bug', value: 'bug' },
              { name: 'Purchase Problem', value: 'purchase' },
              { name: 'Other', value: 'other' }
            )
        )
        .addStringOption(option => 
          option
            .setName('description')
            .setDescription('Briefly describe your issue')
            .setRequired(true)
        )
    )
    // Add user to ticket subcommand
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a user to a ticket')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to add to the ticket')
            .setRequired(true)
        )
    )
    // Remove user from ticket subcommand
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a user from a ticket')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to remove from the ticket')
            .setRequired(true)
        )
    )
    // Close ticket subcommand
    .addSubcommand(subcommand =>
      subcommand
        .setName('close')
        .setDescription('Close the current ticket')
    )
    // Delete ticket subcommand
    .addSubcommand(subcommand =>
      subcommand
        .setName('delete')
        .setDescription('Delete the current ticket (staff only)')
    )
    // Setup ticket system subcommand
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Configure the ticket system')
        .addChannelOption(option =>
          option
            .setName('category')
            .setDescription('The category where tickets will be created')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
        .addRoleOption(option =>
          option
            .setName('support_role')
            .setDescription('The role that can view and manage tickets')
            .setRequired(true)
        )
        .addChannelOption(option =>
          option
            .setName('logs_channel')
            .setDescription('The channel where ticket logs will be sent')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName('ticket_limit')
            .setDescription('Maximum number of tickets a user can have open at once (default: 1)')
            .setMinValue(1)
            .setMaxValue(5)
            .setRequired(false)
        )
    )
    // Create panel subcommand
    .addSubcommand(subcommand =>
      subcommand
        .setName('panel')
        .setDescription('Create a ticket panel with select menu for category selection')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('The channel to post the ticket panel in')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    // Blacklist user subcommand
    .addSubcommand(subcommand =>
      subcommand
        .setName('blacklist')
        .setDescription('Blacklist a user from creating tickets')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to blacklist from creating tickets')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('The reason for blacklisting this user')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('remove')
            .setDescription('Remove the user from the blacklist instead of adding them')
            .setRequired(false)
        )
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      // Get the subcommand
      const subCommand = interaction.options.getSubcommand();
      
      // Handle different subcommands
      switch(subCommand) {
        case 'create':
          await handleCreate(interaction);
          break;
        case 'add':
          await handleAdd(interaction);
          break;
        case 'remove':
          await handleRemove(interaction);
          break;
        case 'close':
          // Check if in a ticket channel
          if (!interaction.channel || 
              !interaction.channel.isTextBased() || 
              interaction.channel.isDMBased() || 
              interaction.channel.type !== ChannelType.GuildText ||
              !interaction.channel.name.startsWith('ticket-')) {
            
            return interaction.reply({
              content: 'This command can only be used in a ticket channel.',
              ephemeral: true
            });
          }
          
          const closeSuccess = await executeCloseTicket(
            interaction.channel as TextChannel,
            interaction.user,
            interaction.guild!
          );
          
          if (closeSuccess) {
            return interaction.reply({
              content: 'Ticket has been closed.',
              ephemeral: true
            });
          } else {
            return interaction.reply({
              content: 'Failed to close the ticket. Please try again or contact a staff member.',
              ephemeral: true
            });
          }
          break;
        case 'delete':
          // Check if in a ticket channel
          if (!interaction.channel || 
              !interaction.channel.isTextBased() || 
              interaction.channel.isDMBased() || 
              interaction.channel.type !== ChannelType.GuildText ||
              !interaction.channel.name.startsWith('ticket-')) {
            
            return interaction.reply({
              content: 'This command can only be used in a ticket channel.',
              ephemeral: true
            });
          }
          
          // Check if user has permission
          const member = interaction.member as GuildMember;
          const isStaff = member.permissions.has(PermissionFlagsBits.ManageChannels);
          
          if (!isStaff) {
            return interaction.reply({
              content: 'Only staff members can delete tickets.',
              ephemeral: true
            });
          }
          
          const deleteSuccess = await executeDeleteTicket(
            interaction.channel as TextChannel,
            interaction.user,
            interaction.guild!
          );
          
          if (deleteSuccess) {
            return interaction.reply({
              content: 'Ticket will be deleted shortly.',
              ephemeral: true
            });
          } else {
            return interaction.reply({
              content: 'Failed to delete the ticket. Please try again or contact an administrator.',
              ephemeral: true
            });
          }
          break;
        case 'setup':
          await handleSetup(interaction);
          break;
        case 'panel':
          await handlePanel(interaction);
          break;
        case 'blacklist':
          await handleBlacklist(interaction);
          break;
        default:
          await interaction.reply({
            content: 'Unknown subcommand.',
            ephemeral: true
          });
      }
    } catch (error) {
      console.error('Error processing ticket command:', error instanceof Error ? error.message : String(error));
      
      return interaction.reply({
        content: 'There was an error processing your command. Please try again later.',
        ephemeral: true
      });
    }
  }
} as Command;

// Handle ticket create subcommand
async function handleCreate(interaction: ChatInputCommandInteraction) {
  // Get options
  const category = interaction.options.getString('category', true);
  const description = interaction.options.getString('description', true);
  
  // Category titles for readability
  const categoryTitles = {
    general: 'General Support',
    technical: 'Technical Issue',
    bug: 'Bug Report',
    purchase: 'Purchase Problem',
    other: 'Other'
  };
  
  // Check if user is blacklisted
  if (blacklistedUsers.has(interaction.user.id)) {
    const blacklistInfo = blacklistedUsers.get(interaction.user.id);
    return interaction.reply({
      content: `You are blacklisted from creating tickets. Reason: ${blacklistInfo.reason}`,
      ephemeral: true
    });
  }
  
  // Check for existing open ticket from this user
  const existingTicket = Array.from(activeTickets.values()).find(
    (ticket: any) => ticket.userId === interaction.user.id && !ticket.closed
  );
  
  if (existingTicket) {
    return interaction.reply({
      content: `You already have an open ticket. Please use <#${existingTicket.channelId}> for your support needs.`,
      ephemeral: true
    });
  }
  
  // Get ticket configuration from database first, then fallback to memory map
  let ticketCategoryId, supportRoleId;
  try {
    // Try to get from database first
    const dbConfig = await getGuildTicketConfig(interaction.guildId!);
    
    if (dbConfig) {
      // Use database config
      ticketCategoryId = dbConfig.categoryId;
      supportRoleId = dbConfig.supportRoleId;
    } else {
      // Fallback to memory map
      const config = ticketConfig.get(interaction.guildId);
      ticketCategoryId = config?.categoryId || process.env.TICKET_CATEGORY_ID;
      supportRoleId = config?.supportRoleId || process.env.SUPPORT_ROLE_ID;
    }
  } catch (error) {
    console.error('Error fetching ticket config from database:', error);
    // Fallback to memory map
    const config = ticketConfig.get(interaction.guildId);
    ticketCategoryId = config?.categoryId || process.env.TICKET_CATEGORY_ID;
    supportRoleId = config?.supportRoleId || process.env.SUPPORT_ROLE_ID;
  }
  
  if (!ticketCategoryId) {
    return interaction.reply({
      content: 'The ticket system is not properly configured. Please contact an administrator to run `/ticket setup`.',
      ephemeral: true
    });
  }
  
  // Verify the category exists
  const guild = interaction.guild as Guild;
  if (!guild) {
    return interaction.reply({
      content: 'This command can only be used in a server.',
      ephemeral: true
    });
  }
  
  const categoryChannel = guild.channels.cache.get(ticketCategoryId) as CategoryChannel;
  if (!categoryChannel || categoryChannel.type !== ChannelType.GuildCategory) {
    return interaction.reply({
      content: 'The ticket category no longer exists. Please contact an administrator to run `/ticket setup` again.',
      ephemeral: true
    });
  }
  
  // Create ticket ID
  const ticketId = `${interaction.user.username.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-5)}`;
  
  // Create channel name
  const channelName = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}-${ticketId.toLowerCase()}`;
  
  // Set up permissions for the ticket channel
  const channelPermissions = [
    {
      id: guild.id, // @everyone role
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory
      ]
    }
  ];
  
  // Add support role permissions if configured
  if (supportRoleId) {
    channelPermissions.push({
      id: supportRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory
      ]
    });
  }
  
  // Create the ticket channel
  let ticketChannel;
  try {
    ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: categoryChannel.id,
      permissionOverwrites: channelPermissions,
      topic: `Support ticket for ${interaction.user.tag} | ID: ${ticketId} | Category: ${categoryTitles[category as keyof typeof categoryTitles]}`
    });
  } catch (error) {
    console.error('Error creating ticket channel:', error instanceof Error ? error.message : String(error));
    return interaction.reply({
      content: 'There was an error creating your ticket. Please try again later or contact a moderator.',
      ephemeral: true
    });
  }
  
  // Store ticket data
  const ticketData = {
    id: ticketId,
    channelId: ticketChannel.id,
    userId: interaction.user.id,
    category,
    description,
    createdAt: new Date(),
    closed: false
  };
  
  activeTickets.set(ticketId, ticketData);
  
  // Create ticket embed
  const ticketEmbed = new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle(`🎫 Ticket #${ticketId}`)
    .setDescription('Thank you for creating a ticket. Our support team will assist you as soon as possible.')
    .addFields(
      { 
        name: '📝 Category', 
        value: `${categoryTitles[category as keyof typeof categoryTitles]}`,
        inline: true 
      },
      { 
        name: '👤 Created By', 
        value: `<@${interaction.user.id}>`, 
        inline: true 
      },
      { 
        name: '⏰ Created At',
        value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
        inline: true
      },
      { 
        name: '📋 Description', 
        value: `>>> ${description}`, 
        inline: false 
      }
    )
    .setFooter({ text: `Ticket ID: ${ticketId} • Use the buttons below to manage this ticket` })
    .setTimestamp();
  
  // Create ticket control buttons
  const closeButton = new ButtonBuilder()
    .setCustomId(`ticket_close_${ticketId}`)
    .setLabel('Close Ticket')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('🔒');
  
  const claimButton = new ButtonBuilder()
    .setCustomId(`ticket_claim_${ticketId}`)
    .setLabel('Claim Ticket')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('✋');
  
  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(claimButton, closeButton);
  
  // Send initial message in ticket channel
  const ticketMessage = await ticketChannel.send({
    content: supportRoleId ? `<@${interaction.user.id}> <@&${supportRoleId}>` : `<@${interaction.user.id}>`,
    embeds: [ticketEmbed],
    components: [row]
  });
  
  // Pin the message
  await ticketMessage.pin();
  
  // Set up button collector
  const collector = ticketMessage.createMessageComponentCollector({
    componentType: ComponentType.Button
  });
  
  collector.on('collect', async (i) => {
    // Check if user is staff (has manage channels permission)
    const member = i.member as GuildMember;
    const isStaff = member.permissions.has(PermissionFlagsBits.ManageChannels);
    
    // Claim ticket
    if (i.customId === `ticket_claim_${ticketId}`) {
      if (!isStaff) {
        await i.reply({
          content: 'Only staff members can claim tickets.',
          ephemeral: true
        });
        return;
      }
      
      // Update ticket embed
      const claimedEmbed = EmbedBuilder.from(ticketMessage.embeds[0])
        .addFields({ name: 'Claimed By', value: `${i.user}`, inline: true });
      
      // Update buttons
      const updatedCloseButton = ButtonBuilder.from(closeButton)
        .setCustomId(`ticket_close_${ticketId}`);
      
      const updatedClaimButton = ButtonBuilder.from(claimButton)
        .setDisabled(true)
        .setLabel('Claimed')
        .setCustomId(`ticket_claimed_${ticketId}`);
      
      const updatedRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(updatedClaimButton, updatedCloseButton);
      
      // Update message
      await ticketMessage.edit({
        embeds: [claimedEmbed],
        components: [updatedRow]
      });
      
      await i.reply({
        content: `Ticket claimed by ${i.user}.`
      });
      
    // Close ticket
    } else if (i.customId === `ticket_close_${ticketId}`) {
      // Allow the ticket creator or staff to close it
      if (i.user.id !== interaction.user.id && !isStaff) {
        await i.reply({
          content: 'Only the ticket creator or staff members can close this ticket.',
          ephemeral: true
        });
        return;
      }
      
      // Update ticket data
      const ticketInfo = activeTickets.get(ticketId);
      if (ticketInfo) {
        ticketInfo.closed = true;
        activeTickets.set(ticketId, ticketInfo);
      }
      
      // Create close confirmation
      const closedEmbed = new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle(`Ticket #${ticketId} - CLOSED`)
        .setDescription(`This ticket has been closed by ${i.user}.`)
        .setTimestamp();
      
      await i.reply({
        embeds: [closedEmbed]
      });
      
      // Update buttons to show ticket is closed
      const transcriptButton = new ButtonBuilder()
        .setCustomId(`ticket_transcript_${ticketId}`)
        .setLabel('Save Transcript')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📑');
      
      const deleteButton = new ButtonBuilder()
        .setCustomId(`ticket_delete_${ticketId}`)
        .setLabel('Delete Ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🗑️');
      
      const closedRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(transcriptButton, deleteButton);
      
      // Update the original message
      await ticketMessage.edit({
        components: [closedRow]
      });
      
      // Change channel permissions
      await ticketChannel.permissionOverwrites.edit(interaction.user.id, {
        SendMessages: false
      });
      
      // Create transcript (basic implementation)
      await generateTranscript(ticketChannel, ticketId, interaction.guild!, i.user);
      
    } else if (i.customId === `ticket_transcript_${ticketId}`) {
      // Only allow staff to generate transcript
      if (!isStaff) {
        await i.reply({
          content: 'Only staff members can generate transcripts.',
          ephemeral: true
        });
        return;
      }
      
      await i.deferReply();
      
      // Generate transcript
      await generateTranscript(ticketChannel, ticketId, interaction.guild!, i.user);
      
      await i.editReply({
        content: 'Transcript has been generated and sent to the logs channel.'
      });
      
    } else if (i.customId === `ticket_delete_${ticketId}`) {
      // Only allow staff to delete ticket
      if (!isStaff) {
        await i.reply({
          content: 'Only staff members can delete tickets.',
          ephemeral: true
        });
        return;
      }
      
      // Confirm deletion
      const confirmEmbed = new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle('Confirm Ticket Deletion')
        .setDescription('Are you sure you want to delete this ticket? This action cannot be undone.')
        .setTimestamp();
      
      const confirmButton = new ButtonBuilder()
        .setCustomId(`ticket_delete_confirm_${ticketId}`)
        .setLabel('Confirm Delete')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('⚠️');
      
      const cancelButton = new ButtonBuilder()
        .setCustomId(`ticket_delete_cancel_${ticketId}`)
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);
      
      const confirmRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(confirmButton, cancelButton);
      
      const confirmMsg = await i.reply({
        embeds: [confirmEmbed],
        components: [confirmRow],
        fetchReply: true
      });
      
      // Create a collector for the confirmation
      const confirmCollector = confirmMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30_000 // 30 seconds to confirm
      });
      
      confirmCollector.on('collect', async (confirmation) => {
        if (confirmation.customId === `ticket_delete_confirm_${ticketId}`) {
          await confirmation.update({
            content: 'Ticket deletion confirmed. Deleting channel...',
            embeds: [],
            components: []
          });
          
          // Generate transcript before deletion
          await generateTranscript(ticketChannel, ticketId, interaction.guild!, i.user, true);
          
          // Delete the channel after a short delay
          setTimeout(async () => {
            try {
              await ticketChannel.delete(`Ticket ${ticketId} deleted by ${i.user.tag}`);
            } catch (error) {
              console.error('Error deleting ticket channel:', error);
            }
          }, 3000);
          
        } else if (confirmation.customId === `ticket_delete_cancel_${ticketId}`) {
          await confirmation.update({
            content: 'Ticket deletion cancelled.',
            embeds: [],
            components: []
          });
        }
      });
      
      confirmCollector.on('end', async (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
          try {
            await confirmMsg.edit({
              content: 'Ticket deletion timed out.',
              embeds: [],
              components: []
            });
          } catch (error) {
            console.error('Error updating confirmation message:', error);
          }
        }
      });
    }
  });
  
  // Send confirmation to user
  return interaction.reply({
    content: `Your ticket has been created! Please head to <#${ticketChannel.id}> to discuss your issue.`,
    ephemeral: true
  });
}

// Handle add user to ticket subcommand
async function handleAdd(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser('user', true);
  
  // Check if this is a ticket channel
  if (!interaction.channel || 
      !interaction.channel.isTextBased() || 
      interaction.channel.isDMBased() || 
      (interaction.channel.type !== ChannelType.GuildText && 
       interaction.channel.type !== ChannelType.PublicThread && 
       interaction.channel.type !== ChannelType.PrivateThread)) {
    return interaction.reply({
      content: 'This command can only be used in a text channel within a server.',
      ephemeral: true
    });
  }
  
  // Now check if it's a ticket channel
  if (!interaction.channel.name.startsWith('ticket-')) {
    return interaction.reply({
      content: 'This command can only be used in a ticket channel.',
      ephemeral: true
    });
  }
  
  // Check if user has permission
  const member = interaction.member as GuildMember;
  const isStaff = member.permissions.has(PermissionFlagsBits.ManageChannels);
  
  // Only allow staff to add users
  if (!isStaff) {
    return interaction.reply({
      content: 'Only staff members can add users to tickets.',
      ephemeral: true
    });
  }
  
  const channel = interaction.channel as TextChannel;
  
  try {
    // Add the user to the ticket
    await channel.permissionOverwrites.edit(targetUser.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true
    });
    
    // Create a success embed
    const successEmbed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setTitle('User Added to Ticket')
      .setDescription(`${targetUser} has been added to the ticket by ${interaction.user}.`)
      .setTimestamp();
    
    return interaction.reply({
      embeds: [successEmbed]
    });
  } catch (error) {
    console.error('Error adding user to ticket:', error instanceof Error ? error.message : String(error));
    
    return interaction.reply({
      content: 'There was an error adding the user to the ticket. Please try again later.',
      ephemeral: true
    });
  }
}

// Handle remove user from ticket subcommand
async function handleRemove(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser('user', true);
  
  // Check if this is a text channel
  if (!interaction.channel || 
      !interaction.channel.isTextBased() || 
      interaction.channel.isDMBased() || 
      (interaction.channel.type !== ChannelType.GuildText && 
       interaction.channel.type !== ChannelType.PublicThread && 
       interaction.channel.type !== ChannelType.PrivateThread)) {
    return interaction.reply({
      content: 'This command can only be used in a text channel within a server.',
      ephemeral: true
    });
  }
  
  // Now check if it's a ticket channel
  if (!interaction.channel.name.startsWith('ticket-')) {
    return interaction.reply({
      content: 'This command can only be used in a ticket channel.',
      ephemeral: true
    });
  }
  
  // Check if user has permission
  const member = interaction.member as GuildMember;
  const isStaff = member.permissions.has(PermissionFlagsBits.ManageChannels);
  
  // Only allow staff to remove users
  if (!isStaff) {
    return interaction.reply({
      content: 'Only staff members can remove users from tickets.',
      ephemeral: true
    });
  }
  
  // Check if trying to remove ticket creator
  const channelName = interaction.channel.name;
  const ticketParts = channelName.split('-');
  if (ticketParts.length >= 2) {
    // Try to extract creator username from the channel name
    const creatorUsername = ticketParts[1].toLowerCase();
    if (targetUser.username.toLowerCase() === creatorUsername) {
      return interaction.reply({
        content: 'You cannot remove the ticket creator from the ticket.',
        ephemeral: true
      });
    }
  }
  
  const channel = interaction.channel as TextChannel;
  
  try {
    // Remove the user from the ticket
    await channel.permissionOverwrites.edit(targetUser.id, {
      ViewChannel: false
    });
    
    // Create a success embed
    const successEmbed = new EmbedBuilder()
      .setColor(COLORS.WARNING)
      .setTitle('User Removed from Ticket')
      .setDescription(`${targetUser} has been removed from the ticket by ${interaction.user}.`)
      .setTimestamp();
    
    return interaction.reply({
      embeds: [successEmbed]
    });
  } catch (error) {
    console.error('Error removing user from ticket:', error instanceof Error ? error.message : String(error));
    
    return interaction.reply({
      content: 'There was an error removing the user from the ticket. Please try again later.',
      ephemeral: true
    });
  }
}

// Handle setup ticket system subcommand
async function handleSetup(interaction: ChatInputCommandInteraction) {
  // Check if user has permission
  const member = interaction.member as GuildMember;
  if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: 'You need Administrator permission to configure the ticket system.',
      ephemeral: true
    });
  }
  
  const category = interaction.options.getChannel('category', true) as CategoryChannel;
  const supportRole = interaction.options.getRole('support_role', true);
  const logsChannel = interaction.options.getChannel('logs_channel') as TextChannel;
  const ticketLimit = interaction.options.getInteger('ticket_limit') || 1;
  
  // Verify the category exists
  if (!category || category.type !== ChannelType.GuildCategory) {
    return interaction.reply({
      content: 'The specified category does not exist or is not a valid category channel.',
      ephemeral: true
    });
  }
  
  // Save configuration both in memory and to process.env (this won't persist across restarts but is useful for demo)
  const config = {
    categoryId: category.id,
    supportRoleId: supportRole.id,
    logsChannelId: logsChannel?.id,
    ticketLimit,
    guildId: interaction.guildId
  };
  
  ticketConfig.set(interaction.guildId, config);
  
  // Set environment variables to persist through code execution
  process.env.TICKET_CATEGORY_ID = category.id;
  process.env.SUPPORT_ROLE_ID = supportRole.id;
  if (logsChannel) {
    process.env.TICKET_LOGS_CHANNEL = logsChannel.id;
  }
  process.env.TICKET_LIMIT = ticketLimit.toString();
  
  // Set up category permissions
  try {
    await category.permissionOverwrites.edit(interaction.guild!.id, {
      ViewChannel: false
    });
    
    await category.permissionOverwrites.edit(supportRole.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      ManageChannels: true
    });
    
    // Save to database
    try {
      await saveGuildTicketConfig(interaction.guildId!, {
        categoryId: category.id,
        supportRoleId: supportRole.id,
        logsChannelId: logsChannel?.id,
        ticketLimit
      });
      
      // Create configuration embed with database saved confirmation
      const configEmbed = new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle('Ticket System Configuration')
        .setDescription('The ticket system has been successfully configured!')
        .addFields(
          { name: 'Ticket Category', value: `<#${category.id}>`, inline: true },
          { name: 'Support Role', value: `<@&${supportRole.id}>`, inline: true },
          { name: 'Logs Channel', value: logsChannel ? `<#${logsChannel.id}>` : 'Not set', inline: true },
          { name: 'Ticket Limit', value: ticketLimit.toString(), inline: true }
        )
        .setFooter({ text: 'Configuration saved to database' })
        .setTimestamp();
      
      return interaction.reply({
        embeds: [configEmbed]
      });
    } catch (dbError) {
      console.error('Error saving ticket configuration to database:', dbError);
      
      // Create configuration embed with fallback note
      const configEmbed = new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle('Ticket System Configuration')
        .setDescription('The ticket system has been successfully configured!')
        .addFields(
          { name: 'Ticket Category', value: `<#${category.id}>`, inline: true },
          { name: 'Support Role', value: `<@&${supportRole.id}>`, inline: true },
          { name: 'Logs Channel', value: logsChannel ? `<#${logsChannel.id}>` : 'Not set', inline: true },
          { name: 'Ticket Limit', value: ticketLimit.toString(), inline: true }
        )
        .setFooter({ text: 'Configuration will persist until bot restart' })
        .setTimestamp();
      
      return interaction.reply({
        embeds: [configEmbed]
      });
    }
  } catch (error) {
    console.error('Error setting up ticket system:', error instanceof Error ? error.message : String(error));
    
    return interaction.reply({
      content: 'There was an error configuring the ticket system. Please check my permissions and try again.',
      ephemeral: true
    });
  }
}

// Handle create ticket panel subcommand
async function handlePanel(interaction: ChatInputCommandInteraction) {
  // Check if user has permission
  const member = interaction.member as GuildMember;
  if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({
      content: 'You need Manage Server permission to create a ticket panel.',
      ephemeral: true
    });
  }
  
  const targetChannel = interaction.options.getChannel('channel', true) as TextChannel;
  
  // Create panel embed
  const panelEmbed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setTitle('🎫 Support Ticket System')
    .setDescription('**Need assistance?** Select a category below to create a support ticket.\n\n*Our team will respond as soon as possible.*')
    .addFields(
      { 
        name: '📋 General Support', 
        value: 'Questions about our services, general information, or account-related inquiries', 
        inline: false 
      },
      { 
        name: '🔧 Technical Issues', 
        value: 'Report technical problems, errors, or difficulties using our systems', 
        inline: false 
      },
      { 
        name: '🐛 Bug Reports', 
        value: 'Found a bug? Let us know with detailed information to help us fix it', 
        inline: false 
      },
      { 
        name: '💰 Billing & Purchases', 
        value: 'Questions about payments, subscriptions, or purchase-related concerns', 
        inline: false 
      }
    )
    .setFooter({ text: `${interaction.guild!.name} • Support Ticket System` })
    .setTimestamp();
  
  // Create dropdown menu for ticket categories
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('ticket_category_select')
    .setPlaceholder('📩 Select a ticket category')
    .addOptions([
      new StringSelectMenuOptionBuilder()
        .setLabel('General Support')
        .setValue('general')
        .setDescription('For general questions and assistance')
        .setEmoji('📋'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Technical Issue')
        .setValue('technical')
        .setDescription('For reporting bugs or technical problems')
        .setEmoji('🔧'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Report a Bug')
        .setValue('bug')
        .setDescription('For reporting bugs in the system')
        .setEmoji('🐛'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Purchase Problem')
        .setValue('purchase')
        .setDescription('For questions about purchases or payments')
        .setEmoji('💰'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Other')
        .setValue('other')
        .setDescription('For any other inquiries')
        .setEmoji('📝')
    ]);
  
  // Create action row for the select menu
  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(selectMenu);
  
  try {
    // Send panel to channel with updated description
    await targetChannel.send({
      embeds: [panelEmbed],
      components: [selectRow]
    });
    
    // Send confirmation
    return interaction.reply({
      content: `Ticket panel has been created in ${targetChannel}.`,
      ephemeral: true
    });
  } catch (error) {
    console.error('Error creating ticket panel:', error instanceof Error ? error.message : String(error));
    
    return interaction.reply({
      content: 'There was an error creating the ticket panel. Please check my permissions and try again.',
      ephemeral: true
    });
  }
}

// Handle blacklist user subcommand
async function handleBlacklist(interaction: ChatInputCommandInteraction) {
  // Check if user has permission
  const member = interaction.member as GuildMember;
  if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({
      content: 'You need Manage Server permission to blacklist users.',
      ephemeral: true
    });
  }
  
  const targetUser = interaction.options.getUser('user', true);
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const remove = interaction.options.getBoolean('remove') || false;
  
  if (remove) {
    // Remove from blacklist
    blacklistedUsers.delete(targetUser.id);
    
    // Create success embed
    const successEmbed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setTitle('User Removed from Blacklist')
      .setDescription(`${targetUser} has been removed from the ticket blacklist.`)
      .addFields(
        { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Timestamp', value: new Date().toISOString(), inline: false }
      )
      .setTimestamp();
    
    return interaction.reply({
      embeds: [successEmbed]
    });
  } else {
    // Add to blacklist
    blacklistedUsers.set(targetUser.id, {
      userId: targetUser.id,
      reason,
      moderatorId: interaction.user.id,
      timestamp: new Date().toISOString()
    });
    
    // Create success embed
    const successEmbed = new EmbedBuilder()
      .setColor(COLORS.WARNING)
      .setTitle('User Blacklisted')
      .setDescription(`${targetUser} has been blacklisted from creating tickets.`)
      .addFields(
        { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Reason', value: reason, inline: false },
        { name: 'Timestamp', value: new Date().toISOString(), inline: false }
      )
      .setTimestamp();
    
    return interaction.reply({
      embeds: [successEmbed]
    });
  }
}

// Helper function to generate transcript
async function generateTranscript(
  channel: TextChannel, 
  ticketId: string, 
  guild: Guild, 
  closedBy: User,
  isDeletion: boolean = false
): Promise<void> {
  try {
    console.log(`Starting transcript generation for ticket #${ticketId}`);
    
    // Fetch messages (up to 100 for this simple implementation)
    const messages = await channel.messages.fetch({ limit: 100 });
    console.log(`Fetched ${messages.size} messages for the transcript`);
    
    const orderedMessages = Array.from(messages.values()).reverse();
    
    // Format messages for transcript
    let transcriptContent = `# Ticket Transcript - #${ticketId}\n`;
    transcriptContent += `Closed by: ${closedBy.tag} (${closedBy.id})\n`;
    transcriptContent += `Date: ${new Date().toISOString()}\n\n`;
    
    // Add messages to transcript
    orderedMessages.forEach(msg => {
      const timestamp = msg.createdAt.toISOString();
      const author = msg.author.tag;
      const content = msg.content || "[NO CONTENT - POSSIBLE EMBED OR ATTACHMENT]";
      
      transcriptContent += `[${timestamp}] ${author}: ${content}\n`;
      
      // Add attachments
      if (msg.attachments.size > 0) {
        msg.attachments.forEach(attachment => {
          transcriptContent += `Attachment: ${attachment.url}\n`;
        });
      }
      
      // Add embeds summary
      if (msg.embeds.length > 0) {
        transcriptContent += `[Contains ${msg.embeds.length} embeds]\n`;
      }
      
      transcriptContent += `\n`;
    });
    
    // Get logs channel from database first, then fallback to memory map
    let logsChannelId;
    try {
      // Try database first
      const dbConfig = await getGuildTicketConfig(guild.id);
      logsChannelId = dbConfig?.logsChannelId;
    } catch (error) {
      console.error('Error fetching logs channel from database:', error);
    }
    
    // If not found in database, check memory map
    if (!logsChannelId) {
      const config = ticketConfig.get(guild.id);
      logsChannelId = config?.logsChannelId || process.env.TICKET_LOGS_CHANNEL;
    }
    
    console.log(`Using logs channel ID: ${logsChannelId}`);
    
    if (!logsChannelId) {
      console.error('No logs channel configured for transcripts. Please set one in /ticket setup');
      
      // Try to send to the channel anyway as a fallback
      await channel.send({
        content: 'Could not generate transcript: No logs channel configured. Please ask an admin to set one in `/ticket setup`.'
      });
      return;
    }
    
    const logsChannel = guild.channels.cache.get(logsChannelId) as TextChannel;
    
    if (!logsChannel) {
      console.error(`Logs channel with ID ${logsChannelId} not found in the guild`);
      
      // Try to send to the ticket channel as a fallback
      await channel.send({
        content: `Could not generate transcript: Logs channel not found (ID: ${logsChannelId}). Please ask an admin to fix the configuration.`
      });
      return;
    }
    
    console.log(`Found logs channel: ${logsChannel.name}`);
    
    // Create transcript embed
    const transcriptEmbed = new EmbedBuilder()
      .setColor(isDeletion ? COLORS.ERROR : COLORS.SUCCESS)
      .setTitle(`Ticket Transcript - #${ticketId}`)
      .setDescription(`Transcript for ticket #${ticketId}`)
      .addFields(
        { name: 'Ticket ID', value: ticketId, inline: true },
        { name: 'Closed By', value: `${closedBy.tag}`, inline: true },
        { name: 'Channel', value: `#${channel.name}`, inline: true },
        { name: 'Status', value: isDeletion ? 'Deleted' : 'Closed', inline: true },
        { name: 'Timestamp', value: new Date().toISOString(), inline: true }
      )
      .setTimestamp();
    
    // Send transcript as a file attachment
    const sentMessage = await logsChannel.send({
      embeds: [transcriptEmbed],
      files: [{
        attachment: Buffer.from(transcriptContent, 'utf-8'),
        name: `transcript-${ticketId}.txt`
      }]
    });
    
    console.log(`Transcript for ticket #${ticketId} sent to logs channel ${logsChannel.name} (${logsChannel.id})`);
    
    // Send confirmation to the ticket channel
    await channel.send({
      content: `✅ Transcript saved to ${logsChannel}. [View Transcript](${sentMessage.url})`
    });
    
  } catch (error) {
    console.error('Error generating transcript:', error instanceof Error ? error.message : String(error));
    console.error(error);
    
    // Try to send error to the ticket channel
    try {
      await channel.send({
        content: `❌ Failed to generate transcript. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } catch (e) {
      console.error('Could not send error message to ticket channel:', e);
    }
  }
}

async function executeCloseTicket(channel: TextChannel, user: User, guild: Guild): Promise<boolean> {
  try {
    // Check if this is a ticket channel
    if (!channel.name.startsWith('ticket-')) {
      return false;
    }
    
    // Extract ticket ID from the channel name or topic
    const ticketIdMatch = channel.topic?.match(/ID: ([A-Z0-9-]+)/) || null;
    let ticketId = ticketIdMatch ? ticketIdMatch[1] : null;
    
    if (!ticketId) {
      // Try to extract from channel name as fallback
      const parts = channel.name.split('-');
      if (parts.length >= 3) {
        ticketId = parts[2].toUpperCase();
      } else {
        // Generate a generic ID if we can't find one
        ticketId = `UNKNOWN-${Date.now().toString().slice(-5)}`;
      }
    }
    
    // Get the user ID from the channel permissions or name
    let userId = null;
    for (const [id, permissions] of channel.permissionOverwrites.cache.entries()) {
      if (id !== guild.id && id !== guild.roles.everyone.id && !guild.roles.cache.has(id)) {
        userId = id;
        break;
      }
    }
    
    // Update database entry if found
    const ticketInfo = userId ? Array.from(activeTickets.values()).find(
      (ticket: any) => ticket.userId === userId && ticket.channelId === channel.id
    ) : null;
    
    if (ticketInfo) {
      ticketInfo.closed = true;
      activeTickets.set(ticketId, ticketInfo);
    }
    
    // Create closed embed
    const closedEmbed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setTitle(`Ticket Closed`)
      .setDescription(`This ticket has been closed by ${user.tag}`)
      .setTimestamp();
    
    await channel.send({
      embeds: [closedEmbed]
    });
    
    // For all users except staff, remove send messages permission
    for (const [id, permissions] of channel.permissionOverwrites.cache.entries()) {
      if (id !== guild.id && id !== guild.roles.everyone.id) {
        try {
          // Skip users with ManageChannels permission (staff)
          const member = await guild.members.fetch(id).catch(() => null);
          if (member && !member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            await channel.permissionOverwrites.edit(id, {
              SendMessages: false
            });
          }
        } catch (error) {
          console.error(`Error updating permissions for ${id}:`, error);
        }
      }
    }
    
    // Generate transcript
    await generateTranscript(channel, ticketId, guild, user);
    
    // Create ticket control buttons
    const transcriptButton = new ButtonBuilder()
      .setCustomId(`ticket_transcript_${ticketId}`)
      .setLabel('Save Transcript')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📑');
    
    const deleteButton = new ButtonBuilder()
      .setCustomId(`ticket_delete_${ticketId}`)
      .setLabel('Delete Ticket')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🗑️');
    
    const reopenButton = new ButtonBuilder()
      .setCustomId(`ticket_reopen_${ticketId}`)
      .setLabel('Reopen Ticket')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🔓');
    
    const controlRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(reopenButton, transcriptButton, deleteButton);
    
    // Send control message
    await channel.send({
      content: 'Ticket controls:',
      components: [controlRow]
    });
    
    return true;
  } catch (error) {
    console.error('Error closing ticket:', error);
    return false;
  }
}

async function executeDeleteTicket(channel: TextChannel, user: User, guild: Guild): Promise<boolean> {
  try {
    // Check if this is a ticket channel
    if (!channel.name.startsWith('ticket-')) {
      return false;
    }
    
    // Extract ticket ID from the channel name or topic
    const ticketIdMatch = channel.topic?.match(/ID: ([A-Z0-9-]+)/) || null;
    let ticketId = ticketIdMatch ? ticketIdMatch[1] : null;
    
    if (!ticketId) {
      // Try to extract from channel name as fallback
      const parts = channel.name.split('-');
      if (parts.length >= 3) {
        ticketId = parts[2].toUpperCase();
      } else {
        // Generate a generic ID if we can't find one
        ticketId = `UNKNOWN-${Date.now().toString().slice(-5)}`;
      }
    }
    
    // Generate transcript before deletion
    await generateTranscript(channel, ticketId, guild, user, true);
    
    // Send delete notice
    await channel.send({
      content: `⚠️ This ticket will be deleted in 5 seconds...`
    });
    
    // Delete channel after delay
    setTimeout(async () => {
      try {
        await channel.delete(`Ticket deleted by ${user.tag}`);
        console.log(`Ticket channel ${channel.name} (${channel.id}) deleted by ${user.tag}`);
      } catch (error) {
        console.error(`Error deleting ticket channel ${channel.id}:`, error);
      }
    }, 5000);
    
    return true;
  } catch (error) {
    console.error('Error deleting ticket:', error);
    return false;
  }
}

// Export the functions
export { 
  handleCreate, 
  handleAdd, 
  handleRemove, 
  handleSetup, 
  handlePanel, 
  handleBlacklist, 
  generateTranscript, 
  executeCloseTicket, 
  executeDeleteTicket,
  activeTickets,
  blacklistedUsers,
  ticketConfig,
  COLORS
};

// Also export for CommonJS compatibility
module.exports.handleCreate = handleCreate;
module.exports.handleAdd = handleAdd;
module.exports.handleRemove = handleRemove;
module.exports.handleSetup = handleSetup;
module.exports.handlePanel = handlePanel;
module.exports.handleBlacklist = handleBlacklist;
module.exports.generateTranscript = generateTranscript;
module.exports.executeCloseTicket = executeCloseTicket;
module.exports.executeDeleteTicket = executeDeleteTicket;
module.exports.activeTickets = activeTickets;
module.exports.blacklistedUsers = blacklistedUsers;
module.exports.ticketConfig = ticketConfig;
module.exports.COLORS = COLORS;