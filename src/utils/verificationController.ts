import { 
  Message, 
  TextChannel, 
  EmbedBuilder, 
  GuildMember, 
  ButtonInteraction,
  Guild,
  Role
} from 'discord.js';
import { COLORS } from './constants';
import { Logger } from './logger';
import { getClient } from './clientProvider';

// Store verification settings (in a real implementation, this would be in a database)
const verificationSettings: Record<string, {
  enabled: boolean;
  roleId: string;
  channelId: string;
  captcha: boolean;
  timeout: number;
  message: string | null;
}> = {};

// Store verification logs
const verificationLogs: Record<string, Array<{
  userId: string;
  username: string;
  action: string;
  timestamp: string;
}>> = {};

// Store timeout intervals
const timeoutIntervals: Record<string, NodeJS.Timeout> = {};

/**
 * Verification Controller - Handles all verification-related functionality
 */
export class VerificationController {
  /**
   * Set up the verification system for a guild
   */
  static async setupVerification(
    guild: Guild, 
    roleId: string | null, 
    channelId: string | null, 
    customMessage: string | null,
    enableCaptcha: boolean, 
    timeoutMinutes: number
  ) {
    try {
      // Get or create the verification role
      let verifyRole: Role;
      if (roleId) {
        const role = await guild.roles.fetch(roleId);
        if (!role) {
          throw new Error('The specified role does not exist.');
        }
        verifyRole = role;
      } else {
        verifyRole = await guild.roles.create({
          name: 'Verified',
          color: 0x43b581, // Discord green
          reason: 'Verification system setup',
          permissions: []
        });
        Logger.info(`Created verification role: ${verifyRole.name} in ${guild.name}`);
      }

      // Get or create the verification channel
      let verifyChannel: TextChannel;
      if (channelId) {
        const channel = await guild.channels.fetch(channelId);
        if (!channel || !channel.isTextBased() || channel.isDMBased()) {
          throw new Error('The specified channel does not exist or is not a text channel.');
        }
        verifyChannel = channel as TextChannel;
        
        // Update permissions for the existing channel
        await verifyChannel.permissionOverwrites.set([
          {
            id: guild.id, // @everyone role
            allow: ['ViewChannel', 'ReadMessageHistory', 'SendMessages'],
            deny: []
          },
          {
            id: guild.client.user!.id, // Bot role
            allow: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'ReadMessageHistory']
          },
          {
            id: verifyRole.id, // Verification role
            deny: ['ViewChannel']
          }
        ]);
        
      } else {
        verifyChannel = await guild.channels.create({
          name: 'verify',
          type: 0, // Text channel
          permissionOverwrites: [
            {
              id: guild.id, // @everyone role
              allow: ['ViewChannel', 'ReadMessageHistory', 'SendMessages'],
              deny: []
            },
            {
              id: guild.client.user!.id, // Bot role
              allow: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'ReadMessageHistory']
            },
            {
              id: verifyRole.id, // Verification role - they shouldn't see this channel once verified
              deny: ['ViewChannel']
            }
          ],
          reason: 'Verification system setup'
        }) as TextChannel;
        Logger.info(`Created verification channel: ${verifyChannel.name} in ${guild.name}`);
      }

      // Save verification settings
      const settings = {
        enabled: true,
        roleId: verifyRole.id,
        channelId: verifyChannel.id,
        captcha: enableCaptcha,
        timeout: timeoutMinutes,
        message: customMessage
      };

      // Store in "database"
      verificationSettings[guild.id] = settings;
      verificationLogs[guild.id] = verificationLogs[guild.id] || [];

      // Set up timeout system if enabled
      if (timeoutMinutes > 0) {
        this.setupTimeoutCheck(guild.id, timeoutMinutes);
      }

      return {
        role: verifyRole,
        channel: verifyChannel,
        settings
      };
    } catch (error) {
      Logger.error('Error setting up verification system:');
      Logger.error(error as Error);
      throw error;
    }
  }

  /**
   * Disable the verification system for a guild
   */
  static disableVerification(guildId: string) {
    if (!verificationSettings[guildId]) {
      return false;
    }

    // First, mark as disabled so other processes know to stop working with it
    verificationSettings[guildId].enabled = false;
    
    // Clear timeout interval if it exists
    if (timeoutIntervals[guildId]) {
      clearInterval(timeoutIntervals[guildId]);
      delete timeoutIntervals[guildId];
    }

    // Log that verification was disabled
    this.logVerification(guildId, 'SYSTEM', 'System', 'Verification system disabled');

    return true;
  }

  /**
   * Get verification logs for a guild
   */
  static getVerificationLogs(guildId: string, limit: number = 10) {
    const logs = verificationLogs[guildId] || [];
    return logs.slice(-limit);
  }

  /**
   * Get verification settings for a guild
   */
  static async getVerificationSettings(guildId: string) {
    const settings = verificationSettings[guildId];
    
    // If no settings or already disabled, just return the settings
    if (!settings || !settings.enabled) {
      return settings;
    }
    
    try {
      // Check if the channel and role still exist
      const client = getClient();
      
      if (!client) {
        Logger.warn('Discord client is not available yet. Cannot check verification settings.');
        return settings;
      }
      
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      
      if (guild) {
        let shouldDisable = false;
        
        // Try to fetch the channel
        const channel = await guild.channels.fetch(settings.channelId).catch(() => null);
        
        // If channel doesn't exist anymore, mark for disabling
        if (!channel) {
          Logger.warn(`Verification channel (ID: ${settings.channelId}) for guild ${guildId} no longer exists.`);
          shouldDisable = true;
        }
        
        // Try to fetch the role
        const role = await guild.roles.fetch(settings.roleId).catch(() => null);
        
        // If role doesn't exist anymore, mark for disabling
        if (!role) {
          Logger.warn(`Verification role (ID: ${settings.roleId}) for guild ${guildId} no longer exists.`);
          shouldDisable = true;
        }
        
        // If either channel or role is missing, disable verification
        if (shouldDisable) {
          Logger.warn(`Disabling verification system for guild ${guildId} due to missing channel or role.`);
          settings.enabled = false;
          
          // Clear timeout interval if it exists
          if (timeoutIntervals[guildId]) {
            clearInterval(timeoutIntervals[guildId]);
            delete timeoutIntervals[guildId];
          }
        }
      }
    } catch (error) {
      // Log the error but don't throw it
      Logger.error(`Error checking verification settings for guild ${guildId}:`);
      Logger.error(error as Error);
    }
    
    return settings;
  }

  /**
   * Handle text-based verification (!verify)
   */
  static async handleTextVerification(message: Message) {
    if (!message.guild) return;

    try {
      // Check if verification is set up for this guild
      const settings = await this.getVerificationSettings(message.guild.id);
      if (!settings || !settings.enabled) return;
      
      // Check if the message is in the verification channel
      if (message.channel.id !== settings.channelId) return;
      
      // Check if the user is already verified
      const member = message.member;
      if (!member) return;
      
      if (member.roles.cache.has(settings.roleId)) {
        return message.reply({
          content: 'You are already verified!',
          allowedMentions: { repliedUser: false }
        }).then(reply => {
          // Delete the message after 5 seconds
          setTimeout(() => reply.delete().catch(() => {}), 5000);
        });
      }
      
      // Remove the user's message to keep the channel clean
      message.delete().catch(() => {});
      
      const verifyChannel = message.channel as TextChannel;
      
      if (settings.captcha) {
        // Generate simple CAPTCHA
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        const answer = num1 + num2;
        
        const captchaEmbed = new EmbedBuilder()
          .setColor(COLORS.INFO)
          .setTitle('Verification CAPTCHA')
          .setDescription(`Please solve this simple math problem to verify:\n\n**${num1} + ${num2} = ?**\n\nReply with the answer within 30 seconds.`);
        
        const captchaMessage = await verifyChannel.send({
          content: `<@${message.author.id}>`,
          embeds: [captchaEmbed]
        });
        
        // Create message collector for the answer
        const filter = (m: Message) => m.author.id === message.author.id;
        
        try {
          const collected = await verifyChannel.awaitMessages({
            filter,
            max: 1,
            time: 30000,
            errors: ['time']
          });
          
          const response = collected.first();
          if (!response) return;
          
          const userAnswer = parseInt(response.content.trim());
          
          // Delete user's message to keep channel clean
          try {
            await response.delete();
          } catch (error) {
            // Ignore errors if we can't delete
          }
          
          // Delete CAPTCHA message
          try {
            await captchaMessage.delete();
          } catch (error) {
            // Ignore errors if we can't delete
          }
          
          if (isNaN(userAnswer) || userAnswer !== answer) {
            const failMessage = await verifyChannel.send({
              content: `<@${message.author.id}> Incorrect answer. Please try verifying again.`
            });
            
            // Delete the message after 5 seconds
            setTimeout(() => failMessage.delete().catch(() => {}), 5000);
            return;
          }
          
          // CAPTCHA passed, add role
          await member.roles.add(settings.roleId);
          
          // Log verification
          this.logVerification(message.guild.id, message.author.id, message.author.tag, 'Verified (CAPTCHA via text)');
          
          const successMessage = await verifyChannel.send({
            content: `<@${message.author.id}> CAPTCHA solved correctly! You have been verified. The verification channel will now be hidden, and you'll have access to other channels.`
          });
          
          // Delete the message after 5 seconds
          setTimeout(() => successMessage.delete().catch(() => {}), 5000);
          
        } catch (error) {
          // Time expired
          try {
            await captchaMessage.delete();
          } catch (e) {
            // Ignore errors if we can't delete
          }
          
          const timeoutMessage = await verifyChannel.send({
            content: `<@${message.author.id}> You took too long to respond. Please try verifying again.`
          });
          
          // Delete the message after 5 seconds
          setTimeout(() => timeoutMessage.delete().catch(() => {}), 5000);
        }
      } else {
        // Simple verification, just add the role
        await member.roles.add(settings.roleId);
        
        // Log verification
        this.logVerification(message.guild.id, message.author.id, message.author.tag, 'Verified (text)');
        
        const successMessage = await verifyChannel.send({
          content: `<@${message.author.id}> You have been verified! The verification channel will now be hidden, and you'll have access to other channels.`
        });
        
        // Delete the message after 5 seconds
        setTimeout(() => successMessage.delete().catch(() => {}), 5000);
      }
    } catch (error) {
      Logger.error('Error in text verification:');
      Logger.error(error as Error);
    }
  }

  /**
   * Handle button-based verification
   */
  static async handleButtonVerification(interaction: ButtonInteraction) {
    try {
      const member = interaction.member as GuildMember;
      const settings = await this.getVerificationSettings(interaction.guildId!);
      
      if (!settings || !settings.enabled) {
        return interaction.reply({
          content: 'The verification system is not enabled on this server.',
          ephemeral: true
        });
      }
      
      // Check if member is already verified
      if (member.roles.cache.has(settings.roleId)) {
        return interaction.reply({
          content: 'You are already verified!',
          ephemeral: true
        });
      }

      if (settings.captcha) {
        // Generate simple CAPTCHA
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        const answer = num1 + num2;

        const captchaEmbed = new EmbedBuilder()
          .setColor(COLORS.INFO)
          .setTitle('Verification CAPTCHA')
          .setDescription(`Please solve this simple math problem to verify:\n\n**${num1} + ${num2} = ?**\n\nReply with the answer within 30 seconds.`);

        await interaction.reply({
          embeds: [captchaEmbed],
          ephemeral: true
        });

        // Create message collector for the answer
        const filter = (m: Message) => m.author.id === interaction.user.id;
        const channel = interaction.channel as TextChannel;
        
        try {
          const collected = await channel.awaitMessages({
            filter,
            max: 1,
            time: 30000,
            errors: ['time']
          });

          const response = collected.first();
          if (!response) return;
          
          const userAnswer = parseInt(response.content.trim());

          // Delete user's message to keep channel clean
          try {
            await response.delete();
          } catch (error) {
            // Ignore errors if we can't delete
          }

          if (isNaN(userAnswer) || userAnswer !== answer) {
            return interaction.followUp({
              content: 'Incorrect answer. Please try verifying again.',
              ephemeral: true
            });
          }

          // CAPTCHA passed, add role
          await member.roles.add(settings.roleId);
          
          // Log verification
          this.logVerification(interaction.guildId!, interaction.user.id, interaction.user.tag, 'Verified (CAPTCHA)');

          return interaction.followUp({
            content: 'CAPTCHA solved correctly! You have been verified. The verification channel will now be hidden, and you will have access to other channels.',
            ephemeral: true
          });
        } catch (error) {
          return interaction.followUp({
            content: 'You took too long to respond. Please try verifying again.',
            ephemeral: true
          });
        }
      } else {
        // Simple verification, just add the role
        await member.roles.add(settings.roleId);
        
        // Log verification
        this.logVerification(interaction.guildId!, interaction.user.id, interaction.user.tag, 'Verified');

        return interaction.reply({
          content: 'You have been verified! You now have access to the server. The verification channel will now be hidden.',
          ephemeral: true
        });
      }
    } catch (error) {
      Logger.error('Error during verification:');
      Logger.error(error as Error);
      
      return interaction.reply({
        content: 'An error occurred during verification. Please try again or contact a server admin.',
        ephemeral: true
      });
    }
  }

  /**
   * Set up the verification timeout system 
   */
  private static setupTimeoutCheck(guildId: string, timeoutMinutes: number) {
    // Clear existing interval if there is one
    if (timeoutIntervals[guildId]) {
      clearInterval(timeoutIntervals[guildId]);
    }

    // Set up a new interval
    const interval = setInterval(async () => {
      try {
        const settings = verificationSettings[guildId];
        if (!settings || !settings.enabled) {
          clearInterval(interval);
          delete timeoutIntervals[guildId];
          return;
        }

        const client = getClient();
        
        if (!client) {
          Logger.warn('Discord client is not available for timeout check. Skipping this cycle.');
          return;
        }

        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) {
          clearInterval(interval);
          delete timeoutIntervals[guildId];
          return;
        }

        const members = await guild.members.fetch();
        const roleId = settings.roleId;

        for (const [id, member] of members) {
          // Skip bots
          if (member.user.bot) continue;

          // Check if the member doesn't have the verification role
          if (!member.roles.cache.has(roleId)) {
            const joinedAt = member.joinedAt;
            if (!joinedAt) continue;

            // Calculate time since join
            const now = new Date();
            const diffMs = now.getTime() - joinedAt.getTime();
            const diffMinutes = Math.floor(diffMs / 60000);

            // If they've been in the server longer than the timeout without verifying
            if (diffMinutes >= timeoutMinutes) {
              try {
                // Send DM if possible
                await member.send(
                  `You have been removed from ${guild.name} because you did not verify within ${timeoutMinutes} minutes.`
                ).catch(() => {}); // Ignore DM errors
                
                // Kick the member
                await member.kick('Failed to verify within the time limit');
                
                // Log the timeout
                this.logVerification(guildId, member.id, member.user.tag, 'Kicked (verification timeout)');
                
                Logger.info(`Kicked ${member.user.tag} for not verifying within ${timeoutMinutes} minutes`);
              } catch (error) {
                Logger.error(`Error kicking unverified member ${member.user.tag}:`);
                Logger.error(error as Error);
              }
            }
          }
        }
      } catch (error) {
        Logger.error('Error in verification timeout check:');
        Logger.error(error as Error);
      }
    }, 60000); // Check every minute

    // Store the interval reference
    timeoutIntervals[guildId] = interval;
  }

  /**
   * Logs a verification action
   */
  private static logVerification(guildId: string, userId: string, username: string, action: string) {
    // Create logs array if it doesn't exist
    verificationLogs[guildId] = verificationLogs[guildId] || [];
    
    // Add log entry
    verificationLogs[guildId].push({
      userId,
      username,
      action,
      timestamp: new Date().toISOString()
    });
    
    // Keep only the last 1000 logs
    if (verificationLogs[guildId].length > 1000) {
      verificationLogs[guildId] = verificationLogs[guildId].slice(-1000);
    }
  }

  /**
   * Update permissions for a guild's channels
   */
  static async updateChannelPermissions(guild: Guild, roleId: string, verifyChannelId: string) {
    const channels = await guild.channels.fetch();
    let updatedCount = 0;

    for (const [id, channel] of channels) {
      // Skip the verification channel
      if (id === verifyChannelId) continue;

      try {
        // Only update text, voice, and category channels
        if (!channel || (channel.type !== 0 && channel.type !== 2 && channel.type !== 4)) {
          continue;
        }

        await channel.permissionOverwrites.edit(guild.id, {
          ViewChannel: false
        });

        await channel.permissionOverwrites.edit(roleId, {
          ViewChannel: true
        });

        updatedCount++;
        Logger.info(`Updated permissions for channel: ${channel.name} in ${guild.name}`);
      } catch (error) {
        Logger.error(`Error updating permissions for channel ${channel?.name || id}:`);
        Logger.error(error as Error);
      }
    }

    return updatedCount;
  }

  /**
   * Reset permissions for a guild's channels
   */
  static async resetChannelPermissions(guild: Guild) {
    try {
      const channels = await guild.channels.fetch();
      let updatedCount = 0;

      for (const [id, channel] of channels) {
        try {
          // Only update text, voice, and category channels
          if (!channel || (channel.type !== 0 && channel.type !== 2 && channel.type !== 4)) {
            continue;
          }

          // Reset @everyone permissions for viewing channels
          await channel.permissionOverwrites.edit(guild.id, {
            ViewChannel: null
          });

          updatedCount++;
          Logger.info(`Reset permissions for channel: ${channel.name} in ${guild.name}`);
        } catch (error) {
          Logger.error(`Error resetting permissions for channel ${channel?.name || id}:`);
          Logger.error(error as Error);
        }
      }

      return updatedCount;
    } catch (error) {
      Logger.error(`Error fetching channels for guild ${guild.id}:`);
      Logger.error(error as Error);
      return 0;
    }
  }
} 