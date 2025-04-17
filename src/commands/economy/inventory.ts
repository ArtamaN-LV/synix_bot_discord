import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { EconomyService } from '../../services/EconomyService';
import { COLORS } from '../../utils/constants';

export = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('View your inventory or another user\'s inventory')
    .addUserOption(option => 
      option
        .setName('user')
        .setDescription('The user to check inventory for')
        .setRequired(false)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    
    try {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      
      // Get user data from database
      const user = await EconomyService.getUser(targetUser.id);
      
      // Check if inventory is empty
      if (user.inventory.length === 0) {
        return interaction.editReply({
          embeds: [
            EmbedBuilderService.createEmbed()
              .setColor(COLORS.INFO)
              .setTitle(`${targetUser.id === interaction.user.id ? 'Your' : `${targetUser.username}'s`} Inventory`)
              .setDescription(`${targetUser.id === interaction.user.id ? 'You don\'t' : `${targetUser.username} doesn't`} have any items yet!`)
              .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
              .addFields(
                { 
                  name: '💡 Tip', 
                  value: 'Use the `/shop` command to see what items you can buy!',
                  inline: false 
                }
              )
          ]
        });
      }
      
      // Sort inventory by price (highest first)
      const sortedInventory = [...user.inventory].sort((a, b) => b.price - a.price);
      
      // Create inventory embed
      const inventoryEmbed = EmbedBuilderService.createEmbed()
        .setColor(COLORS.INFO)
        .setTitle(`${targetUser.id === interaction.user.id ? 'Your' : `${targetUser.username}'s`} Inventory`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
        .setDescription(`Showing all items (${user.inventory.length} total)`);
      
      // Format inventory items
      let itemList = '';
      let totalValue = 0;
      
      for (const item of sortedInventory) {
        itemList += `**${item.name}** x${item.quantity} - $${item.price.toLocaleString()} each\n`;
        totalValue += item.price * item.quantity;
      }
      
      // Add fields to embed
      inventoryEmbed.addFields(
        { name: '📦 Items', value: itemList, inline: false },
        { name: '💰 Total Value', value: `$${totalValue.toLocaleString()}`, inline: true }
      );
      
      return interaction.editReply({ embeds: [inventoryEmbed] });
    } catch (error) {
      console.error('Error getting inventory:', error);
      return interaction.editReply({ 
        embeds: [EmbedBuilderService.error('An error occurred while fetching the inventory. Please try again later.')]
      });
    }
  },
  
  category: 'economy',
  cooldown: 5, // 5 seconds cooldown
} as Command; 