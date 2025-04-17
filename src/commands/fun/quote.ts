import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { COLORS, BotInfo } from '../../utils/constants';
import fetch from 'node-fetch';

// Quote categories
const categories = [
  { name: 'Random', value: 'random' },
  { name: 'Inspirational', value: 'inspirational' },
  { name: 'Motivational', value: 'motivational' },
  { name: 'Life', value: 'life' },
  { name: 'Success', value: 'success' },
  { name: 'Wisdom', value: 'wisdom' },
  { name: 'Happiness', value: 'happiness' },
  { name: 'Love', value: 'love' },
  { name: 'Friendship', value: 'friendship' }
];

// Backup quotes in case the API is down
const backupQuotes = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Success is not final, failure is not fatal: It is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt" },
  { text: "In the end, it's not the years in your life that count. It's the life in your years.", author: "Abraham Lincoln" },
  { text: "The purpose of our lives is to be happy.", author: "Dalai Lama" }
];

export = {
  data: new SlashCommandBuilder()
    .setName('quote')
    .setDescription('Get an inspirational quote')
    .addStringOption(option => 
      option
        .setName('category')
        .setDescription('Quote category')
        .setRequired(false)
        .addChoices(...categories)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply();
      
      // Get category or default to random
      const category = interaction.options.getString('category') || 'random';
      
      try {
        let quoteData: { text: string, author: string };
        
        // Fetch quote from API
        const apiUrl = category === 'random' 
          ? 'https://api.quotable.io/random'
          : `https://api.quotable.io/random?tags=${category}`;
          
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch quote: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json() as { content: string, author: string };
        
        if (!data || !data.content) {
          throw new Error('Invalid quote data from API');
        }
        
        quoteData = {
          text: data.content,
          author: data.author
        };
        
        // Create quote embed
        const embed = new EmbedBuilder()
          .setColor(COLORS.INFO)
          .setTitle('📜 Inspirational Quote')
          .setDescription(`"${quoteData.text}"`)
          .setFooter({ text: `${BotInfo.FOOTER} • Author: ${quoteData.author}` })
          .setTimestamp();
        
        // Add a nice background image for aesthetics
        embed.setThumbnail('https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=200&auto=format&fit=crop');
        
        await interaction.editReply({ embeds: [embed] });
        
      } catch (error) {
        console.error('Error fetching quote:', error instanceof Error ? error.message : String(error));
        
        // Use a backup quote if API fails
        const randomBackupQuote = backupQuotes[Math.floor(Math.random() * backupQuotes.length)];
        
        const backupEmbed = new EmbedBuilder()
          .setColor(COLORS.INFO)
          .setTitle('📜 Inspirational Quote')
          .setDescription(`"${randomBackupQuote.text}"`)
          .setFooter({ text: `${BotInfo.FOOTER} • Author: ${randomBackupQuote.author}` })
          .setTimestamp();
        
        // Add a nice background image for aesthetics
        backupEmbed.setThumbnail('https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=200&auto=format&fit=crop');
        
        await interaction.editReply({ embeds: [backupEmbed] });
      }
      
    } catch (error) {
      console.error('Error in quote command:', error instanceof Error ? error.message : String(error));
      
      if (interaction.deferred) {
        await interaction.editReply({
          content: 'There was an error fetching a quote. Please try again later.'
        });
      } else {
        await interaction.reply({
          content: 'There was an error fetching a quote. Please try again later.',
          ephemeral: true
        });
      }
    }
  }
} as Command; 