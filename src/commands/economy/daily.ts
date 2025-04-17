import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { EconomyService } from '../../services/EconomyService';
import { COLORS } from '../../utils/constants';

export = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily reward'),
  
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    
    try {
      const userId = interaction.user.id;
      const result = await EconomyService.claimDaily(userId);
      
      if (!result.success) {
        return interaction.editReply({
          embeds: [EmbedBuilderService.error(result.message || 'Failed to claim daily reward')]
        });
      }
      
      // Create success embed
      const dailyEmbed = EmbedBuilderService.createEmbed()
        .setColor(COLORS.SUCCESS)
        .setTitle('Daily Reward Claimed! 🎉')
        .setDescription(`You received **$${result.amount?.toLocaleString()}** as your daily reward!`)
        .addFields(
          { name: '🔥 Streak', value: `${result.streak} day(s)`, inline: true },
          { 
            name: '💡 Tip', 
            value: 'Claim your daily reward every day to build up your streak and earn bonus rewards!',
            inline: false 
          }
        )
        .setFooter({ text: 'Come back tomorrow for another reward' });
      
      return interaction.editReply({ embeds: [dailyEmbed] });
    } catch (error) {
      console.error('Error claiming daily reward:', error);
      return interaction.editReply({ 
        embeds: [EmbedBuilderService.error('An error occurred while claiming your daily reward. Please try again later.')]
      });
    }
  },
  
  category: 'economy',
  cooldown: 5, // 5 seconds cooldown
} as Command; 