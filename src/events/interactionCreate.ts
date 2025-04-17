import { 
  ActionRowBuilder, 
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  GuildMember,
  Interaction,
  ModalBuilder,
  ModalSubmitInteraction,
  PermissionFlagsBits,
  StringSelectMenuInteraction,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
  CategoryChannel,
  ModalActionRowComponentBuilder,
  Message,
  Role,
  GuildMemberRoleManager,
  StringSelectMenuBuilder
} from 'discord.js';
import { Logger } from '../utils/logger';
import { EmbedBuilderService } from '../utils/embedBuilder';
import { Command } from '../interfaces/command';
import { VerificationController } from '../utils/verificationController';
import { COLORS } from '../utils/constants';
import { TicketData } from '../types/ticket';

// Import type extensions
import '../types/discord';

// Import the ticket functions
import { generateTranscript } from '../commands/misc/ticket';

// Import the suggestion manager
import { SuggestionManager } from '../utils/suggestionManager';

export = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction: Interaction) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      try {
        const command = interaction.client.commands.get(interaction.commandName);
        
        if (!command) {
          Logger.warn(`No command matching ${interaction.commandName} was found.`);
          return;
        }
        
        Logger.info(`User ${interaction.user.id} executed command ${interaction.commandName} in guild ${interaction.guildId}`);
        
        await command.execute(interaction);
      } catch (error) {
        Logger.error(`Error executing command ${interaction.commandName}:`);
        Logger.error(error as Error);
        
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: 'There was an error while executing this command.',
            ephemeral: true
          });
        }
      }
    }
    
    // Handle button interactions
    else if (interaction.isButton()) {
      const buttonInteraction = interaction as ButtonInteraction;
      try {
        const customId = buttonInteraction.customId;
        
        // Handle verify button
        if (customId === 'verify_button') {
          return VerificationController.handleButtonVerification(buttonInteraction);
        }
        
        // Handle slots button
        if (customId.startsWith('slots_play_')) {
          const command = interaction.client.commands.get('slots');
          if (command && typeof command.handleButton === 'function') {
            return command.handleButton(buttonInteraction);
          }
        }
        
        // Handle suggestion buttons
        if (customId.startsWith('suggestion_')) {
          const parts = customId.split('_');
          if (parts.length < 3) return;
          
          const action = parts[1];
          const suggestionId = parts[2];
          
          // Get the channel and message
          const channel = buttonInteraction.channel as TextChannel;
          const message = buttonInteraction.message;
          
          if (!channel || !message) {
            await buttonInteraction.reply({
              content: 'Error: Could not find channel or message information.',
              ephemeral: true
            });
            return;
          }
          
          // Check if the message has embeds
          if (!message.embeds || message.embeds.length === 0) {
            await buttonInteraction.reply({
              content: 'Error: Could not find suggestion information.',
              ephemeral: true
            });
            return;
          }
          
          // Get the original embed
          const originalEmbed = message.embeds[0];
          const embed = EmbedBuilder.from(originalEmbed);
          
          // Get guild configuration
          const guildConfig = await SuggestionManager.getConfig(interaction.guildId!);
          
          // Check user permissions for staff-only actions
          const member = buttonInteraction.member;
          const isStaff = member instanceof GuildMember && 
                         (member.permissions.has(PermissionFlagsBits.ManageGuild) || 
                          member.permissions.has(PermissionFlagsBits.Administrator) ||
                          (guildConfig.reviewRoleId && member.roles.cache.has(guildConfig.reviewRoleId)));
          
          // Get support role ID (for "Close" action access)
          const supportRoleId = process.env.SUGGESTION_REVIEW_ROLE_ID;
          const isSupportRole = supportRoleId && member instanceof GuildMember && 
                               member.roles.cache.has(supportRoleId);
          
          // Handle different actions
          switch (action) {
            // Like/dislike action handlers...
            
            case 'discuss':
              // Create a discussion modal
              const discussModal = new ModalBuilder()
                .setCustomId(`suggestion_discuss_modal_${suggestionId}`)
                .setTitle('Add Comment to Suggestion');
              
              // Add text input for discussion comment
              const commentInput = new TextInputBuilder()
                .setCustomId('discussion_comment')
                .setLabel('Your Comment')
                .setPlaceholder('Share your thoughts on this suggestion. Be constructive and respectful.')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(1000);
              
              const commentRow = new ActionRowBuilder<TextInputBuilder>()
                .addComponents(commentInput);
              
              discussModal.addComponents(commentRow);
              
              // Show the modal
              await buttonInteraction.showModal(discussModal);
              break;
              
            // Approve/reject action handlers...
            
            case 'close':
              // Only staff or support role can close
              if (!isStaff && !isSupportRole) {
                await buttonInteraction.reply({
                  content: 'Only staff members or support team can close suggestions.',
                  ephemeral: true
                });
                return;
              }
              
              // Check if already closed
              if (originalEmbed.fields.find((field: any) => field.name === 'Status' && field.value.includes('Closed'))) {
                await buttonInteraction.reply({
                  content: 'This suggestion is already closed.',
                  ephemeral: true
                });
                return;
              }
              
              try {
                // Create close modal with outcome options
                const closeModal = new ModalBuilder()
                  .setCustomId(`suggestion_close_modal_${suggestionId}`)
                  .setTitle('Process Suggestion');
                
                // Add select input for outcome (implemented as a text input for modal compatibility)
                const outcomeInput = new TextInputBuilder()
                  .setCustomId('close_outcome')
                  .setLabel('Decision (type one of these options)')
                  .setPlaceholder('accept, deny, or close')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(true);
                
                // Add text input for reason
                const closeReasonInput = new TextInputBuilder()
                  .setCustomId('close_reason')
                  .setLabel('Detailed Reason')
                  .setPlaceholder('Explain your decision. This will be visible to everyone.')
                  .setStyle(TextInputStyle.Paragraph)
                  .setRequired(true)
                  .setMaxLength(1000);
                
                const outcomeRow = new ActionRowBuilder<TextInputBuilder>()
                  .addComponents(outcomeInput);
                
                const closeReasonRow = new ActionRowBuilder<TextInputBuilder>()
                  .addComponents(closeReasonInput);
                
                closeModal.addComponents(outcomeRow, closeReasonRow);
                
                // Show the modal
                await buttonInteraction.showModal(closeModal);
              } catch (error) {
                Logger.error('Error showing close modal for suggestion:');
                Logger.error(error as Error);
                await buttonInteraction.reply({
                  content: 'Something went wrong while processing the suggestion. Please try again later.',
                  ephemeral: true
                });
              }
              break;
              
            case 'like':
              // Prevent staff from voting on processed suggestions
              if (originalEmbed.fields.find((field: any) => field.name === 'Status' && (field.value.includes('Accepted') || field.value.includes('Denied') || field.value.includes('Closed')))) {
                await buttonInteraction.reply({
                  content: 'This suggestion has already been processed by staff.',
                  ephemeral: true
                });
                return;
              }
              
              // Extract voter data from button customIds
              const buttons = message.components[0]?.components || [];
              const voterDataParts = [];
              
              // Get all buttons and extract the data parts
              for (const button of buttons) {
                const idParts = button.customId?.split('_') || [];
                // We store data after the suggestionId (part 3+)
                if (idParts.length > 3) {
                  voterDataParts.push(idParts[3]);
                }
              }
              
              // Combine the parts and decode
              let voters = { upvotes: [] as string[], downvotes: [] as string[] };
              try {
                // Only attempt to decode if we have all parts
                if (voterDataParts.length >= 3) {
                  const encodedData = voterDataParts.join('');
                  // Add padding if needed
                  const paddedData = encodedData + "=".repeat((4 - encodedData.length % 4) % 4);
                  voters = JSON.parse(atob(paddedData));
                }
              } catch (error) {
                // If parsing fails, start with empty arrays
                voters = { upvotes: [], downvotes: [] };
              }
              
              // Check if user has already upvoted
              if (voters.upvotes.includes(buttonInteraction.user.id)) {
                await buttonInteraction.reply({
                  content: 'You have already upvoted this suggestion.',
                  ephemeral: true
                });
                return;
              }
              
              // If user previously downvoted, remove their downvote
              if (voters.downvotes.includes(buttonInteraction.user.id)) {
                voters.downvotes = voters.downvotes.filter(id => id !== buttonInteraction.user.id);
              }
              
              // Add user to upvotes list
              voters.upvotes.push(buttonInteraction.user.id);
              
              // Get current upvote and downvote counts from voter data
              const upvotes = voters.upvotes.length;
              const downvotes = voters.downvotes.length;
              
              // Create updated Information field with new counts
              const updatedInfoField = { 
                name: 'Information', 
                value: `Upvotes: ${upvotes}\nDownvotes: ${downvotes}`, 
                inline: false 
              };
              
              // Update the fields
              const updatedFields = originalEmbed.fields.map((field: any) => {
                if (field.name === 'Information') {
                  return updatedInfoField;
                }
                return field;
              });
              
              // Remove any voters field that might exist
              const filteredFields = updatedFields.filter(field => 
                field.name !== '__voters__' && field.name !== '\u200B_Voters' && field.name !== 'Voters'
              );
              
              // Set the updated fields
              embed.setFields(filteredFields);
              
              // Create new buttons with updated voter data
              const encodedVoterData = btoa(JSON.stringify(voters));
              
              const newLikeButton = new ButtonBuilder()
                .setCustomId(`suggestion_like_${suggestionId}_${encodedVoterData.substring(0, 10)}`)
                .setLabel('Upvote')
                .setStyle(ButtonStyle.Success)
                .setEmoji('⬆️');
              
              const newDislikeButton = new ButtonBuilder()
                .setCustomId(`suggestion_dislike_${suggestionId}_${encodedVoterData.substring(10, 20)}`)
                .setLabel('Downvote')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('⬇️');
              
              const newDiscussButton = new ButtonBuilder()
                .setCustomId(`suggestion_discuss_${suggestionId}_${encodedVoterData.substring(20, 30)}`)
                .setLabel('Comment')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('💬');
              
              // Create action row with buttons
              const newRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(newLikeButton, newDislikeButton, newDiscussButton);
              
              // Add close button if it was present in the original
              if (buttons.some(b => b.customId?.startsWith('suggestion_close_'))) {
                const newCloseButton = new ButtonBuilder()
                  .setCustomId(`suggestion_close_${suggestionId}`)
                  .setLabel('Process')
                  .setStyle(ButtonStyle.Secondary)
                  .setEmoji('✅');
                
                newRow.addComponents(newCloseButton);
              }
              
              // Update the message
              await message.edit({ 
                embeds: [embed],
                components: [newRow]
              });
              
              // Acknowledge the interaction
              await buttonInteraction.reply({
                content: 'You upvoted this suggestion!',
                ephemeral: true
              });
              break;
              
            case 'dislike':
              // Prevent voting on processed suggestions
              if (originalEmbed.fields.find((field: any) => field.name === 'Status' && (field.value.includes('Accepted') || field.value.includes('Denied') || field.value.includes('Closed')))) {
                await buttonInteraction.reply({
                  content: 'This suggestion has already been processed by staff.',
                  ephemeral: true
                });
                return;
              }
              
              // Extract voter data from button customIds
              const dislikeButtons = message.components[0]?.components || [];
              const dislikeVoterDataParts = [];
              
              // Get all buttons and extract the data parts
              for (const button of dislikeButtons) {
                const idParts = button.customId?.split('_') || [];
                // We store data after the suggestionId (part 3+)
                if (idParts.length > 3) {
                  dislikeVoterDataParts.push(idParts[3]);
                }
              }
              
              // Combine the parts and decode
              let dislikeVoters = { upvotes: [] as string[], downvotes: [] as string[] };
              try {
                // Only attempt to decode if we have all parts
                if (dislikeVoterDataParts.length >= 3) {
                  const encodedData = dislikeVoterDataParts.join('');
                  // Add padding if needed
                  const paddedData = encodedData + "=".repeat((4 - encodedData.length % 4) % 4);
                  dislikeVoters = JSON.parse(atob(paddedData));
                }
              } catch (error) {
                // If parsing fails, start with empty arrays
                dislikeVoters = { upvotes: [], downvotes: [] };
              }
              
              // Check if user has already downvoted
              if (dislikeVoters.downvotes.includes(buttonInteraction.user.id)) {
                await buttonInteraction.reply({
                  content: 'You have already downvoted this suggestion.',
                  ephemeral: true
                });
                return;
              }
              
              // If user previously upvoted, remove their upvote
              if (dislikeVoters.upvotes.includes(buttonInteraction.user.id)) {
                dislikeVoters.upvotes = dislikeVoters.upvotes.filter(id => id !== buttonInteraction.user.id);
              }
              
              // Add user to downvotes list
              dislikeVoters.downvotes.push(buttonInteraction.user.id);
              
              // Get counts from voter data
              const dislikeUpvotes = dislikeVoters.upvotes.length;
              const dislikeDownvotes = dislikeVoters.downvotes.length;
              
              // Create updated Information field with new counts
              const updatedDislikeInfoField = { 
                name: 'Information', 
                value: `Upvotes: ${dislikeUpvotes}\nDownvotes: ${dislikeDownvotes}`, 
                inline: false 
              };
              
              // Update the fields
              const updatedDislikeFields = originalEmbed.fields.map((field: any) => {
                if (field.name === 'Information') {
                  return updatedDislikeInfoField;
                }
                return field;
              });
              
              // Remove any voters field that might exist
              const filteredDislikeFields = updatedDislikeFields.filter(field => 
                field.name !== '__voters__' && field.name !== '\u200B_Voters' && field.name !== 'Voters'
              );
              
              // Set the updated fields
              embed.setFields(filteredDislikeFields);
              
              // Create new buttons with updated voter data
              const encodedDislikeVoterData = btoa(JSON.stringify(dislikeVoters));
              
              const newDislikeLikeButton = new ButtonBuilder()
                .setCustomId(`suggestion_like_${suggestionId}_${encodedDislikeVoterData.substring(0, 10)}`)
                .setLabel('Upvote')
                .setStyle(ButtonStyle.Success)
                .setEmoji('⬆️');
              
              const newDislikeDislikeButton = new ButtonBuilder()
                .setCustomId(`suggestion_dislike_${suggestionId}_${encodedDislikeVoterData.substring(10, 20)}`)
                .setLabel('Downvote')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('⬇️');
              
              const newDislikeDiscussButton = new ButtonBuilder()
                .setCustomId(`suggestion_discuss_${suggestionId}_${encodedDislikeVoterData.substring(20, 30)}`)
                .setLabel('Comment')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('💬');
              
              // Create action row with buttons
              const newDislikeRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(newDislikeLikeButton, newDislikeDislikeButton, newDislikeDiscussButton);
              
              // Add close button if it was present in the original
              if (dislikeButtons.some(b => b.customId?.startsWith('suggestion_close_'))) {
                const newDislikeCloseButton = new ButtonBuilder()
                  .setCustomId(`suggestion_close_${suggestionId}`)
                  .setLabel('Process')
                  .setStyle(ButtonStyle.Secondary)
                  .setEmoji('✅');
                
                newDislikeRow.addComponents(newDislikeCloseButton);
              }
              
              // Update the message
              await message.edit({ 
                embeds: [embed],
                components: [newDislikeRow]
              });
              
              // Acknowledge the interaction
              await buttonInteraction.reply({
                content: 'You downvoted this suggestion.',
                ephemeral: true
              });
              break;
          }
        }
        
      } catch (error: any) {
        Logger.error('Error handling button interaction:');
        Logger.error(error as Error);
        
        try {
        if (!buttonInteraction.replied && !buttonInteraction.deferred) {
          await buttonInteraction.reply({
              content: 'There was an error processing this button.',
            ephemeral: true
          });
          } else if (buttonInteraction.deferred) {
            await buttonInteraction.editReply({
              content: 'There was an error processing this button.'
            });
          }
        } catch (replyError) {
          Logger.error(`Error sending error response: ${replyError instanceof Error ? replyError.message : String(replyError)}`);
        }
      }
    }
    
    // Handle select menu interactions
    else if (interaction.isStringSelectMenu()) {
      const selectInteraction = interaction as StringSelectMenuInteraction;
      try {
        const customId = selectInteraction.customId;
        
        // Handle suggestion category select
        if (customId === 'suggestion_category_select') {
          const selectedCategory = selectInteraction.values[0];
          
          try {
            // Create suggestion modal
            const suggestModal = new ModalBuilder()
              .setCustomId(`suggestion_create_${selectedCategory}`)
              .setTitle('Submit a Suggestion');
            
            // Add text input for suggestion
            const suggestionInput = new TextInputBuilder()
              .setCustomId('suggestion_text')
              .setLabel('Your Suggestion')
              .setPlaceholder('Describe your idea clearly and explain why it would benefit the community.')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setMaxLength(4000);
            
            const suggestionRow = new ActionRowBuilder<TextInputBuilder>()
              .addComponents(suggestionInput);
            
            suggestModal.addComponents(suggestionRow);
            
            // Show the modal
            await selectInteraction.showModal(suggestModal);
          } catch (modalError) {
            Logger.error('Error creating suggestion modal:');
            Logger.error(modalError as Error);
            
            await selectInteraction.reply({
              content: 'Something went wrong while creating the suggestion form. Please try again later.',
              ephemeral: true
            });
          }
        }
        
        // Handle ticket category select
        else if (customId === 'ticket_category_select') {
          const selectedCategory = selectInteraction.values[0];
          
          try {
            // Create ticket modal
            const ticketModal = new ModalBuilder()
              .setCustomId(`ticket_create_${selectedCategory}`)
              .setTitle('Create Support Ticket');
            
            // Add text input for ticket description
            const descriptionInput = new TextInputBuilder()
              .setCustomId('ticket_description')
              .setLabel('Describe your issue')
              .setPlaceholder('Please provide detailed information about your issue or question.')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setMaxLength(4000);
            
            const descriptionRow = new ActionRowBuilder<TextInputBuilder>()
              .addComponents(descriptionInput);
            
            ticketModal.addComponents(descriptionRow);
            
            // Show the modal
            await selectInteraction.showModal(ticketModal);
          } catch (modalError) {
            Logger.error('Error creating ticket modal:');
            Logger.error(modalError as Error);
            
            await selectInteraction.reply({
              content: 'Something went wrong while creating the ticket form. Please try again later.',
              ephemeral: true
            });
          }
        }
        
      } catch (error: any) {
        Logger.error('Error handling select menu interaction:');
        Logger.error(error as Error);
        
        if (!selectInteraction.replied) {
          await selectInteraction.reply({
            content: 'There was an error processing your selection. Please try again later.',
            ephemeral: true
          });
        }
      }
    }

    // Handle modal submissions
    else if (interaction.isModalSubmit()) {
      const modalInteraction = interaction as ModalSubmitInteraction;
      try {
        const customId = modalInteraction.customId;
        
        // Handle suggestion discussion modal
        if (customId.startsWith('suggestion_discuss_modal_')) {
          const parts = customId.split('_');
          if (parts.length < 4) return;
          
          const suggestionId = parts[3];
          const comment = modalInteraction.fields.getTextInputValue('discussion_comment');
          
          // Create a new embed for the comment
          const commentEmbed = new EmbedBuilder()
            .setColor(COLORS.INFO)
            .setAuthor({
              name: modalInteraction.user.tag
            })
            .setThumbnail(modalInteraction.user.displayAvatarURL({ size: 256 }))
            .setDescription(`💬 **Comment:**\n\`\`\`\n${comment}\n\`\`\``)
            .setFooter({ 
              text: `Comment on Suggestion #${suggestionId}`,
              iconURL: modalInteraction.user.displayAvatarURL({ size: 32 })
            })
            .setTimestamp();
          
          // Send the comment as a reply to the suggestion
          await modalInteraction.reply({
            embeds: [commentEmbed]
          });
        }
        
        // Handle suggestion close modal
        else if (customId.startsWith('suggestion_close_modal_')) {
          try {
            const parts = customId.split('_');
            if (parts.length < 4) {
              await modalInteraction.reply({
                content: 'Error: Invalid suggestion ID format.',
                ephemeral: true
              });
              return;
            }
            
            const suggestionId = parts[3];
            
            // Get the inputs from the modal
            let outcome;
            let reason;
            try {
              outcome = modalInteraction.fields.getTextInputValue('close_outcome').toLowerCase().trim();
              reason = modalInteraction.fields.getTextInputValue('close_reason');
            } catch (inputError) {
              Logger.error('Error getting input values from modal:');
              Logger.error(inputError as Error);
              await modalInteraction.reply({
                content: 'Error: Could not read your input. Please try again.',
                ephemeral: true
              });
              return;
            }
            
            // Validate the outcome
            if (!['accept', 'deny', 'close'].includes(outcome)) {
              await modalInteraction.reply({
                content: 'Error: Invalid outcome. Please use "accept", "deny", or "close".',
                ephemeral: true
              });
              return;
            }
            
            // Get the message that triggered the modal
            const message = modalInteraction.message;
            if (!message || !message.embeds || message.embeds.length === 0) {
              await modalInteraction.reply({
                content: 'Error: Could not find suggestion information.',
                ephemeral: true
              });
              return;
            }
            
            // Get the suggestion details
            const originalEmbed = message.embeds[0];
            const embed = EmbedBuilder.from(originalEmbed);
            
            // Get the suggestion text and submitter
            const suggestion = originalEmbed.description || "No suggestion text available";
            const submitterField = originalEmbed.fields.find(field => field.name === 'Submitted by');
            const submitter = submitterField ? submitterField.value : "Unknown user";
            const submitterName = submitter.replace(/<@!?(\d+)>/g, (match, id) => {
              const user = modalInteraction.guild?.members.cache.get(id);
              return user ? user.displayName : "Unknown user";
            });
            
            // Update status field based on outcome
            let statusEmoji, statusText, embedColor, outcomeTitlePrefix;
            
            switch (outcome) {
              case 'accept':
                statusEmoji = '✅';
                statusText = 'Accepted';
                embedColor = COLORS.SUCCESS;
                outcomeTitlePrefix = 'Accepted';
                break;
              case 'deny':
                statusEmoji = '❌';
                statusText = 'Denied';
                embedColor = COLORS.ERROR;
                outcomeTitlePrefix = 'Denied';
                break;
              case 'close':
              default:
                statusEmoji = '🔒';
                statusText = 'Closed';
                embedColor = 0x808080; // Gray color as hex number
                outcomeTitlePrefix = 'Closed';
                break;
            }
            
            const updatedFields = originalEmbed.fields.map(field => {
              if (field.name === 'Status') {
                return { name: 'Status', value: `${statusEmoji} ${statusText} by ${modalInteraction.user}`, inline: true };
              }
              return field;
            });
            
            // Add reason field
            updatedFields.push({
              name: `${statusText} Reason`,
              value: reason,
              inline: false
            });
            
            // Update embed
            embed.setColor(embedColor);
            embed.setFields(updatedFields);
            
            // Update the original message
            try {
              await message.edit({ 
                embeds: [embed],
                components: [] // Remove all buttons
              });
            } catch (editError) {
              Logger.error('Error updating suggestion message:');
              Logger.error(editError as Error);
              await modalInteraction.reply({
                content: 'Error: Could not update the suggestion. Please try again later.',
                ephemeral: true
              });
              return;
            }
            
            // Send to outcome channel if this is an accept or deny decision
            if (outcome === 'accept' || outcome === 'deny') {
              // Get outcome channel ID using the SuggestionManager
              const outcomeChannelId = await SuggestionManager.getOutcomeChannelId(modalInteraction.guildId!);
              
              if (outcomeChannelId) {
                try {
                  const outcomeChannel = await modalInteraction.client.channels.fetch(outcomeChannelId);
                  
                  if (outcomeChannel && outcomeChannel.type === ChannelType.GuildText) {
                    const outcomeEmbed = new EmbedBuilder()
                      .setColor(embedColor)
                      .setTitle(`${outcomeTitlePrefix} ${submitterName}'s Suggestion`)
                      .setDescription(`### Original Suggestion:\n\`\`\`\n${suggestion.replace(/```/g, '')}\n\`\`\`\n### Reason:\n\`\`\`\n${reason}\n\`\`\``)
                      .setAuthor({
                        name: `Decision by ${modalInteraction.user.tag}`,
                        iconURL: modalInteraction.user.displayAvatarURL({ size: 128 })
                      })
                      .setThumbnail(modalInteraction.guild?.members.cache.get(submitter.match(/<@!?(\d+)>/)?.[1] || '')?.displayAvatarURL({ size: 256 }) || null)
                      .setFooter({ 
                        text: `Suggestion ID: ${suggestionId}`,
                        iconURL: modalInteraction.user.displayAvatarURL({ size: 32 })
                      })
                      .setTimestamp();
                    
                    await outcomeChannel.send({ embeds: [outcomeEmbed] });
                  }
                } catch (outcomeError) {
                  Logger.error('Error sending to outcome channel:');
                  Logger.error(outcomeError as Error);
                  // Continue as this is not critical - the main suggestion was processed successfully
                }
              }
            }
            
            // Reset cooldown for the suggestion creator if the suggestion was closed
            try {
              const { userCooldowns } = require('../commands/misc/suggest');
              const submitterMatch = submitter.match(/<@!?(\d+)>/);
              if (submitterMatch && submitterMatch[1]) {
                const submitterId = submitterMatch[1];
                // Remove cooldown to allow user to submit a new suggestion immediately
                userCooldowns.delete(submitterId);
              }
            } catch (cooldownError) {
              Logger.error('Error resetting user cooldown:');
              Logger.error(cooldownError as Error);
              // Continue as this is not critical
            }
            
            // Acknowledge the interaction
            await modalInteraction.reply({
              content: `You've ${outcome === 'close' ? 'closed' : outcome + 'ed'} the suggestion with reason: ${reason}`,
              ephemeral: true
            });
          } catch (error) {
            Logger.error('Error processing suggestion:');
            Logger.error(error as Error);
            
            // Provide a friendly error message to the user
            if (!modalInteraction.replied) {
              await modalInteraction.reply({
                content: 'Something went wrong while processing the suggestion. Please try again later.',
                ephemeral: true
              });
            }
          }
        }
        
        // Handle suggestion creation
        else if (customId.startsWith('suggestion_create_')) {
          const parts = customId.split('_');
          if (parts.length < 3) return;
          
          // Get the category from the custom ID
          const categoryRaw = parts.slice(2).join('_');
          const category = categoryRaw || 'Uncategorized';
          
          // Get suggestion text
          const suggestion = modalInteraction.fields.getTextInputValue('suggestion_text');
          
          // Create suggestion ID
          const suggestionId = `SUG-${Date.now().toString().slice(-6)}`;
          
          // Get guild configuration using SuggestionManager - fix the typings
          const guildConfig: {
            channelId: string;
            reviewRoleId?: string;
            outcomeChannelId?: string;
            requireApproval?: boolean;
          } = await SuggestionManager.getConfig(modalInteraction.guildId!);
          
          // Handle missing suggestion channel configuration
          if (!guildConfig.channelId) {
            Logger.error('Suggestion channel not configured');
            return modalInteraction.reply({
              content: 'The suggestion system is not properly configured. Please ask an administrator to run `/suggest setup`.',
              ephemeral: true
            });
          }
          
          // Try to fetch the suggestion channel
          let suggestionChannel;
          try {
            suggestionChannel = await modalInteraction.client.channels.fetch(guildConfig.channelId);
          } catch (error) {
            Logger.error(`Error fetching suggestion channel: ${error instanceof Error ? error.message : String(error)}`);
            return modalInteraction.reply({
              content: 'Could not access the suggestion channel. Please contact an administrator.',
              ephemeral: true
            });
          }
          
          // Check if the channel is a text channel
          if (!suggestionChannel || suggestionChannel.type !== ChannelType.GuildText) {
            Logger.error(`Invalid suggestion channel type: ${suggestionChannel?.type}`);
            return modalInteraction.reply({
              content: 'The configured suggestion channel is invalid. Please contact an administrator.',
              ephemeral: true
            });
          }
          
          try {
            // Create suggestion embed
            const suggestionEmbed = new EmbedBuilder()
              .setColor(COLORS.INFO)
              .setTitle(`Suggestion #${suggestionId}`)
              .setDescription(`\`\`\`\n${suggestion}\n\`\`\``)
              .addFields(
                { name: 'Status', value: '⏳ Pending', inline: true },
                { name: 'Category', value: category, inline: true },
                { name: 'Submitted by', value: `${modalInteraction.user}`, inline: true },
                { name: 'Information', value: "Upvotes: 0\nDownvotes: 0", inline: false }
              )
              .setAuthor({
                name: modalInteraction.user.tag
              })
              .setThumbnail(modalInteraction.user.displayAvatarURL({ size: 256 }))
              .setFooter({ 
                text: `Suggestion ID: ${suggestionId}`,
                iconURL: modalInteraction.user.displayAvatarURL({ size: 32 })
              })
              .setTimestamp();
            
            // Create buttons for voting and discussion
            // Store voter data in a custom string format in the emoji ID
            // Format: v_ for vote data, followed by Base64 encoded JSON
            const encodedData = btoa(JSON.stringify({ upvotes: [], downvotes: [] }));
            
            const likeButton = new ButtonBuilder()
              .setCustomId(`suggestion_like_${suggestionId}_${encodedData.substring(0, 10)}`) // Store first part in customId
              .setLabel('Upvote')
              .setStyle(ButtonStyle.Success)
              .setEmoji('⬆️');
            
            const dislikeButton = new ButtonBuilder()
              .setCustomId(`suggestion_dislike_${suggestionId}_${encodedData.substring(10, 20)}`) // Store second part in customId
              .setLabel('Downvote')
              .setStyle(ButtonStyle.Danger)
              .setEmoji('⬇️');
            
            const discussButton = new ButtonBuilder()
              .setCustomId(`suggestion_discuss_${suggestionId}_${encodedData.substring(20, 30)}`) // Store third part in customId
              .setLabel('Comment')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('💬');
            
            const closeButton = new ButtonBuilder()
              .setCustomId(`suggestion_close_${suggestionId}`) // No need to store data in this button
              .setLabel('Process')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('✅');
            
            // Create action row with buttons
            const row = new ActionRowBuilder<ButtonBuilder>()
              .addComponents(likeButton, dislikeButton, discussButton);
            
            // Add close button only for staff or support role members
            const supportRoleId = process.env.SUGGESTION_REVIEW_ROLE_ID;
            if (modalInteraction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) || 
                modalInteraction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
                (supportRoleId && modalInteraction.member instanceof GuildMember && 
                (modalInteraction.member as GuildMember).roles.cache.has(supportRoleId))) {
              
              row.addComponents(closeButton);
            }
            
            // Post suggestion to channel
            const textChannel = suggestionChannel as TextChannel;
            await textChannel.send({
              embeds: [suggestionEmbed],
              components: [row]
            });
            
            // Update user cooldown
            try {
              // Safely import the userCooldowns object
              let userCooldowns;
              try {
                const { userCooldowns: cooldowns } = require('../commands/misc/suggest');
                userCooldowns = cooldowns;
              } catch (importError) {
                Logger.error('Error importing user cooldowns:');
                Logger.error(importError as Error);
                // Continue without setting cooldown if import fails
              }
              
              // Set cooldown if available
              if (userCooldowns) {
                userCooldowns.set(modalInteraction.user.id, Date.now());
              }
            } catch (error) {
              Logger.error('Error setting user cooldown:');
              Logger.error(error as Error);
              // Continue without cooldown if it fails
            }
            
            // Confirmation message to the user
            await modalInteraction.reply({
              content: `Your suggestion has been submitted! You can view it in <#${guildConfig.channelId}>.`,
              ephemeral: true
            });
          } catch (error) {
            Logger.error('Error creating suggestion:');
            Logger.error(error as Error);
            await modalInteraction.reply({
              content: 'Something went wrong while submitting your suggestion. Please try again later.',
              ephemeral: true
            });
          }
        }
        
        // Handle ticket creation
        else if (customId.startsWith('ticket_create_')) {
          const parts = customId.split('_');
          if (parts.length < 3) return;
          
          // Get the category from the custom ID
          const category = parts[2];
          
          // Get ticket description
          const description = modalInteraction.fields.getTextInputValue('ticket_description');
          
          // Create ticket using the handleCreate function from ticket.ts
          try {
            // Create a mock interaction object with the necessary properties
            const mockInteraction = {
              options: {
                getString: (name: string) => {
                  if (name === 'category') return category;
                  if (name === 'description') return description;
                  return null;
                }
              },
              user: modalInteraction.user,
              guild: modalInteraction.guild,
              guildId: modalInteraction.guildId,
              reply: modalInteraction.reply.bind(modalInteraction)
            } as unknown as ChatInputCommandInteraction;
            
            // Import and call the handleCreate function
            const { handleCreate } = await import('../commands/misc/ticket');
            await handleCreate(mockInteraction);
          } catch (error) {
            Logger.error('Error creating ticket:');
            Logger.error(error as Error);
            
            await modalInteraction.reply({
              content: 'Something went wrong while creating your ticket. Please try again later.',
              ephemeral: true
            });
          }
        }
        
      } catch (error: any) {
        Logger.error('Error handling modal submission:');
        Logger.error(error as Error);
        
        if (!modalInteraction.replied) {
          await modalInteraction.reply({
            content: 'There was an error processing your submission.',
            ephemeral: true
          });
        }
      }
    }

    // Handle create suggestion submit
    if (interaction.isModalSubmit() && interaction.customId === 'suggestion_create') {
      await interaction.deferReply({ ephemeral: true });
      
      try {
        // Code to create a new suggestion
        const category = interaction.fields.getTextInputValue('suggestion_category');
        const title = interaction.fields.getTextInputValue('suggestion_title');
        const description = interaction.fields.getTextInputValue('suggestion_description');
        
        // Generate a random ID for the suggestion
        const suggestionId = `SUG-${Math.floor(Math.random() * 1000000)}`;
        
        const guildSuggestionConfig = await SuggestionManager.getConfig(interaction.guildId as string);
        
        if (!guildSuggestionConfig) {
          await interaction.editReply({
            content: 'Suggestion system is not configured for this server. Please contact an administrator.'
          });
          return;
        }
        
        const suggestionChannelId = guildSuggestionConfig.suggestionChannelId;
        const suggestionChannel = interaction.guild?.channels.cache.get(suggestionChannelId) as TextChannel;
        
        if (!suggestionChannel) {
          await interaction.editReply({
            content: 'Suggestion channel not found. Please contact an administrator.'
          });
          return;
        }
        
        // Initialize empty voter data
        const voterData = {
          upvotes: [] as string[],
          downvotes: [] as string[]
        };
        
        // Encode voter data
        const encodedVoterData = btoa(JSON.stringify(voterData));
        
        // Create suggestion embed
        const embed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle(`${title}`)
          .setDescription(`${description}`)
          .setTimestamp()
          .setAuthor({
            name: interaction.user.tag,
            iconURL: interaction.user.displayAvatarURL()
          })
          .setFields([
            { name: 'Category', value: category, inline: true },
            { name: 'Status', value: 'Pending', inline: true },
            { name: 'Submitted by', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Information', value: 'Upvotes: 0\nDownvotes: 0', inline: false }
          ])
          .setFooter({
            text: `Suggestion ID: ${suggestionId}`,
            iconURL: interaction.guild?.iconURL() || undefined
          });
        
        // Create buttons with voter data encoded in the custom IDs
        const likeButton = new ButtonBuilder()
          .setCustomId(`suggestion_like_${suggestionId}_${encodedVoterData.substring(0, 10)}`)
          .setLabel('Upvote')
          .setStyle(ButtonStyle.Success)
          .setEmoji('⬆️');
        
        const dislikeButton = new ButtonBuilder()
          .setCustomId(`suggestion_dislike_${suggestionId}_${encodedVoterData.substring(10, 20)}`)
          .setLabel('Downvote')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('⬇️');
        
        const discussButton = new ButtonBuilder()
          .setCustomId(`suggestion_discuss_${suggestionId}_${encodedVoterData.substring(20, 30)}`)
          .setLabel('Comment')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('💬');
        
        const row = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(likeButton, dislikeButton, discussButton);
        
        // Add close button only for staff or support role
        const staffRoleIds = process.env.STAFF_ROLE_IDS?.split(',') || [];
        const supportRoleId = process.env.SUPPORT_ROLE_ID || '';
        
        const memberRoles = interaction.member?.roles as GuildMemberRoleManager;
        
        if (memberRoles && (
          staffRoleIds.some(roleId => memberRoles.cache.has(roleId)) || 
          (supportRoleId && memberRoles.cache.has(supportRoleId))
        )) {
          const closeButton = new ButtonBuilder()
            .setCustomId(`suggestion_close_${suggestionId}`)
            .setLabel('Process')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('✅');
          
          row.addComponents(closeButton);
        }
        
        // Send suggestion to channel
        const suggestionMessage = await suggestionChannel.send({
          embeds: [embed],
          components: [row]
        });
        
        // Reply to user
        await interaction.editReply({
          content: `Your suggestion has been submitted! View it in ${suggestionChannel}: https://discord.com/channels/${interaction.guildId}/${suggestionChannelId}/${suggestionMessage.id}`
        });
      } catch (error) {
        console.error('Error creating suggestion:', error);
        await interaction.editReply({
          content: 'There was an error creating your suggestion. Please try again later.'
        });
      }
    }
  }
};