import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { COLORS, BotInfo } from '../../utils/constants';
import fetch from 'node-fetch';

// Define fact categories
const categories = [
  { name: 'Random', value: 'random' },
  { name: 'Animals', value: 'animal' },
  { name: 'Science', value: 'science' },
  { name: 'History', value: 'history' },
  { name: 'Technology', value: 'technology' }
];

// API endpoints for different fact types
const factApis = {
  random: 'https://uselessfacts.jsph.pl/api/v2/facts/random?language=en',
  animal: 'https://some-random-api.com/facts/dog', // Will alternate between animals
  science: 'https://uselessfacts.jsph.pl/api/v2/facts/random?language=en', // We'll filter for science facts
  history: 'https://uselessfacts.jsph.pl/api/v2/facts/random?language=en', // We'll filter for history facts
  technology: 'https://uselessfacts.jsph.pl/api/v2/facts/random?language=en' // We'll filter for tech facts
};

// Emoji for fact categories
const categoryEmojis = {
  random: '🎲',
  animal: '🐾',
  science: '🔬',
  history: '📜',
  technology: '💻'
};

// Animal fact types (to alternate between)
const animalTypes = ['dog', 'cat', 'panda', 'fox', 'bird', 'koala'];

// Backup facts in case APIs are down
const backupFacts = [
  { category: 'random', text: 'A day on Venus is longer than a year on Venus.' },
  { category: 'animal', text: 'Octopuses have three hearts and blue blood.' },
  { category: 'science', text: 'Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old and still perfectly good to eat.' },
  { category: 'history', text: 'The shortest war in history was between Britain and Zanzibar on August 27, 1896. Zanzibar surrendered after 38 minutes.' },
  { category: 'technology', text: 'The first computer bug was an actual real-life bug. A moth was found in the Harvard Mark II computer in 1947.' }
];

export = {
  data: new SlashCommandBuilder()
    .setName('fact')
    .setDescription('Get a random interesting fact')
    .addStringOption(option => 
      option
        .setName('category')
        .setDescription('Fact category')
        .setRequired(false)
        .addChoices(...categories)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply();
      
      // Get category or default to random
      const category = interaction.options.getString('category') || 'random';
      
      // Get the emoji for this category
      const emoji = categoryEmojis[category as keyof typeof categoryEmojis];
      
      try {
        let factText = '';
        let factSource = '';
        
        // Handle animal facts specially (rotate through animal types)
        if (category === 'animal') {
          // Pick a random animal type
          const animalType = animalTypes[Math.floor(Math.random() * animalTypes.length)];
          const response = await fetch(`https://some-random-api.com/facts/${animalType}`);
          
          if (response.ok) {
            const data = await response.json() as { fact: string };
            factText = data.fact;
            factSource = `Random ${animalType.charAt(0).toUpperCase() + animalType.slice(1)} Fact`;
          }
        } else {
          // For other categories, use the uselessfacts API
          const response = await fetch(factApis[category as keyof typeof factApis]);
          
          if (response.ok) {
            const data = await response.json() as { text: string, source: string };
            factText = data.text;
            factSource = data.source || 'Random Fact';
          }
        }
        
        // If we failed to get a fact, use a backup
        if (!factText) {
          const backupFact = backupFacts.find(f => f.category === category) || backupFacts[0];
          factText = backupFact.text;
          factSource = 'Backup Fact';
        }
        
        // Create the fact embed
        const factEmbed = new EmbedBuilder()
          .setColor(COLORS.INFO)
          .setTitle(`${emoji} Random ${category.charAt(0).toUpperCase() + category.slice(1)} Fact`)
          .setDescription(factText)
          .setFooter({ text: `${BotInfo.FOOTER} • Source: ${factSource}` })
          .setTimestamp();
        
        await interaction.editReply({ embeds: [factEmbed] });
        
      } catch (error) {
        console.error('Error fetching fact:', error instanceof Error ? error.message : String(error));
        
        // Use a backup fact if API fails
        const backupFact = backupFacts.find(f => f.category === category) || backupFacts[0];
        
        const backupEmbed = new EmbedBuilder()
          .setColor(COLORS.INFO)
          .setTitle(`${emoji} Random ${category.charAt(0).toUpperCase() + category.slice(1)} Fact`)
          .setDescription(backupFact.text)
          .setFooter({ text: `${BotInfo.FOOTER} • Source: Backup Fact Database` })
          .setTimestamp();
        
        await interaction.editReply({ embeds: [backupEmbed] });
      }
      
    } catch (error) {
      console.error('Error in fact command:', error instanceof Error ? error.message : String(error));
      
      if (interaction.deferred) {
        await interaction.editReply({
          content: 'There was an error fetching a fact. Please try again later.'
        });
      } else {
        await interaction.reply({
          content: 'There was an error fetching a fact. Please try again later.',
          ephemeral: true
        });
      }
    }
  }
} as Command; 