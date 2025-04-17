import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';
import fetch from 'node-fetch';

// Import type extensions
import '../../types/discord';

// Define joke categories
const categories = [
  { name: 'Any', value: 'Any' },
  { name: 'Programming', value: 'Programming' },
  { name: 'Misc', value: 'Misc' },
  { name: 'Dark', value: 'Dark' },
  { name: 'Pun', value: 'Pun' },
  { name: 'Spooky', value: 'Spooky' },
  { name: 'Christmas', value: 'Christmas' }
];

// Emoji for joke categories
const categoryEmojis = {
  Any: '🎲',
  Programming: '💻',
  Misc: '🤪',
  Dark: '🌑',
  Pun: '😆',
  Spooky: '👻',
  Christmas: '🎄'
};

interface JokeResponse {
  error?: boolean;
  category?: string;
  type?: string;
  joke?: string;
  setup?: string;
  delivery?: string;
  safe?: boolean;
}

export = {
  data: new SlashCommandBuilder()
    .setName('joke')
    .setDescription('Get a random joke to brighten your day')
    .addStringOption(option => 
      option
        .setName('category')
        .setDescription('Joke category')
        .setRequired(false)
        .addChoices(...categories)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    
    try {
      // Get category or default to Any
      const category = interaction.options.getString('category') || 'Any';
      const emoji = categoryEmojis[category as keyof typeof categoryEmojis];
      
      // Fetch a random joke from JokeAPI
      const response = await fetch(`https://v2.jokeapi.dev/joke/${category}?blacklistFlags=nsfw,religious,political,racist,sexist,explicit&type=single,twopart`);
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json() as JokeResponse;
      
      // Create the embed
      const jokeEmbed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle(`${emoji} ${category} Joke`)
        .setDescription('Here\'s a joke to brighten your day!')
        .setTimestamp();
      
      // Handle both single and two-part jokes
      if (data.joke) {
        // Single-part joke
        jokeEmbed.addFields(
          { 
            name: '😂 Joke', 
            value: data.joke,
            inline: false 
          }
        );
      } else if (data.setup && data.delivery) {
        // Two-part joke
        jokeEmbed.addFields(
          { 
            name: '🤔 Setup', 
            value: data.setup,
            inline: false 
          },
          { 
            name: '😂 Punchline', 
            value: data.delivery,
            inline: false 
          }
        );
      } else {
        throw new Error('Received invalid joke format from API');
      }
      
      // Add joke info
      jokeEmbed.addFields(
        { 
          name: '📊 Joke Info', 
          value: `
          **Category:** ${data.category || category}
          **Type:** ${data.type || 'Single'}
          **Safe:** ${data.safe ? '✅ Yes' : '❌ No'}`,
          inline: false 
        }
      );
      
      await interaction.editReply({ embeds: [jokeEmbed] });
    } catch (error) {
      console.error('Error fetching joke:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle('❌ Error')
        .setDescription('Failed to fetch a joke. Please try again later.')
        .setTimestamp();
      
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
  
  category: 'fun',
  cooldown: 5, // 5 seconds cooldown
} as Command; 