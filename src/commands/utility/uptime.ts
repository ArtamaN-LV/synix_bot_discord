import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';

export = {
  data: new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('Display the bot\'s uptime and system information'),

  async execute(interaction: ChatInputCommandInteraction) {
    const uptime = interaction.client.uptime;
    const formattedUptime = formatUptime(uptime);
    
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsed = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const memoryTotal = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    
    // Create embed
    const uptimeEmbed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle('⏱️ Bot Uptime')
      .setDescription('Here\'s a detailed breakdown of the bot\'s uptime and system status:')
      .addFields(
        { 
          name: '🕒 Uptime', 
          value: formattedUptime,
          inline: true 
        },
        { 
          name: '💾 Memory Usage', 
          value: `${memoryUsed}MB / ${memoryTotal}MB\n*${Math.round((memoryUsed / memoryTotal) * 100)}% used*`,
          inline: true 
        },
        { 
          name: '📊 System Status', 
          value: memoryUsed / memoryTotal > 0.8 
            ? '⚠️ High memory usage detected'
            : '✅ System operating normally',
          inline: false 
        }
      )
      .setFooter({ 
        text: 'Last updated',
        iconURL: interaction.client.user.displayAvatarURL()
      })
      .setTimestamp();
    
    await interaction.reply({ embeds: [uptimeEmbed] });
  },
  
  category: 'utility',
  cooldown: 5, // 5 seconds cooldown
} as Command;

/**
 * Format the uptime into a human-readable string
 * @param uptime The uptime in milliseconds
 * @returns A formatted string (e.g., "2 days, 5 hours, 30 minutes, 10 seconds")
 */
function formatUptime(uptime: number): string {
  const totalSeconds = Math.floor(uptime / 1000);
  
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  const parts: string[] = [];
  
  if (days > 0) {
    parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  }
  
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  }
  
  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  }
  
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds} ${seconds === 1 ? 'second' : 'seconds'}`);
  }
  
  return parts.join(', ');
} 