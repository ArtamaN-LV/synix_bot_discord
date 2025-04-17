import { Events, Message, Collection, TextChannel } from 'discord.js';
import { EmbedBuilderService } from '../utils/embedBuilder';
import { COLORS } from '../utils/constants';
import afkCommand from '../commands/misc/afk';
import { getGuildPrefix } from '../services/GuildPrefixService';
import { TextCommand } from '../interfaces/textCommand';
import { LevelingService } from '../services/LevelingService';
import path from 'path';
import fs from 'fs';

// Store loaded text commands
const textCommands = new Collection<string, TextCommand>();

// Cooldown tracking for XP
const xpCooldowns = new Collection<string, number>();

// Load text commands
(async () => {
  try {
    const commandCategories = fs.readdirSync(path.join(__dirname, '../commands'));
    
    for (const category of commandCategories) {
      const categoryPath = path.join(__dirname, `../commands/${category}`);
      
      // Skip if not a directory (like .DS_Store files)
      if (!fs.statSync(categoryPath).isDirectory()) continue;
      
      const commandFiles = fs.readdirSync(path.join(__dirname, `../commands/${category}`))
        .filter(file => file.endsWith('.ts') || file.endsWith('.js'));
      
      for (const file of commandFiles) {
        const command = await import(`../commands/${category}/${file}`);
        // Only add commands that have a textExecute method
        if (command.textExecute) {
          textCommands.set(command.data.name, command);
        }
      }
    }
    
    console.log(`Loaded ${textCommands.size} text commands`);
  } catch (error) {
    console.error('Error loading text commands:', error);
  }
})();

export = {
  name: Events.MessageCreate,
  once: false,
  async execute(message: Message) {
    // Ignore bot messages
    if (message.author.bot) return;
    
    try {
      // Check if the message author is AFK
      if (afkCommand.afkUsers.has(message.author.id)) {
        // Remove AFK status and update nickname
        afkCommand.afkUsers.delete(message.author.id);
        
        // Remove AFK from nickname if possible
        if (message.member && message.member.manageable) {
          const currentNick = message.member.nickname;
          if (currentNick && currentNick.startsWith('[AFK] ')) {
            try {
              await message.member.setNickname(currentNick.slice(6));
            } catch (error) {
              console.error('Error updating nickname:', error);
            }
          }
        }
        
        const returnEmbed = EmbedBuilderService.success('Welcome back! Your AFK status has been removed.');
        
        const reply = await message.reply({ embeds: [returnEmbed] });
        
        // Delete the welcome back message after 5 seconds to reduce chat clutter
        setTimeout(() => {
          reply.delete().catch(console.error);
        }, 5000);
      }
      
      // Check if the message mentions any AFK users
      if (message.mentions.users.size > 0) {
        const mentionedAfkUsers = message.mentions.users.filter(user => 
          afkCommand.afkUsers.has(user.id)
        );
        
        if (mentionedAfkUsers.size > 0) {
          // Build a list of AFK users with their reasons
          const afkList = mentionedAfkUsers.map(user => {
            const { reason, timestamp } = afkCommand.afkUsers.get(user.id)!;
            const timeAgo = Math.floor((Date.now() - timestamp) / 60000); // in minutes
            
            return `**${user.username}** is AFK: ${reason} (${timeAgo} ${timeAgo === 1 ? 'minute' : 'minutes'} ago)`;
          }).join('\n');
          
          const afkEmbed = EmbedBuilderService.createEmbed()
            .setColor(COLORS.INFO)
            .setTitle('🔕 AFK Users Mentioned')
            .setDescription(afkList);
          
          const reply = await message.reply({ embeds: [afkEmbed] });
          
          // Delete the AFK notification after 10 seconds
          setTimeout(() => {
            reply.delete().catch(console.error);
          }, 10000);
        }
      }

      // Award XP for messages
      if (message.guild) {
        const userId = message.author.id;
        const now = Date.now();
        const cooldown = 300000; // 5 minutes cooldown (increased from 1 minute)
        
        // Check if user is on cooldown
        if (!xpCooldowns.has(userId) || now - xpCooldowns.get(userId)! > cooldown) {
          // Get server settings
          const settings = LevelingService.getServerSettings(message.guild.id);
          
          // Only award XP if leveling is enabled
          if (settings.enabled) {
            // Calculate base XP based on message length
            const messageLength = message.content.length;
            let baseXP = 0;
            
            // Minimum message length to get XP
            if (messageLength >= 10) {
              // Base XP between 10-20 for messages 10-50 characters
              if (messageLength <= 50) {
                baseXP = Math.floor(Math.random() * 11) + 10;
              } 
              // Base XP between 15-25 for messages 51-100 characters
              else if (messageLength <= 100) {
                baseXP = Math.floor(Math.random() * 11) + 15;
              }
              // Base XP between 20-30 for messages over 100 characters
              else {
                baseXP = Math.floor(Math.random() * 11) + 20;
              }
            }
            
            // Apply server multiplier
            const xpToAdd = Math.floor(baseXP * settings.xpMultiplier);
            
            // Add XP to user
            const result = await LevelingService.addXP(userId, xpToAdd);
            
            // Set cooldown
            xpCooldowns.set(userId, now);
            
            // Handle level up if it occurred
            if (result.levelUp && result.newLevel) {
              const levelUpEmbed = EmbedBuilderService.createEmbed()
                .setColor(COLORS.SUCCESS)
                .setTitle('🎉 Level Up!')
                .setDescription(`Congratulations <@${userId}>! You've reached level **${result.newLevel}**!`)
                .setThumbnail(message.author.displayAvatarURL());
              
              // Send level up message based on server settings
              switch (settings.announceMode) {
                case 'current':
                  await (message.channel as TextChannel).send({ embeds: [levelUpEmbed] });
                  break;
                case 'dm':
                  try {
                    await message.author.send({ embeds: [levelUpEmbed] });
                  } catch (error) {
                    // User might have DMs closed, send in current channel instead
                    await (message.channel as TextChannel).send({ embeds: [levelUpEmbed] });
                  }
                  break;
                case 'channel':
                  if (settings.announceChannel) {
                    const channel = message.guild.channels.cache.get(settings.announceChannel);
                    if (channel?.isTextBased()) {
                      await (channel as TextChannel).send({ embeds: [levelUpEmbed] });
                    }
                  }
                  break;
                // 'disabled' mode does nothing
              }
            }
          }
        }
      }
      
      // Process text commands
      if (message.guild) {
        try {
          // Get the guild's prefix
          const prefix = await getGuildPrefix(message.guild.id);
          
          // Also check for the !verify command
          if (message.content.toLowerCase() === '!verify') {
            // Import and execute the verify command (handled in the verify command itself)
            try {
              const { textVerify } = await import('../commands/moderation/verify');
              if (textVerify) {
                await textVerify(message);
              }
            } catch (error) {
              console.error('Error executing !verify command:', error);
            }
            return;
          }
          
          // Check if message starts with the prefix
          if (!message.content.startsWith(prefix)) return;
          
          // Extract command name and arguments
          const args = message.content.slice(prefix.length).trim().split(/ +/);
          const commandName = args.shift()?.toLowerCase();
          
          if (!commandName) return;
          
          // Find the command
          const command = textCommands.get(commandName);
          
          if (!command) return;
          
          // Execute the command
          await command.textExecute(message, args);
        } catch (error) {
          console.error('Error processing text command:', error);
        }
      }
    } catch (error) {
      console.error('Error in messageCreate event:', error);
    }
  }
}; 