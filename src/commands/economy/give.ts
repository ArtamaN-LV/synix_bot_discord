import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction
} from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { EconomyService } from '../../services/EconomyService';

export = {
  data: new SlashCommandBuilder()
    .setName('give')
    .setDescription('Transfer money to another user')
    .addUserOption(option => 
      option
        .setName('user')
        .setDescription('The user to give money to')
        .setRequired(true)
    )
    .addIntegerOption(option => 
      option
        .setName('amount')
        .setDescription('The amount to give')
        .setMinValue(1)
        .setRequired(true)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      // Check if command is used in a guild
      if (!interaction.guild) {
        return interaction.reply({
          embeds: [EmbedBuilderService.error('This command can only be used in a server.')],
          ephemeral: true
        });
      }
      
      // Get the target user
      const targetUser = interaction.options.getUser('user', true);
      
      // Ensure user is not giving to themselves
      if (targetUser.id === interaction.user.id) {
        return interaction.reply({
          embeds: [EmbedBuilderService.warning('You cannot give money to yourself.')],
          ephemeral: true
        });
      }

      // Ensure target is not a bot
      if (targetUser.bot) {
        return interaction.reply({
          embeds: [EmbedBuilderService.warning('You cannot give money to a bot.')],
          ephemeral: true
        });
      }
      
      // Get the amount to give
      const amount = interaction.options.getInteger('amount', true);
      
      // Await the response while we process
      await interaction.deferReply();
      
      // Get user data
      const userData = await EconomyService.getUser(interaction.user.id);
      
      // Check if user has enough money
      if (userData.wallet < amount) {
        return interaction.editReply({
          embeds: [EmbedBuilderService.warning(`You don't have enough money. Your balance: ${userData.wallet} coins.`)]
        });
      }
      
      try {
        // Process the transaction atomically
        const [senderResult, recipientResult] = await Promise.all([
          EconomyService.removeMoney(interaction.user.id, amount),
          EconomyService.addMoney(targetUser.id, amount)
        ]);

        if (!senderResult) {
          throw new Error('Failed to remove money from sender');
        }

        // Get updated user data
        const [updatedSender, updatedRecipient] = await Promise.all([
          EconomyService.getUser(interaction.user.id),
          EconomyService.getUser(targetUser.id)
        ]);
        
        // Create success embed
        const successEmbed = EmbedBuilderService.success(
          `You gave ${amount} coins to ${targetUser.username}!`
        );
        
        // Add balance information
        successEmbed.addFields(
          { name: 'Your New Balance', value: `${updatedSender.wallet} coins`, inline: true },
          { name: `${targetUser.username}'s New Balance`, value: `${updatedRecipient.wallet} coins`, inline: true }
        );
        
        return interaction.editReply({ embeds: [successEmbed] });
      } catch (error) {
        // If any part of the transaction fails, we need to rollback
        console.error('Transaction error:', error);
        return interaction.editReply({
          embeds: [EmbedBuilderService.error('An error occurred during the transaction. The money transfer was not completed.')]
        });
      }
    } catch (error) {
      console.error('Error in give command:', error);
      
      const errorMessage = interaction.deferred
        ? interaction.editReply({ embeds: [EmbedBuilderService.error('An error occurred while processing the transaction.')] })
        : interaction.reply({ embeds: [EmbedBuilderService.error('An error occurred while processing the transaction.')], ephemeral: true });
      
      return errorMessage;
    }
  },
  
  category: 'economy',
  cooldown: 10
} as Command; 