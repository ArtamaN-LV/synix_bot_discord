import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';

export = {
  data: new SlashCommandBuilder()
    .setName('qr')
    .setDescription('Generate a QR code from text or URL')
    .addStringOption(option => 
      option
        .setName('content')
        .setDescription('The text or URL to encode in the QR code')
        .setRequired(true)
    )
    .addStringOption(option => 
      option
        .setName('size')
        .setDescription('The size of the QR code')
        .setRequired(false)
        .addChoices(
          { name: 'Small (150x150)', value: '150' },
          { name: 'Medium (300x300)', value: '300' },
          { name: 'Large (500x500)', value: '500' }
        )
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    
    try {
      const content = interaction.options.getString('content', true);
      const size = interaction.options.getString('size') || '300';
      
      // Validate content length (QR code has limits)
      if (content.length > 1000) {
        return interaction.editReply({
          embeds: [EmbedBuilderService.error('Content is too long. Please limit to 1000 characters.')]
        });
      }
      
      // Use Google Charts API to generate QR code
      const qrCodeUrl = `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodeURIComponent(content)}&choe=UTF-8`;
      
      // Create QR code embed
      const qrEmbed = EmbedBuilderService.createEmbed()
        .setColor(COLORS.INFO)
        .setTitle('📱 QR Code Generated')
        .setDescription('Scan this QR code with your device')
        .setImage(qrCodeUrl)
        .setFooter({ text: `Encoded content length: ${content.length} characters` })
        .setTimestamp();
      
      return interaction.editReply({ embeds: [qrEmbed] });
    } catch (error) {
      console.error('Error generating QR code:', error);
      return interaction.editReply({ 
        embeds: [EmbedBuilderService.error('An error occurred while generating the QR code. Please try again later.')]
      });
    }
  },
  
  category: 'misc',
  cooldown: 5, // 5 seconds cooldown
} as Command; 