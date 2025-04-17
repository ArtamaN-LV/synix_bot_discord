import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';

// Import type extensions
import '../../types/discord';

export = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin and test your luck'),
  
  async execute(interaction: ChatInputCommandInteraction) {
    // Flip the coin (50/50 chance)
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    
    // Create an emoji based on the result
    const emoji = result === 'Heads' ? '🪙' : '💿';
    
    // Create the embed
    const flipEmbed = EmbedBuilderService.createEmbed()
      .setColor(COLORS.INFO)
      .setTitle(`${emoji} Coin Flip`)
      .setDescription(`The coin landed on: **${result}**!`)
      .setTimestamp();
    
    await interaction.reply({ embeds: [flipEmbed] });
  },
  
  category: 'fun',
  cooldown: 3, // 3 seconds cooldown
} as Command; 