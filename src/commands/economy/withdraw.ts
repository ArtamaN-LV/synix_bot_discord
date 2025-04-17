import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { EconomyService } from '../../services/EconomyService';
import { COLORS } from '../../utils/constants';

export = {
  data: new SlashCommandBuilder()
    .setName('withdraw')
    .setDescription('Withdraw money from your bank to your wallet')
    .addIntegerOption(option => 
      option
        .setName('amount')
        .setDescription('Amount to withdraw (or "all" for everything)')
        .setRequired(true)
        .setMinValue(1)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    
    try {
      const userId = interaction.user.id;
      let amount = interaction.options.getInteger('amount', true);
      
      // Get user's data
      const user = await EconomyService.getUser(userId);
      
      // Check if trying to withdraw more than they have
      if (amount > user.bank) {
        return interaction.editReply({
          embeds: [
            EmbedBuilderService.error(`You don't have that much money in your bank. You only have $${user.bank.toLocaleString()}.`)
          ]
        });
      }
      
      // Perform the withdrawal
      const result = await EconomyService.withdraw(userId, amount);
      
      if (!result) {
        return interaction.editReply({
          embeds: [
            EmbedBuilderService.error('Failed to withdraw money. You may not have enough in your bank.')
          ]
        });
      }
      
      // Create success embed
      const withdrawEmbed = EmbedBuilderService.createEmbed()
        .setColor(COLORS.SUCCESS)
        .setTitle('Withdrawal Successful')
        .setDescription(`You withdrew $${amount.toLocaleString()} from your bank account.`)
        .setThumbnail(interaction.user.displayAvatarURL({ size: 128 }))
        .addFields(
          { name: '💰 Wallet', value: `$${result.wallet.toLocaleString()}`, inline: true },
          { name: '🏦 Bank', value: `$${result.bank.toLocaleString()}`, inline: true },
          { 
            name: '⚠️ Warning', 
            value: 'Money in your wallet can be stolen! Only keep what you need for immediate purchases.',
            inline: false 
          }
        );
      
      return interaction.editReply({ embeds: [withdrawEmbed] });
    } catch (error) {
      console.error('Error withdrawing money:', error);
      return interaction.editReply({ 
        embeds: [EmbedBuilderService.error('An error occurred while processing your withdrawal. Please try again later.')]
      });
    }
  },
  
  category: 'economy',
  cooldown: 5, // 5 seconds cooldown
} as Command; 