import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  TextChannel,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
  Guild,
  GuildMember,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType,
  StringSelectMenuInteraction,
  ModalSubmitInteraction
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';
import { config } from '../../config';
import { saveGuildSuggestionConfig, getGuildSuggestionConfig } from '../../models/SuggestionConfig';

// Map to store suggestion configuration (for compatibility, will be migrated to database)
const suggestionConfig = new Map();

// Map to store user cooldowns for suggestions
const userCooldowns = new Map();

// Export the config map so it can be accessed from outside
export { suggestionConfig, userCooldowns };

const suggestCommand = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Submit or manage suggestions for the server')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Submit a suggestion for the server')
        .addStringOption(option => 
          option
            .setName('idea')
            .setDescription('Your suggestion or idea')
            .setRequired(true)
        )
        .addStringOption(option => 
          option
            .setName('category')
            .setDescription('Category of your suggestion')
            .addChoices(
              { name: 'Server Feature', value: 'Server Feature' },
              { name: 'Bot Feature', value: 'Bot Feature' },
              { name: 'Event Idea', value: 'Event Idea' },
              { name: 'Other', value: 'Other' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Configure the suggestion system')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('The channel where suggestions will be posted')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addRoleOption(option =>
          option
            .setName('review_role')
            .setDescription('The role that can review suggestions')
            .setRequired(false)
        )
        .addChannelOption(option =>
          option
            .setName('outcome_channel')
            .setDescription('The channel where completed suggestions will be posted')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('panel')
        .setDescription('Create a suggestion panel in a channel')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('The channel to post the suggestion panel in')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    ),
  
  category: 'misc',
  cooldown: 20, // 20 seconds cooldown to prevent spam
  
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      
      switch (subcommand) {
        case 'create':
          await handleCreate(interaction);
          break;
        case 'setup':
          await handleSetup(interaction);
          break;
        case 'panel':
          await handlePanel(interaction);
          break;
        default:
          await interaction.reply({
            content: 'Unknown subcommand.',
            ephemeral: true
          });
      }
    } catch (error) {
      console.error('Error processing suggestion command:', error instanceof Error ? error.message : String(error));
      
      // Handle errors gracefully
      await interaction.reply({
        content: 'There was an error processing your request. Please try again later.',
        ephemeral: true
      });
    }
  }
} as Command;

// Handle suggest create subcommand
async function handleCreate(interaction: ChatInputCommandInteraction) {
  // Check for user cooldown
  const userId = interaction.user.id;
  const cooldownTime = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
  const now = Date.now();
  
  // Get user's last suggestion time
  const lastSuggestionTime = userCooldowns.get(userId);
  console.log(`[${userId}] handleCreate Cooldown Check: Last suggestion at ${lastSuggestionTime}, Now ${now}`);
  
  // If user has a cooldown active
  if (lastSuggestionTime && now - lastSuggestionTime < cooldownTime) {
    const remainingTime = Math.ceil((lastSuggestionTime + cooldownTime - now) / (60 * 60 * 1000));
    return interaction.reply({
      content: `You must wait ${remainingTime} hour(s) before submitting another suggestion.`,
      ephemeral: true
    });
  }
  
  // Get the suggestion and optional category
  const suggestion = interaction.options.getString('idea', true);
  const category = interaction.options.getString('category') || 'Uncategorized';
  
  // Create suggestion ID (simple timestamp-based ID)
  const suggestionId = `SUG-${Date.now().toString().slice(-6)}`;
  
  // Get guild configuration from database first, then fallback to memory and env vars
  let guildConfig;
  try {
    // Try to get from database
    const dbConfig = await getGuildSuggestionConfig(interaction.guildId!);
    
    if (dbConfig) {
      // Use database config
      guildConfig = {
        channelId: dbConfig.channelId,
        reviewRoleId: dbConfig.reviewRoleId,
        outcomeChannelId: dbConfig.outcomeChannelId
      };
    } else {
      // Fallback to memory map
      guildConfig = suggestionConfig.get(interaction.guildId) || {
        channelId: process.env.SUGGESTION_CHANNEL_ID,
        reviewRoleId: process.env.SUGGESTION_REVIEW_ROLE_ID,
        outcomeChannelId: process.env.SUGGESTION_OUTCOME_CHANNEL_ID
      };
    }
  } catch (error) {
    console.error('Error fetching guild suggestion config from database:', error);
    // Fallback to memory map
    guildConfig = suggestionConfig.get(interaction.guildId) || {
      channelId: process.env.SUGGESTION_CHANNEL_ID,
      reviewRoleId: process.env.SUGGESTION_REVIEW_ROLE_ID,
      outcomeChannelId: process.env.SUGGESTION_OUTCOME_CHANNEL_ID
    };
  }
  
  // Handle missing suggestion channel configuration
  if (!guildConfig.channelId) {
    return interaction.reply({
      content: 'The suggestion system is not properly configured. Please ask an administrator to run `/suggest setup`.',
      ephemeral: true
    });
  }
  
  // Try to fetch the suggestion channel
  let suggestionChannel;
  try {
    suggestionChannel = await interaction.client.channels.fetch(guildConfig.channelId);
  } catch (error) {
    console.error('Could not fetch suggestion channel:', error instanceof Error ? error.message : String(error));
    return interaction.reply({
      content: 'Could not access the suggestion channel. Please contact an administrator.',
      ephemeral: true
    });
  }
  
  // Check if the channel is a text channel
  if (!suggestionChannel || suggestionChannel.type !== ChannelType.GuildText) {
    return interaction.reply({
      content: 'The configured suggestion channel is invalid. Please contact an administrator.',
      ephemeral: true
    });
  }
  
  // Create suggestion embed
  const suggestionEmbed = new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle(`Suggestion #${suggestionId}`)
    .setDescription(`\`\`\`\n${suggestion}\n\`\`\``)
    .addFields(
      { name: 'Status', value: '⏳ Pending', inline: true },
      { name: 'Category', value: category, inline: true },
      { name: 'Information', value: "Upvotes: 0\nDownvotes: 0", inline: false }
    )
    .setAuthor({
      name: interaction.user.tag
    })
    .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
    .setFooter({ 
      text: `Suggestion ID: ${suggestionId}`,
      iconURL: interaction.user.displayAvatarURL({ size: 32 })
    })
    .setTimestamp();
  
  // Create buttons for voting and discussion
  const likeButton = new ButtonBuilder()
    .setCustomId(`suggestion_like_${suggestionId}`)
    .setLabel('Upvote')
    .setStyle(ButtonStyle.Success)
    .setEmoji('⬆️');
  
  const dislikeButton = new ButtonBuilder()
    .setCustomId(`suggestion_dislike_${suggestionId}`)
    .setLabel('Downvote')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('⬇️');
  
  const discussButton = new ButtonBuilder()
    .setCustomId(`suggestion_discuss_${suggestionId}`)
    .setLabel('Comment')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('💬');
  
  const closeButton = new ButtonBuilder()
    .setCustomId(`suggestion_close_${suggestionId}`)
    .setLabel('Process')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('✅');
  
  // Create action row with all buttons
  const buttonRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(likeButton, dislikeButton, discussButton, closeButton);
  
  // If no approval required, post directly to suggestion channel
  const textChannel = suggestionChannel as TextChannel;
  const suggestionMessage = await textChannel.send({
    embeds: [suggestionEmbed],
    components: [buttonRow]
  });
  
  // *** Add logging here ***
  console.log(`Sent suggestion ${suggestionId} with components:`, JSON.stringify(suggestionMessage.components, null, 2));
  
  // Set up button collector for interaction
  const collector = suggestionMessage.createMessageComponentCollector({
    componentType: ComponentType.Button
  });
  
  collector.on('collect', async (i) => {
    // Handle the Process button click
    if (i.customId === `suggestion_close_${suggestionId}`) {
      // Only check for the specific review role
      const canProcess = guildConfig.reviewRoleId && 
                         i.member instanceof GuildMember && 
                         i.member.roles.cache.has(guildConfig.reviewRoleId);
      
      if (!canProcess) {
        // Reply immediately if user doesn't have permission
        await i.reply({
          content: 'Only users with the designated review role can process suggestions.',
          flags: MessageFlags.Ephemeral
        });
        return; // Interaction handled, stop further processing for this click
      } else {
        // User has permission
        console.log(`User ${i.user.tag} (${i.user.id}) with review role processed suggestion ${suggestionId}`);
        
        // TODO: Add actual processing logic here (e.g., open modal, update embed)
        // Example reply:
        await i.reply({ 
          content: 'Processing suggestion...', 
          flags: MessageFlags.Ephemeral
        });
        return; // Interaction handled, stop further processing for this click
      }
    }

    // Handle other button interactions (like/dislike/comment) here if needed
    // Example placeholder:
    // if (i.customId.startsWith('suggestion_like_')) { ... }

    // If the interaction wasn't handled above (e.g., wasn't the close button, 
    // or wasn't another button type you explicitly handled with reply/defer),
    // defer it to acknowledge the click and prevent the "Interaction failed" state.
    if (!i.replied && !i.deferred) {
        await i.deferUpdate();
    }
  });
  
  // Update user cooldown
  userCooldowns.set(userId, now);
  console.log(`[${userId}] handleCreate Cooldown Set: ${now}`);
  
  // Confirmation message to the user
  await interaction.reply({
    content: `Your suggestion has been submitted! You can view it in <#${guildConfig.channelId}>.`,
    ephemeral: true
  });
}

// Handle setup suggestion system subcommand
async function handleSetup(interaction: ChatInputCommandInteraction) {
  // Check if user has permission
  const member = interaction.member as GuildMember;
  if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: 'You need Administrator permission to configure the suggestion system.',
      ephemeral: true
    });
  }
  
  const channel = interaction.options.getChannel('channel', true) as TextChannel;
  const reviewRole = interaction.options.getRole('review_role');
  const outcomeChannel = interaction.options.getChannel('outcome_channel') as TextChannel;
  
  // Verify the channel exists
  if (!channel || channel.type !== ChannelType.GuildText) {
    return interaction.reply({
      content: 'The specified channel does not exist or is not a valid text channel.',
      ephemeral: true
    });
  }
  
  // Verify the outcome channel if provided
  if (outcomeChannel && outcomeChannel.type !== ChannelType.GuildText) {
    return interaction.reply({
      content: 'The specified outcome channel is not a valid text channel.',
      ephemeral: true
    });
  }
  
  // Create config object
  const configData = {
    channelId: channel.id,
    reviewRoleId: reviewRole?.id,
    outcomeChannelId: outcomeChannel?.id,
    guildId: interaction.guildId
  };
  
  // Save both to memory map (for legacy support) and to database
  suggestionConfig.set(interaction.guildId, configData);
  
  // Save to environment variables for temporary persistence
  process.env.SUGGESTION_CHANNEL_ID = channel.id;
  if (reviewRole) {
    process.env.SUGGESTION_REVIEW_ROLE_ID = reviewRole.id;
  }
  if (outcomeChannel) {
    process.env.SUGGESTION_OUTCOME_CHANNEL_ID = outcomeChannel.id;
  }
  
  // Save to database
  try {
    await saveGuildSuggestionConfig(interaction.guildId!, {
      channelId: channel.id,
      reviewRoleId: reviewRole?.id,
      outcomeChannelId: outcomeChannel?.id
    });
    
    // Create configuration embed
    const configEmbed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setTitle('✅ Suggestion System Configuration')
      .setDescription('### The suggestion system has been successfully configured!')
      .addFields(
        { name: '📋 Suggestion Channel', value: `<#${channel.id}>`, inline: true },
        { name: '🛡️ Review Role', value: reviewRole ? `<@&${reviewRole.id}>` : 'Not set', inline: true },
        { name: '📢 Outcome Channel', value: outcomeChannel ? `<#${outcomeChannel.id}>` : 'Not set', inline: true }
      )
      .setFooter({ 
        text: `Configuration saved to database`,
        iconURL: interaction.guild!.iconURL() || undefined
      })
      .setTimestamp();
    
    return interaction.reply({
      embeds: [configEmbed]
    });
  } catch (error) {
    console.error('Error saving suggestion configuration to database:', error);
    
    return interaction.reply({
      content: 'There was an error saving your configuration. The settings will only persist until the bot restarts.',
      ephemeral: true
    });
  }
}

// Handle create suggestion panel subcommand
async function handlePanel(interaction: ChatInputCommandInteraction) {
  // Check if user has permission
  const member = interaction.member as GuildMember;
  if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({
      content: 'You need Manage Server permission to create a suggestion panel.',
      flags: MessageFlags.Ephemeral
    });
  }
  
  const targetChannel = interaction.options.getChannel('channel', true) as TextChannel;
  
  // Create panel embed
  const panelEmbed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setTitle('💡 Suggestion System')
    .setDescription('### Have a great idea for our server?\n\nShare your suggestions with the community and help us improve! Select a category below to submit a suggestion.')
    .addFields(
      { 
        name: '🖥️ Server Feature', 
        value: '> Suggest improvements or new features for the server', 
        inline: false 
      },
      { 
        name: '🤖 Bot Feature', 
        value: '> Propose new commands or functionality for our bots', 
        inline: false 
      },
      { 
        name: '🎉 Event Idea', 
        value: '> Share ideas for community events or activities', 
        inline: false 
      },
      { 
        name: '📦 Other', 
        value: '> For any other suggestions that don\'t fit the categories above', 
        inline: false 
      }
    )
    .setFooter({ 
      text: `${interaction.guild!.name} • Suggestion System`,
      iconURL: interaction.guild!.iconURL() || undefined
    })
    .setThumbnail(interaction.guild!.iconURL() || null)
    .setTimestamp();
  
  // Create dropdown menu for suggestion categories
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('suggestion_category_select')
    .setPlaceholder('💡 Select a suggestion category')
    .addOptions([
      new StringSelectMenuOptionBuilder()
        .setLabel('Server Feature')
        .setValue('Server Feature')
        .setDescription('Server improvements or new features')
        .setEmoji('🖥️'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Bot Feature')
        .setValue('Bot Feature')
        .setDescription('Bot commands or functionality')
        .setEmoji('🤖'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Event Idea')
        .setValue('Event Idea')
        .setDescription('Community events or activities')
        .setEmoji('🎉'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Other')
        .setValue('Other')
        .setDescription('Other suggestions')
        .setEmoji('📦')
    ]);
  
  // Create action row for the select menu
  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(selectMenu);
  
  try {
    // Send panel to channel
    const panelMessage = await targetChannel.send({
      embeds: [panelEmbed],
      components: [selectRow]
    });
    
    // *** ADDED: Interaction Collector for the Dropdown ***
    const collector = panelMessage.createMessageComponentCollector({
      componentType: ComponentType.StringSelect, // Listen for dropdown selections
      time: 3_600_000 // Listen for 1 hour (adjust as needed)
    });

    collector.on('collect', async (selectInteraction: StringSelectMenuInteraction) => {
        const category = selectInteraction.values[0]; // Get selected category
        const modalCustomId = `suggestion_modal_${selectInteraction.id}`;

        // Create the modal
        const modal = new ModalBuilder()
            .setCustomId(modalCustomId)
            .setTitle(`Submit Suggestion: ${category}`);

        // Create the text input component
        const ideaInput = new TextInputBuilder()
            .setCustomId('suggestion_idea_input')
            .setLabel("What's your suggestion?")
            .setStyle(TextInputStyle.Paragraph) // Allow longer text
            .setRequired(true)
            .setMinLength(10)
            .setMaxLength(2000);

        // Add inputs to the modal (ActionRow is required for text inputs)
        const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(ideaInput);
        modal.addComponents(firstActionRow);

        // Show the modal to the user
        await selectInteraction.showModal(modal);

        // *** ADDED: Wait for Modal Submission ***
        try {
            const modalSubmitInteraction = await selectInteraction.awaitModalSubmit({
                filter: (i) => i.customId === modalCustomId && i.user.id === selectInteraction.user.id,
                time: 300_000 // Wait 5 minutes for submission
            });

            // --- Start: Logic mostly copied/adapted from handleCreate --- 
            const suggestion = modalSubmitInteraction.fields.getTextInputValue('suggestion_idea_input');
            const userId = modalSubmitInteraction.user.id;

            // Check cooldown
            const cooldownTime = 12 * 60 * 60 * 1000; // 12 hours
            const now = Date.now();
            const lastSuggestionTime = userCooldowns.get(userId);
            console.log(`[${userId}] handlePanel Cooldown Check: Last suggestion at ${lastSuggestionTime}, Now ${now}`);
            if (lastSuggestionTime && now - lastSuggestionTime < cooldownTime) {
                const remainingTime = Math.ceil((lastSuggestionTime + cooldownTime - now) / (60 * 60 * 1000));
                await modalSubmitInteraction.reply({
                    content: `You must wait ${remainingTime} hour(s) before submitting another suggestion.`,
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            const suggestionId = `SUG-${Date.now().toString().slice(-6)}`;
            
            // Get guild configuration from database first, then fallback to memory and env vars
            let guildConfig;
            try {
                // Try to get from database
                const dbConfig = await getGuildSuggestionConfig(modalSubmitInteraction.guildId!);
                
                if (dbConfig) {
                    // Use database config
                    guildConfig = {
                        channelId: dbConfig.channelId,
                        reviewRoleId: dbConfig.reviewRoleId,
                        outcomeChannelId: dbConfig.outcomeChannelId
                    };
                } else {
                    // Fallback to memory map
                    guildConfig = suggestionConfig.get(modalSubmitInteraction.guildId) || {
                        channelId: process.env.SUGGESTION_CHANNEL_ID,
                        reviewRoleId: process.env.SUGGESTION_REVIEW_ROLE_ID,
                        outcomeChannelId: process.env.SUGGESTION_OUTCOME_CHANNEL_ID
                    };
                }
            } catch (error) {
                console.error('Error fetching guild suggestion config from database:', error);
                // Fallback to memory map
                guildConfig = suggestionConfig.get(modalSubmitInteraction.guildId) || {
                    channelId: process.env.SUGGESTION_CHANNEL_ID,
                    reviewRoleId: process.env.SUGGESTION_REVIEW_ROLE_ID,
                    outcomeChannelId: process.env.SUGGESTION_OUTCOME_CHANNEL_ID
                };
            }

            if (!guildConfig.channelId) {
                await modalSubmitInteraction.reply({ content: 'Suggestion system not configured. Contact admin.', flags: MessageFlags.Ephemeral });
                return;
            }
            
            let suggestionChannel;
            try {
                suggestionChannel = await modalSubmitInteraction.client.channels.fetch(guildConfig.channelId);
            } catch (error) {
                console.error('Modal Submit: Could not fetch suggestion channel:', error instanceof Error ? error.message : String(error));
                await modalSubmitInteraction.reply({ content: 'Could not access suggestion channel. Contact admin.', flags: MessageFlags.Ephemeral });
                return;
            }
            if (!suggestionChannel || suggestionChannel.type !== ChannelType.GuildText) {
                await modalSubmitInteraction.reply({ content: 'Configured suggestion channel is invalid. Contact admin.', flags: MessageFlags.Ephemeral });
                return;
            }

            const suggestionEmbed = new EmbedBuilder()
                .setColor(COLORS.INFO)
                .setTitle(`Suggestion #${suggestionId}`)
                .setDescription(`\`\`\`\n${suggestion}\n\`\`\``)
                .addFields(
                    { name: 'Status', value: '⏳ Pending', inline: true },
                    { name: 'Category', value: category, inline: true },
                    { name: 'Information', value: "Upvotes: 0\nDownvotes: 0", inline: false }
                )
                .setAuthor({ name: modalSubmitInteraction.user.tag })
                .setThumbnail(modalSubmitInteraction.user.displayAvatarURL({ size: 256 }))
                .setFooter({ text: `Suggestion ID: ${suggestionId}`, iconURL: modalSubmitInteraction.user.displayAvatarURL({ size: 32 }) })
                .setTimestamp();

            const likeButton = new ButtonBuilder().setCustomId(`suggestion_like_${suggestionId}`).setLabel('Upvote').setStyle(ButtonStyle.Success).setEmoji('⬆️');
            const dislikeButton = new ButtonBuilder().setCustomId(`suggestion_dislike_${suggestionId}`).setLabel('Downvote').setStyle(ButtonStyle.Danger).setEmoji('⬇️');
            const discussButton = new ButtonBuilder().setCustomId(`suggestion_discuss_${suggestionId}`).setLabel('Comment').setStyle(ButtonStyle.Primary).setEmoji('💬');
            const closeButton = new ButtonBuilder().setCustomId(`suggestion_close_${suggestionId}`).setLabel('Process').setStyle(ButtonStyle.Secondary).setEmoji('✅');
            const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(likeButton, dislikeButton, discussButton, closeButton);

            const finalSuggestionMessage = await (suggestionChannel as TextChannel).send({
                embeds: [suggestionEmbed],
                components: [buttonRow]
            });

            console.log(`PANEL -> Sent suggestion ${suggestionId} with components:`, JSON.stringify(finalSuggestionMessage.components, null, 2));

            // Setup button collector for the NEW message
            const buttonCollector = finalSuggestionMessage.createMessageComponentCollector({ componentType: ComponentType.Button });
            buttonCollector.on('collect', async (buttonInteraction) => {
                if (buttonInteraction.customId === `suggestion_close_${suggestionId}`) {
                    const canProcess = guildConfig.reviewRoleId && buttonInteraction.member instanceof GuildMember && buttonInteraction.member.roles.cache.has(guildConfig.reviewRoleId);
                    if (!canProcess) {
                        await buttonInteraction.reply({ content: 'Only users with the designated review role can process suggestions.', flags: MessageFlags.Ephemeral });
                        return;
                    }
                    console.log(`User ${buttonInteraction.user.tag} processed suggestion ${suggestionId} (from panel flow)`);
                    await buttonInteraction.reply({ content: 'Processing suggestion...', flags: MessageFlags.Ephemeral });
                    return;
                }
                if (!buttonInteraction.replied && !buttonInteraction.deferred) {
                    await buttonInteraction.deferUpdate();
                }
            });

            userCooldowns.set(userId, now);
            console.log(`[${userId}] handlePanel Cooldown Set: ${now}`);
            await modalSubmitInteraction.reply({ content: `Your suggestion has been submitted! You can view it in <#${guildConfig.channelId}>.`, flags: MessageFlags.Ephemeral });
            // --- End: Logic mostly copied/adapted from handleCreate ---

        } catch (err) {
            // Handle modal timeout or other errors
            console.error('Modal submission failed or timed out:', err);
            // Optionally notify the user, though they might have dismissed the modal
            // await selectInteraction.followUp({ content: 'Suggestion submission timed out.', flags: MessageFlags.Ephemeral });
        }
    });

    // Send confirmation for panel creation itself
    await interaction.reply({
      content: `Suggestion panel has been created in ${targetChannel}. I will listen for category selections for the next hour.`,
      flags: MessageFlags.Ephemeral
    });

  } catch (error) {
    console.error('Error creating suggestion panel:', error instanceof Error ? error.message : String(error));
    await interaction.reply({
      content: 'There was an error creating the suggestion panel. Please check my permissions and try again.',
      flags: MessageFlags.Ephemeral
    });
  }
}

// Export the command module
export default suggestCommand; 

// Helper function can be added here later for refactoring
// async function createSuggestionMessage(...) { ... } 