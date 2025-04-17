import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { EconomyService } from '../../services/EconomyService';
import { COLORS } from '../../utils/constants';

export = {
  data: new SlashCommandBuilder()
    .setName('sell')
    .setDescription('Sell an item from your inventory')
    .addStringOption(option => 
      option
        .setName('item')
        .setDescription('The item ID or name to sell')
        .setRequired(true)
    )
    .addIntegerOption(option => 
      option
        .setName('quantity')
        .setDescription('How many to sell (default: 1)')
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
      
      // Get user's data
      const user = await EconomyService.getUser(userId);
      
      if (user.inventory.length === 0) {
        return interaction.editReply({
          embeds: [EmbedBuilderService.error('You don\'t have any items to sell.')]
        });
      }
      
      // Find the item in user's inventory
      const inventoryItem = user.inventory.find(item => 
        item.itemId.toLowerCase() === itemQuery.toLowerCase() ||
        item.name.toLowerCase() === itemQuery.toLowerCase()
      );
      
      if (!inventoryItem) {
        return interaction.editReply({
          embeds: [EmbedBuilderService.error(`Item "${itemQuery}" not found in your inventory. Use \`/inventory\` to see your items.`)]
        });
      }
      
      // Check if user has enough quantity
      if (inventoryItem.quantity < quantity) {
        return interaction.editReply({
          embeds: [
            EmbedBuilderService.error(`You only have ${inventoryItem.quantity}x ${inventoryItem.name} in your inventory.`)
          ]
        });
      }
      
      // Get the item details from shop to determine sell price
      const shopItem = await EconomyService.getItem(inventoryItem.itemId);
      
      if (!shopItem) {
        return interaction.editReply({
          embeds: [
            EmbedBuilderService.error('This item no longer exists in the shop and cannot be sold.')
          ]
        });
      }
      
      // Perform the sell operation
      const result = await EconomyService.sellItem(userId, inventoryItem.itemId, quantity);
      
      if (!result.success) {
        return interaction.editReply({
          embeds: [
            EmbedBuilderService.error(result.message || 'Failed to sell the item.')
          ]
        });
      }
      
      // Create success embed
      const sellEmbed = EmbedBuilderService.createEmbed()
        .setColor(COLORS.SUCCESS)
        .setTitle('Item Sold!')
        .setDescription(`You sold ${quantity > 1 ? `${quantity}x ` : ''}**${result.itemName}** for $${result.amount?.toLocaleString()}!`)
        .setThumbnail(interaction.user.displayAvatarURL({ size: 128 }))
        .addFields(
          { name: '💰 Wallet Balance', value: `$${result.user?.wallet.toLocaleString() || 'Unknown'}`, inline: true },
          { 
            name: '💡 Info', 
            value: 'Items are sold for less than their purchase price. Purchase prices reflect retail value, while sell prices reflect wholesale value.',
            inline: false 
          }
        );
      
      return interaction.editReply({ embeds: [sellEmbed] });
    } catch (error) {
      console.error('Error selling item:', error);
      return interaction.editReply({ 
        embeds: [EmbedBuilderService.error('An error occurred while processing your sale. Please try again later.')]
      });
    }
  },
  
  category: 'economy',
  cooldown: 5, // 5 seconds cooldown
} as Command; 