import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { EconomyService } from '../../services/EconomyService';
import { COLORS } from '../../utils/constants';

export = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Browse items available for purchase'),
  
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    
    try {
      // Get all items from the shop
      const items = await EconomyService.getShopItems();
      
      if (items.length === 0) {
        return interaction.editReply({
          embeds: [
            EmbedBuilderService.info('The shop is currently empty. Check back later!')
          ]
        });
      }
      
      // Group items by category
      const itemsByCategory = items.reduce((acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
      }, {} as Record<string, typeof items>);
      
      // Create shop embed
      const shopEmbed = EmbedBuilderService.createEmbed()
        .setColor(COLORS.INFO)
        .setTitle('🛒 Item Shop')
        .setDescription('Browse items available for purchase. Use `/buy <item>` to purchase an item.')
        .setFooter({ text: 'Prices are subject to change' });
      
      // Add each category as a field
      for (const [category, categoryItems] of Object.entries(itemsByCategory)) {
        let fieldValue = '';
        
        for (const item of categoryItems) {
          const stockInfo = item.isLimited 
            ? (item.stock && item.stock > 0) 
              ? `(${item.stock} left)` 
              : '(Out of stock)' 
            : '';
            
          fieldValue += `${item.emoji} **${item.name}** - $${item.price.toLocaleString()} ${stockInfo}\n`;
          fieldValue += `*${item.description}*\n\n`;
        }
        
        shopEmbed.addFields({
          name: `📋 ${category}`,
          value: fieldValue.trim() || 'No items available',
          inline: false
        });
      }
      
      return interaction.editReply({ embeds: [shopEmbed] });
    } catch (error) {
      console.error('Error getting shop items:', error);
      return interaction.editReply({ 
        embeds: [EmbedBuilderService.error('An error occurred while fetching the shop. Please try again later.')]
      });
    }
  },
  
  category: 'economy',
  cooldown: 5, // 5 seconds cooldown
} as Command; 