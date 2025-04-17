import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';

// Import type extensions
import '../../types/discord';

export = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot\'s latency and connection status'),
  
  async execute(interaction: ChatInputCommandInteraction) {
    // Send initial reply and get the response
    const response = await interaction.reply({ 
      embeds: [EmbedBuilderService.info('📊 Calculating connection status...')],
      fetchReply: true
    });
    
    // Calculate latencies
    const message = response;
    const botLatency = message.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);
    
    // Determine status emoji and color based on latency
    const getStatus = (latency: number) => {
      if (latency < 100) return { emoji: '🟢', color: COLORS.SUCCESS };
      if (latency < 200) return { emoji: '🟡', color: COLORS.WARNING };
      return { emoji: '🔴', color: COLORS.ERROR };
    };
    
    const botStatus = getStatus(botLatency);
    const apiStatus = getStatus(apiLatency);
    
    // Build response embed
    const pingEmbed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle('📊 Connection Status')
      .setDescription('Here\'s a detailed breakdown of the bot\'s connection status:')
      .addFields(
        { 
          name: `${botStatus.emoji} Bot Latency`, 
          value: `${botLatency}ms\n*Time taken to process commands*`,
          inline: true 
        },
        { 
          name: `${apiStatus.emoji} API Latency`, 
          value: `${apiLatency}ms\n*Discord API response time*`,
          inline: true 
        },
        { 
          name: '💡 Status', 
          value: botLatency < 200 && apiLatency < 200 
            ? '✅ All systems operational'
            : '⚠️ High latency detected',
          inline: false 
        }
      )
      .setFooter({ 
        text: 'Last checked',
        iconURL: interaction.client.user.displayAvatarURL()
      })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [pingEmbed] });
  },
  
  category: 'utility',
  cooldown: 5, // 5 seconds cooldown
} as Command; 