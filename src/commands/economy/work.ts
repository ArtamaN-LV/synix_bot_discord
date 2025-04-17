import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../interfaces/command';
import { EconomyService } from '../../services/EconomyService';
import { COLORS } from '../../utils/constants';

export = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Work to earn money'),
  
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    
    try {
      const result = await EconomyService.work(interaction.user.id);
      
      if (!result.success) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.ERROR)
              .setTitle('❌ Work Failed')
              .setDescription(result.message || 'Failed to work')
              .setFooter({ text: 'Try again later.' })
          ]
        });
      }
      
      // Check if work failed
      if (result.failed) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.WARNING)
              .setTitle('💼 Work Shift Failed')
              .setDescription('You showed up to work, but things didn\'t go as planned...')
              .addFields(
                { name: '💰 Earnings', value: '$0', inline: true },
                { 
                  name: '📝 Note', 
                  value: 'Better luck next time! Even the best workers have bad days.',
                  inline: false 
                }
              )
              .setFooter({ 
                text: `Next work available in 1 hour`,
                iconURL: interaction.user.displayAvatarURL()
              })
              .setTimestamp()
          ]
        });
      }
      
      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle('💼 Work Complete!')
        .setDescription(`You worked hard and earned **$${result.reward?.toLocaleString()}**!`)
        .addFields(
          { 
            name: '💰 New Balance', 
            value: `**$${result.reward?.toLocaleString()}**`,
            inline: true 
          },
          { 
            name: '💡 Tip', 
            value: 'You can apply for better jobs as you level up to earn more money!',
            inline: false 
          }
        )
        .setFooter({ 
          text: `Next work available in 1 hour`,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();
      
      return interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
      console.error('Error processing work command:', error);
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setTitle('❌ Error')
            .setDescription('An error occurred while processing your work.')
            .setFooter({ text: 'Please try again later.' })
        ]
      });
    }
  },
  
  category: 'economy',
  cooldown: 3600, // 1 hour
} as Command; 