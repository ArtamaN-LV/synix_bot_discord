import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { COLORS, BotInfo } from '../../utils/constants';
import fetch from 'node-fetch';

// Available fonts for ASCII art
const fonts = [
  { name: 'Standard', value: 'standard' },
  { name: 'Shadow', value: 'shadow' },
  { name: 'Thinkertoy', value: 'thinkertoy' },
  { name: 'Block', value: 'block' },
  { name: 'Banner', value: 'banner' },
  { name: 'Slant', value: 'slant' },
  { name: 'Small', value: 'small' },
  { name: 'Big', value: 'big' }
];

export = {
  data: new SlashCommandBuilder()
    .setName('ascii')
    .setDescription('Convert text to ASCII art')
    .addStringOption(option => 
      option
        .setName('text')
        .setDescription('Text to convert (max 20 chars)')
        .setRequired(true)
    )
    .addStringOption(option => 
      option
        .setName('font')
        .setDescription('Font style')
        .setRequired(false)
        .addChoices(...fonts)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply();
      
      // Get options
      const text = interaction.options.getString('text', true);
      const font = interaction.options.getString('font') || 'standard';
      
      // Validate input
      if (text.length > 20) {
        return interaction.editReply({
          content: 'Text must be 20 characters or less for ASCII conversion.'
        });
      }
      
      try {
        // Encode the text for URL
        const encodedText = encodeURIComponent(text);
        const response = await fetch(`https://artii.herokuapp.com/make?text=${encodedText}&font=${font}`);
        
        if (!response.ok) {
          // First API didn't work, try the fallback API
          await fetchFallbackAscii(interaction, text, font);
          return;
        }
        
        const asciiArt = await response.text();
        
        // Check if we got valid ASCII art
        if (!asciiArt || asciiArt.trim().length === 0) {
          await fetchFallbackAscii(interaction, text, font);
          return;
        }
        
        // Send the ASCII art
        await sendAsciiArt(interaction, asciiArt, text, font);
        
      } catch (error) {
        console.error('Error fetching ASCII art:', error instanceof Error ? error.message : String(error));
        
        // Try fallback method
        await fetchFallbackAscii(interaction, text, font);
      }
      
    } catch (error) {
      console.error('Error in ASCII command:', error instanceof Error ? error.message : String(error));
      
      await interaction.editReply({
        content: 'There was an error generating ASCII art. Please try again later.'
      });
    }
  }
} as Command;

// Fallback ASCII generation using different API
async function fetchFallbackAscii(
  interaction: ChatInputCommandInteraction, 
  text: string, 
  font: string
): Promise<void> {
  try {
    // Encode the text for URL
    const encodedText = encodeURIComponent(text);
    
    // Map our font names to figlet font names (approximation)
    const figletFont = font === 'standard' ? 'standard' : 
                       font === 'shadow' ? 'shadow' :
                       font === 'slant' ? 'slant' :
                       font === 'small' ? 'small' : 
                       font === 'big' ? 'big' : 'standard';
    
    const response = await fetch(`https://asciified.thelicato.io/api/v2/ascii?text=${encodedText}&font=${figletFont}`);
    
    if (!response.ok) {
      // If both APIs fail, use simpler method
      await generateSimpleAscii(interaction, text);
      return;
    }
    
    const data = await response.json() as { ascii: string };
    
    if (!data || !data.ascii) {
      await generateSimpleAscii(interaction, text);
      return;
    }
    
    // Send the ASCII art
    await sendAsciiArt(interaction, data.ascii, text, font);
    
  } catch (error) {
    console.error('Error in fallback ASCII generation:', error instanceof Error ? error.message : String(error));
    
    // If all else fails, use super simple method
    await generateSimpleAscii(interaction, text);
  }
}

// Super simple ASCII generation for when both APIs fail
async function generateSimpleAscii(
  interaction: ChatInputCommandInteraction, 
  text: string
): Promise<void> {
  // Very basic ASCII conversion
  const simpleAscii = [
    '  _   _   _   _   _   _   _   _  ',
    ` / \\ / \\ / \\ / \\ / \\ / \\ / \\ / \\ `,
    '( ' + text.split('').join(' | ') + ' )',
    ' \\_/ \\_/ \\_/ \\_/ \\_/ \\_/ \\_/ \\_/ '
  ].join('\n');
  
  await sendAsciiArt(interaction, simpleAscii, text, 'simple');
}

// Helper function to send ASCII art with embed
async function sendAsciiArt(
  interaction: ChatInputCommandInteraction, 
  asciiArt: string, 
  originalText: string, 
  font: string
): Promise<void> {
  // Create embed
  const embed = new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle('🖼️ ASCII Art')
    .setDescription(`\`\`\`\n${asciiArt}\n\`\`\``)
    .addFields(
      { name: 'Original Text', value: originalText, inline: true },
      { name: 'Font', value: font.charAt(0).toUpperCase() + font.slice(1), inline: true }
    )
    .setFooter({ text: BotInfo.FOOTER })
    .setTimestamp();
  
  await interaction.editReply({ embeds: [embed] });
} 