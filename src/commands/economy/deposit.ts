import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { EconomyService } from '../../services/EconomyService';
import { COLORS } from '../../utils/constants';

export = {
  data: new SlashCommandBuilder()
    .setName('deposit')
    .setDescription('Deposit money from your wallet into your bank')
    .addIntegerOption(option => 
      option
        .setName('amount')
        .setDescription('Amount to deposit (or "all" for everything)')
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
      
      // Check if trying to deposit more than they have
      if (amount > user.wallet) {
        return interaction.editReply({
          embeds: [
            EmbedBuilderService.error(`You don't have that much money in your wallet. You only have $${user.wallet.toLocaleString()}.`)
          ]
        });
      }
      
      // Perform the deposit
      const result = await EconomyService.deposit(userId, amount);
      
      if (!result) {
        return interaction.editReply({
          embeds: [
            EmbedBuilderService.error('Failed to deposit money. You may not have enough in your wallet.')
          ]
        });
      }
      
      // Create success embed
      const depositEmbed = EmbedBuilderService.createEmbed()
        .setColor(COLORS.SUCCESS)
        .setTitle('Deposit Successful')
        .setDescription(`You deposited $${amount.toLocaleString()} into your bank account.`)
        .setThumbnail(interaction.user.displayAvatarURL({ size: 128 }))
        .addFields(
          { name: '💰 Wallet', value: `$${result.wallet.toLocaleString()}`, inline: true },
          { name: '🏦 Bank', value: `$${result.bank.toLocaleString()}`, inline: true },
          { 
            name: '💡 Tip', 
            value: 'Money in your bank is safe from robberies and cannot be stolen.',
            inline: false 
          }
        );
      
      return interaction.editReply({ embeds: [depositEmbed] });
    } catch (error) {
      console.error('Error depositing money:', error);
      return interaction.editReply({ 
        embeds: [EmbedBuilderService.error('An error occurred while processing your deposit. Please try again later.')]
      });
    }
  },
  
  category: 'economy',
  cooldown: 5, // 5 seconds cooldown
} as Command; 