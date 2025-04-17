import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { EconomyService } from '../../services/EconomyService';
import { COLORS } from '../../utils/constants';

export = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Purchase an item from the shop')
    .addStringOption(option => 
      option
        .setName('item')
        .setDescription('The item ID or name to purchase')
        .setRequired(true)
    )
    .addIntegerOption(option => 
      option
        .setName('quantity')
        .setDescription('How many to buy (default: 1)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(false)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    
    try {
      const userId = interaction.user.id;
      const itemQuery = interaction.options.getString('item', true);
      const quantity = interaction.options.getInteger('quantity') || 1;
      
      // Get all items and find the one matching the query
      const allItems = await EconomyService.getShopItems();
      
      if (allItems.length === 0) {
        return interaction.editReply({
          embeds: [EmbedBuilderService.error('No items are available in the shop.')]
        });
      }
      
      // First try to match by itemId, then by name
      const targetItem = allItems.find(item => 
        item.itemId.toLowerCase() === itemQuery.toLowerCase() ||
        item.name.toLowerCase() === itemQuery.toLowerCase()
      );
      
      if (!targetItem) {
        return interaction.editReply({
          embeds: [EmbedBuilderService.error(`Item "${itemQuery}" not found in the shop. Use \`/shop\` to see available items.`)]
        });
      }
      
      // Get user's data
      const user = await EconomyService.getUser(userId);
      
      // Check if user has enough money
      const totalCost = targetItem.price * quantity;
      if (user.wallet < totalCost) {
        const missingAmount = totalCost - user.wallet;
        return interaction.editReply({
          embeds: [
            EmbedBuilderService.error(`You don't have enough money to buy ${quantity > 1 ? `${quantity}x ` : ''}${targetItem.name}. You need $${missingAmount.toLocaleString()} more.`)
          ]
        });
      }
      
      // Check if buying multiple of a limited item
      if (targetItem.isLimited && targetItem.stock !== undefined) {
        if (targetItem.stock < quantity) {
          return interaction.editReply({
            embeds: [
              EmbedBuilderService.error(`There ${targetItem.stock === 1 ? 'is' : 'are'} only ${targetItem.stock} ${targetItem.name} left in stock.`)
            ]
          });
        }
      }
      
      // Process the purchase (one by one to ensure proper inventory updates)
      let successfulPurchases = 0;
      let result;
      
      for (let i = 0; i < quantity; i++) {
        result = await EconomyService.buyItem(userId, targetItem.itemId);
        
        if (result.success) {
          successfulPurchases++;
        } else {
          // Stop if an error occurs (like running out of stock)
          break;
        }
      }
      
      if (successfulPurchases === 0) {
        return interaction.editReply({
          embeds: [
            EmbedBuilderService.error(result?.message || 'Failed to purchase the item.')
          ]
        });
      }
      
      // Create success embed
      const purchaseEmbed = EmbedBuilderService.createEmbed()
        .setColor(COLORS.SUCCESS)
        .setTitle('Purchase Successful!')
        .setDescription(`You bought ${successfulPurchases > 1 ? `${successfulPurchases}x ` : ''}${targetItem.emoji} **${targetItem.name}** for $${(targetItem.price * successfulPurchases).toLocaleString()}!`)
        .setThumbnail(interaction.user.displayAvatarURL({ size: 128 }))
        .addFields(
          { name: '💰 Wallet Balance', value: `$${result?.user?.wallet.toLocaleString() || 'Unknown'}`, inline: true }
        );
      
      if (successfulPurchases < quantity) {
        purchaseEmbed.addFields({
          name: '⚠️ Note',
          value: `Only ${successfulPurchases} out of ${quantity} could be purchased. Reason: ${result?.message || 'Unknown error'}`
        });
      }
      
      return interaction.editReply({ embeds: [purchaseEmbed] });
    } catch (error) {
      console.error('Error purchasing item:', error);
      return interaction.editReply({ 
        embeds: [EmbedBuilderService.error('An error occurred while processing your purchase. Please try again later.')]
      });
    }
  },
  
  category: 'economy',
  cooldown: 5, // 5 seconds cooldown
} as Command; 