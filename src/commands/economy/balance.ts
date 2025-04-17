import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../interfaces/command';
import { EconomyService } from '../../services/EconomyService';
import { COLORS } from '../../utils/constants';

export = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your balance or another user\'s balance')
    .addUserOption(option => 
      option
        .setName('user')
        .setDescription('The user to check balance for')
        .setRequired(false)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    
    try {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      
      // Get user balance from database
      const user = await EconomyService.getUser(targetUser.id);
      
      const { wallet, bank } = user;
      const total = wallet + bank;
      
      // Create balance embed
      const balanceEmbed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle(`💰 ${targetUser.id === interaction.user.id ? 'Your' : `${targetUser.username}'s`} Balance`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
        .setDescription('Here\'s a breakdown of your financial status:')
        .addFields(
          { 
            name: '💵 Wallet', 
            value: `**$${wallet.toLocaleString()}**\n*Spendable money*`, 
            inline: true 
          },
          { 
            name: '🏦 Bank', 
            value: `**$${bank.toLocaleString()}**\n*Safe from theft*`, 
            inline: true 
          },
          { 
            name: '💎 Net Worth', 
            value: `**$${total.toLocaleString()}**\n*Total assets*`, 
            inline: true 
          }
        )
        .setFooter({ 
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();
      
      return interaction.editReply({ embeds: [balanceEmbed] });
    } catch (error) {
      console.error('Error fetching balance:', error);
      return interaction.editReply({ 
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setTitle('❌ Error')
            .setDescription('An error occurred while fetching the balance.')
            .setFooter({ text: 'Please try again later.' })
        ]
      });
    }
  },
  
  category: 'economy',
  cooldown: 5, // 5 seconds cooldown
} as Command; 