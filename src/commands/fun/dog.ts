import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { COLORS, BotInfo } from '../../utils/constants';
import fetch from 'node-fetch';

// Dog breeds for the option
const dogBreeds = [
  { name: 'Random', value: 'random' },
  { name: 'Beagle', value: 'beagle' },
  { name: 'Boxer', value: 'boxer' },
  { name: 'Bulldog', value: 'bulldog' },
  { name: 'Dalmatian', value: 'dalmatian' },
  { name: 'German Shepherd', value: 'germanshepherd' },
  { name: 'Golden Retriever', value: 'goldenretriever' },
  { name: 'Husky', value: 'husky' },
  { name: 'Labrador', value: 'labrador' },
  { name: 'Poodle', value: 'poodle' },
  { name: 'Pug', value: 'pug' }
];

export = {
  data: new SlashCommandBuilder()
    .setName('dog')
    .setDescription('Get a random dog image')
    .addStringOption(option => 
      option
        .setName('breed')
        .setDescription('Dog breed (optional)')
        .setRequired(false)
        .addChoices(...dogBreeds)
    )
    .addBooleanOption(option => 
      option
        .setName('fact')
        .setDescription('Include a random dog fact?')
        .setRequired(false)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply();
      
      // Get options
      const breed = interaction.options.getString('breed') || 'random';
      const includeFact = interaction.options.getBoolean('fact') ?? false;
      
      // API URLs
      let imageUrl = 'https://dog.ceo/api/breeds/image/random';
      
      // If a specific breed was selected
      if (breed !== 'random') {
        imageUrl = `https://dog.ceo/api/breed/${breed}/images/random`;
      }
      
      // Fetch dog image
      const imageResponse = await fetch(imageUrl);
      
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch dog image: ${imageResponse.status} ${imageResponse.statusText}`);
      }
      
      const imageData = await imageResponse.json() as { message: string, status: string };
      
      if (!imageData || imageData.status !== 'success') {
        throw new Error('Failed to get a dog image');
      }
      
      const dogImage = imageData.message;
      
      // Extract breed name from URL for the title
      let breedName = 'Dog';
      if (breed !== 'random') {
        // Capitalize breed name
        breedName = breed.charAt(0).toUpperCase() + breed.slice(1);
      } else if (dogImage) {
        // Try to extract breed from the image URL
        // URL format: https://images.dog.ceo/breeds/[breed]/image.jpg
        const breedMatch = dogImage.match(/breeds\/([^/]+)/);
        if (breedMatch && breedMatch[1]) {
          breedName = breedMatch[1].charAt(0).toUpperCase() + breedMatch[1].slice(1);
        }
      }
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle(`🐶 Random ${breedName}`)
        .setImage(dogImage)
        .setFooter({ text: BotInfo.FOOTER })
        .setTimestamp();
      
      // If facts are requested, fetch a dog fact
      if (includeFact) {
        try {
          const factResponse = await fetch('https://some-random-api.com/facts/dog');
          
          if (factResponse.ok) {
            const factData = await factResponse.json() as { fact: string };
            
            if (factData && factData.fact) {
              embed.setDescription(`**Dog Fact**: ${factData.fact}`);
            }
          }
        } catch (factError) {
          console.error('Error fetching dog fact:', factError instanceof Error ? factError.message : String(factError));
          // If the fact fetch fails, we still show the image
        }
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in dog command:', error instanceof Error ? error.message : String(error));
      
      // Send error message
      if (interaction.deferred) {
        await interaction.editReply({
          content: 'Failed to fetch a dog image. Please try again later!'
        });
      } else {
        await interaction.reply({
          content: 'Failed to fetch a dog image. Please try again later!',
          ephemeral: true
        });
      }
    }
  }
} as Command; 