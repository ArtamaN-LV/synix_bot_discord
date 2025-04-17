import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';

export const data = new SlashCommandBuilder()
  .setName('avatar')
  .setDescription('Display a user\'s avatar')
  .addUserOption(option => 
    option
      .setName('user')
      .setDescription('The user whose avatar to display')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('size')
      .setDescription('The size of the avatar')
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
      .setDescription('The format of the avatar')
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
    // Get the targeted user or default to the command user
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const sizeString = interaction.options.getString('size') || '1024';
    const format = interaction.options.getString('format') || 'png';
    
    // Convert size string to number and ensure it's a valid size
    const sizeNumber = parseInt(sizeString);
    // Ensure size is one of the valid Discord avatar sizes
    const validSizes = [16, 32, 64, 128, 256, 512, 1024, 2048, 4096] as const;
    const size = validSizes.includes(sizeNumber as any) ? sizeNumber as typeof validSizes[number] : 1024;
    
    // Generate the avatar URL with the specified size and format
    // Note: For gif format, we need to check if the avatar is animated
    const isAnimated = targetUser.avatar && targetUser.avatar.startsWith('a_');
    // If gif is requested but avatar isn't animated, fallback to png
    const actualFormat = format === 'gif' && !isAnimated ? 'png' : format;
    
    const avatarURL = targetUser.displayAvatarURL({
      size: size,
      extension: actualFormat as 'png' | 'jpg' | 'jpeg' | 'webp' | 'gif'
    });
    
    // Create a custom embed to display the avatar
    const embed = EmbedBuilderService.createEmbed()
      .setTitle(`${targetUser.username}'s Avatar`)
      .setDescription(`[Download Link](${avatarURL})`)
      .setImage(avatarURL)
      .setFooter({ text: `Requested by ${interaction.user.username}` });
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in avatar command:', error);
    
    const errorEmbed = EmbedBuilderService.error('An error occurred while fetching the avatar.');
    
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
  }
} 