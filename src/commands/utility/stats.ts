import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, version as djsVersion } from 'discord.js';
import { Logger } from '../../utils/logger';
import { COLORS, BOT_NAME, BOT_VERSION } from '../../utils/constants';
import os from 'os';
import { formatDistanceToNow } from 'date-fns';
import { Command } from '../../interfaces/command';

export = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Display detailed bot statistics and system information'),
  
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      // Get bot statistics
      const serverCount = interaction.client.guilds.cache.size;
      const userCount = interaction.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
      const channelCount = interaction.client.channels.cache.size;
      
      // Get system information
      const memoryUsage = process.memoryUsage();
      const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
      const cpuCores = os.cpus().length;
      const osType = `${os.type()} ${os.release()}`;
      const uptime = formatDistanceToNow(Date.now() - interaction.client.uptime!, { addSuffix: true });
      
      // Create the embed
      const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle('📊 Bot Statistics')
        .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 }))
        .setDescription('Here\'s a comprehensive overview of the bot\'s statistics and system status:')
        .addFields(
          { 
            name: '🤖 Bot Information', 
            value: `
            **Name:** ${interaction.client.user.username}
            **Version:** ${BOT_VERSION}
            **Discord.js:** v${djsVersion}
            **Node.js:** ${process.version}
            **Uptime:** ${uptime}`,
            inline: false 
          },
          
          { 
            name: '📈 Server Stats', 
            value: `
            **Servers:** ${serverCount.toLocaleString()}
            **Users:** ${userCount.toLocaleString()}
            **Channels:** ${channelCount.toLocaleString()}`,
            inline: true 
          },
          
          { 
            name: '💻 System Stats', 
            value: `
            **Memory:** ${memoryUsedMB}MB / ${memoryTotalMB}MB
            **CPU Cores:** ${cpuCores}
            **OS:** ${osType}`,
            inline: true 
          },
          
          { 
            name: '📊 Performance', 
            value: `
            **Memory Usage:** ${Math.round((memoryUsedMB / memoryTotalMB) * 100)}%
            **API Latency:** ${Math.round(interaction.client.ws.ping)}ms
            **Status:** ${memoryUsedMB / memoryTotalMB > 0.8 ? '⚠️ High memory usage' : '✅ Optimal'}`,
            inline: false 
          }
        )
        .setFooter({ 
          text: `${BOT_NAME} • Utility Commands`,
          iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();
        
      await interaction.reply({ embeds: [embed] });
      
      Logger.info(`User ${interaction.user.tag} checked bot stats in ${interaction.guild?.name || 'DM'}`);
      
    } catch (error) {
      Logger.error(`Error in stats command: ${error}`);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle('❌ Error')
        .setDescription('An error occurred while retrieving bot statistics.')
        .setTimestamp();
        
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  },
  
  category: 'utility',
  cooldown: 5, // 5 seconds cooldown
} as Command; 