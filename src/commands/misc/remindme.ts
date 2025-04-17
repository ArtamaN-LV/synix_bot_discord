import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  ComponentType,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';

// Map to store active reminders
const activeReminders = new Map();

// Function to parse time string into milliseconds
function parseTimeString(timeStr: string): number | null {
  const timeRegex = /^(\d+)([smhd])$/i;
  const match = timeStr.match(timeRegex);
  
  if (!match) return null;
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  // Convert to milliseconds based on unit
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

// Function to format milliseconds to readable time
function formatTime(milliseconds: number): string {
  if (milliseconds < 60000) {
    return `${Math.round(milliseconds / 1000)} seconds`;
  } else if (milliseconds < 3600000) {
    return `${Math.round(milliseconds / 60000)} minutes`;
  } else if (milliseconds < 86400000) {
    return `${Math.round(milliseconds / 3600000)} hours`;
  } else {
    return `${Math.round(milliseconds / 86400000)} days`;
  }
}

export = {
  data: new SlashCommandBuilder()
    .setName('remindme')
    .setDescription('Set a personal reminder')
    .addStringOption(option => 
      option
        .setName('time')
        .setDescription('When to remind you (e.g., 10s, 5m, 2h, 1d)')
        .setRequired(true)
    )
    .addStringOption(option => 
      option
        .setName('reminder')
        .setDescription('What to remind you about')
        .setRequired(true)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    const timeString = interaction.options.getString('time', true);
    const reminderText = interaction.options.getString('reminder', true);
    
    // Parse the time string
    const delayMs = parseTimeString(timeString);
    
    if (!delayMs) {
      return interaction.reply({
        content: 'Invalid time format. Please use a number followed by s (seconds), m (minutes), h (hours), or d (days). Example: 5m',
        ephemeral: true
      });
    }
    
    // Calculate when the reminder will be sent
    const now = Date.now();
    const reminderTime = now + delayMs;
    
    // Create a unique ID for this reminder
    const reminderId = `${interaction.user.id}-${now}`;
    
    // Create confirmation embed
    const confirmEmbed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setTitle('✅ Reminder Set')
      .setDescription(`I'll remind you about: **${reminderText}**`)
      .addFields(
        { name: 'When', value: `<t:${Math.floor(reminderTime / 1000)}:R>`, inline: true },
      )
      .setFooter({ 
        text: `Reminder ID: ${reminderId}`,
        iconURL: interaction.user.displayAvatarURL() 
      });
      
    // Create cancel button
    const cancelButton = new ButtonBuilder()
      .setCustomId(`cancel-${reminderId}`)
      .setLabel('Cancel Reminder')
      .setStyle(ButtonStyle.Danger);
      
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(cancelButton);
    
    // Send confirmation message with cancel button
    const reply = await interaction.reply({
      embeds: [confirmEmbed],
      components: [row],
      fetchReply: true
    });
    
    // Set up button collector
    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: delayMs > 900000 ? 900000 : delayMs // Max 15 minutes or until reminder triggers
    });
    
    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({
          content: 'This button is not for you',
          ephemeral: true
        });
        return;
      }
      
      if (i.customId === `cancel-${reminderId}`) {
        // Cancel the reminder
        clearTimeout(activeReminders.get(reminderId));
        activeReminders.delete(reminderId);
        
        // Update embed to show cancellation
        const cancelledEmbed = EmbedBuilder.from(confirmEmbed)
          .setColor(COLORS.ERROR)
          .setTitle('❌ Reminder Cancelled')
          .setDescription(`Cancelled reminder: **${reminderText}**`);
        
        await i.update({
          embeds: [cancelledEmbed],
          components: []
        });
      }
    });
    
    // Set the timeout for the reminder
    const timeout = setTimeout(async () => {
      // Send the reminder DM
      try {
        const reminderEmbed = new EmbedBuilder()
          .setColor(COLORS.INFO)
          .setTitle('⏰ Reminder')
          .setDescription(reminderText)
          .addFields(
            { name: 'Set', value: `<t:${Math.floor(now / 1000)}:R>`, inline: true }
          )
          .setTimestamp();
        
        await interaction.user.send({ embeds: [reminderEmbed] });
        
        // Update the original message to show the reminder was sent
        const sentEmbed = EmbedBuilder.from(confirmEmbed)
          .setColor(COLORS.INFO)
          .setTitle('⏰ Reminder Sent')
          .setDescription(`Sent reminder: **${reminderText}**`);
        
        await interaction.editReply({
          embeds: [sentEmbed],
          components: []
        });
      } catch (error) {
        // If DM fails, try to message in original channel
        const errorEmbed = new EmbedBuilder()
          .setColor(COLORS.ERROR)
          .setTitle('⏰ Reminder')
          .setDescription(`${interaction.user} I couldn't DM you, so here's your reminder: **${reminderText}**`)
          .setTimestamp();
        
        await interaction.editReply({
          embeds: [errorEmbed],
          components: []
        });
      }
      
      // Clean up
      activeReminders.delete(reminderId);
      collector.stop();
    }, delayMs);
    
    // Store the timeout
    activeReminders.set(reminderId, timeout);
  }
} as Command; 