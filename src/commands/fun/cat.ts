import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { COLORS, BotInfo } from '../../utils/constants';
import fetch from 'node-fetch';

// Interface for Cat API response
interface CatResponse {
  id: string;
  url: string;
  width: number;
  height: number;
}

export = {
  data: new SlashCommandBuilder()
    .setName('cat')
    .setDescription('Get a random cat image')
    .addBooleanOption(option => 
      option
        .setName('fact')
        .setDescription('Include a random cat fact?')
        .setRequired(false)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply();
      
      // Check if user wants a fact
      const includeFact = interaction.options.getBoolean('fact') ?? false;
      
      // Fetch cat image
      const imageResponse = await fetch('https://api.thecatapi.com/v1/images/search');
      
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch cat image: ${imageResponse.status} ${imageResponse.statusText}`);
      }
      
      const imageData = await imageResponse.json() as CatResponse[];
      
      if (!imageData || imageData.length === 0) {
        throw new Error('No cat images found');
      }
      
      const catImage = imageData[0].url;
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle('🐱 Random Cat')
        .setImage(catImage)
        .setFooter({ text: BotInfo.FOOTER })
        .setTimestamp();
      
      // If facts are requested, fetch a cat fact
      if (includeFact) {
        try {
          const factResponse = await fetch('https://catfact.ninja/fact');
          
          if (factResponse.ok) {
            const factData = await factResponse.json() as { fact: string, length: number };
            
            if (factData && factData.fact) {
              embed.setDescription(`**Cat Fact**: ${factData.fact}`);
            }
          }
        } catch (factError) {
          console.error('Error fetching cat fact:', factError instanceof Error ? factError.message : String(factError));
          // If the fact fetch fails, we still show the image
        }
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in cat command:', error instanceof Error ? error.message : String(error));
      
      // Send error message
      if (interaction.deferred) {
        await interaction.editReply({
          content: 'Failed to fetch a cat image. Please try again later!'
        });
      } else {
        await interaction.reply({
          content: 'Failed to fetch a cat image. Please try again later!',
          ephemeral: true
        });
      }
    }
  }
} as Command; 