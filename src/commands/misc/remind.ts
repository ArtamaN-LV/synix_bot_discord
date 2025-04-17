import { SlashCommandBuilder, ChatInputCommandInteraction, TextChannel, DMChannel, NewsChannel } from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';

// Import type extensions
import '../../types/discord';

// Store active reminders in memory
// In a production bot, these would be stored in a database to persist across restarts
const activeReminders = new Map<string, NodeJS.Timeout>();

export = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Set a reminder for yourself')
    .addStringOption(option => 
      option.setName('time')
        .setDescription('Time until reminder (e.g. 1h, 30m, 5h30m)')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('task')
        .setDescription('What to remind you about')
        .setRequired(true)),
  
  async execute(interaction: ChatInputCommandInteraction) {
    const timeInput = interaction.options.getString('time', true);
    const task = interaction.options.getString('task', true);
    
    // Parse the time input
    const minutes = parseTimeInput(timeInput);
    
    if (minutes <= 0 || minutes > 10080) { // Max 1 week (10080 minutes)
      return interaction.reply({
        embeds: [EmbedBuilderService.error('Please provide a valid time between 1 minute and 1 week (e.g. 1h30m, 2d, 45m).')],
        ephemeral: true
      });
    }
    
    // Convert to milliseconds for setTimeout
    const milliseconds = minutes * 60 * 1000;
    
    // Format the time for display
    const formattedTime = formatTime(minutes);
    
    // Calculate when the reminder will trigger
    const triggerTime = new Date(Date.now() + milliseconds);
    const unixTimestamp = Math.floor(triggerTime.getTime() / 1000);
    
    // Create a unique ID for this reminder
    const reminderId = `${interaction.user.id}-${Date.now()}`;
    
    // Set the timeout for the reminder
    const timeout = setTimeout(async () => {
      try {
        // Create the reminder embed
        const reminderEmbed = EmbedBuilderService.createEmbed()
          .setColor(COLORS.PRIMARY)
          .setTitle('⏰ Reminder')
          .setDescription(`You asked me to remind you about: **${task}**`)
          .setFooter({ text: `Reminder set ${formattedTime} ago` });
        
        // Send the reminder
        await interaction.user.send({ embeds: [reminderEmbed] });
        
        // Remove from active reminders
        activeReminders.delete(reminderId);
      } catch (error) {
        console.error('Error sending reminder:', error);
        // If we can't DM the user, try to send it in the channel if it's not too old
        if (Date.now() - interaction.createdTimestamp < 60 * 60 * 1000) { // Less than 1 hour old
          try {
            const channel = interaction.channel;
            if (channel && ('send' in channel)) {
              await channel.send({
                content: `<@${interaction.user.id}>`,
                embeds: [
                  EmbedBuilderService.createEmbed()
                    .setColor(COLORS.PRIMARY)
                    .setTitle('⏰ Reminder')
                    .setDescription(`You asked me to remind you about: **${task}**`)
                ]
              });
            }
          } catch (e) {
            console.error('Failed to send reminder in channel:', e);
          }
        }
        
        // Clean up
        activeReminders.delete(reminderId);
      }
    }, milliseconds);
    
    // Store the timeout
    activeReminders.set(reminderId, timeout);
    
    // Confirm the reminder was set
    const confirmEmbed = EmbedBuilderService.createEmbed()
      .setColor(COLORS.SUCCESS)
      .setTitle('⏰ Reminder Set')
      .setDescription(`I'll remind you about: **${task}**`)
      .addFields(
        { name: 'When', value: `In ${formattedTime} (<t:${unixTimestamp}:R>)`, inline: true }
      );
    
    await interaction.reply({ embeds: [confirmEmbed] });
  },
  
  category: 'misc',
  cooldown: 5,
} as Command;

/**
 * Parse time input in format like 1h30m, 2d, 45m
 * @param input Time input string
 * @returns Total minutes
 */
function parseTimeInput(input: string): number {
  // Remove all whitespace
  input = input.replace(/\s+/g, '').toLowerCase();
  
  let minutes = 0;
  
  // Days
  const daysMatch = input.match(/(\d+)d/);
  if (daysMatch) {
    minutes += parseInt(daysMatch[1]) * 24 * 60;
  }
  
  // Hours
  const hoursMatch = input.match(/(\d+)h/);
  if (hoursMatch) {
    minutes += parseInt(hoursMatch[1]) * 60;
  }
  
  // Minutes
  const minutesMatch = input.match(/(\d+)m/);
  if (minutesMatch) {
    minutes += parseInt(minutesMatch[1]);
  }
  
  // If no valid format was found but there's just a number, interpret as minutes
  if (minutes === 0 && /^\d+$/.test(input)) {
    minutes = parseInt(input);
  }
  
  return minutes;
}

/**
 * Format minutes into a human-readable string
 * @param totalMinutes Total minutes
 * @returns Formatted time string
 */
function formatTime(totalMinutes: number): string {
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  
  const parts = [];
  
  if (days > 0) {
    parts.push(`${days} day${days === 1 ? '' : 's'}`);
  }
  
  if (hours > 0) {
    parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  }
  
  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  }
  
  return parts.join(' ');
}
