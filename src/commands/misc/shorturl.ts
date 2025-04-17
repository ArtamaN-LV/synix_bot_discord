import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';
import fetch from 'node-fetch';

export = {
  data: new SlashCommandBuilder()
    .setName('shorturl')
    .setDescription('Shorten a long URL')
    .addStringOption(option => 
      option
        .setName('url')
        .setDescription('The URL to shorten')
        .setRequired(true)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    
    try {
      const longUrl = interaction.options.getString('url', true);
      
      // Validate URL
      try {
        new URL(longUrl);
      } catch (error) {
        return interaction.editReply({
          embeds: [EmbedBuilderService.error('Please provide a valid URL including the protocol (http:// or https://)')]
        });
      }
      
      // Use TinyURL API for shortening (free, no API key required)
      const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
      
      if (!response.ok) {
        throw new Error(`URL shortening service responded with status ${response.status}`);
      }
      
      const shortUrl = await response.text();
      
      // Create success embed
      const urlEmbed = EmbedBuilderService.createEmbed()
        .setColor(COLORS.SUCCESS)
        .setTitle('🔗 URL Shortened')
        .addFields(
          { name: 'Original URL', value: longUrl.length > 200 ? longUrl.substring(0, 200) + '...' : longUrl },
          { name: 'Shortened URL', value: shortUrl }
        )
        .setFooter({ text: 'Powered by TinyURL' })
        .setTimestamp();
      
      return interaction.editReply({ embeds: [urlEmbed] });
    } catch (error) {
      console.error('Error shortening URL:', error);
      return interaction.editReply({ 
        embeds: [EmbedBuilderService.error('An error occurred while shortening the URL. Please try again later.')]
      });
    }
  },
  
  category: 'misc',
  cooldown: 5, // 5 seconds cooldown
} as Command; 