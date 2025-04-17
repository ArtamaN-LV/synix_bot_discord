import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';

export const data = new SlashCommandBuilder()
  .setName('servericon')
  .setDescription('Display the server\'s icon')
  .addStringOption(option =>
    option
      .setName('size')
      .setDescription('The size of the icon')
      .setRequired(false)
      .addChoices(
        { name: '128px', value: '128' },
        { name: '256px', value: '256' },
        { name: '512px', value: '512' },
        { name: '1024px', value: '1024' },
        { name: '2048px', value: '2048' }
      )
  )
  .addStringOption(option =>
    option
      .setName('format')
      .setDescription('The format of the icon')
      .setRequired(false)
      .addChoices(
        { name: 'png', value: 'png' },
        { name: 'jpg', value: 'jpg' },
        { name: 'webp', value: 'webp' },
        { name: 'gif', value: 'gif' }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    // Check if the command is used in a guild
    if (!interaction.guild) {
      const guildOnlyEmbed = EmbedBuilderService.warning('This command can only be used in a server.');
      return await interaction.reply({ embeds: [guildOnlyEmbed], ephemeral: true });
    }

    const sizeString = interaction.options.getString('size') || '1024';
    const format = interaction.options.getString('format') || 'png';
    
    // Convert size string to number and ensure it's a valid size
    const sizeNumber = parseInt(sizeString);
    // Ensure size is one of the valid Discord icon sizes
    const validSizes = [16, 32, 64, 128, 256, 512, 1024, 2048, 4096] as const;
    const size = validSizes.includes(sizeNumber as any) ? sizeNumber as typeof validSizes[number] : 1024;
    
    // Check if the server has an icon
    if (!interaction.guild.icon) {
      const noIconEmbed = EmbedBuilderService.warning(`${interaction.guild.name} doesn't have an icon set.`);
      return await interaction.reply({ embeds: [noIconEmbed] });
    }

    // Note: For gif format, we need to check if the icon is animated
    const isAnimated = interaction.guild.icon.startsWith('a_');
    // If gif is requested but icon isn't animated, fallback to png
    const actualFormat = format === 'gif' && !isAnimated ? 'png' : format;
    
    // Generate the icon URL
    const iconURL = interaction.guild.iconURL({
      size: size,
      extension: actualFormat as 'png' | 'jpg' | 'jpeg' | 'webp' | 'gif'
    });
    
    if (!iconURL) {
      const errorEmbed = EmbedBuilderService.warning(`Could not generate an icon URL for ${interaction.guild.name}.`);
      return await interaction.reply({ embeds: [errorEmbed] });
    }
    
    // Create an embed to display the icon
    const embed = EmbedBuilderService.createEmbed()
      .setTitle(`${interaction.guild.name}'s Icon`)
      .setDescription(`[Download Link](${iconURL})`)
      .setImage(iconURL)
      .setFooter({ text: `Requested by ${interaction.user.username}` });
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in servericon command:', error);
    
    const errorEmbed = EmbedBuilderService.error('An error occurred while fetching the server icon.');
    
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
  }
} 