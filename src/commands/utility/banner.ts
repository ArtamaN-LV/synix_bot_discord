import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  User, 
  RESTGetAPIUserResult
} from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';

export const data = new SlashCommandBuilder()
  .setName('banner')
  .setDescription('Display a user\'s banner')
  .addUserOption(option => 
    option
      .setName('user')
      .setDescription('The user whose banner to display')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('size')
      .setDescription('The size of the banner')
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
      .setDescription('The format of the banner')
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
    await interaction.deferReply();
    
    // Get the targeted user or default to the command user
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const sizeString = interaction.options.getString('size') || '1024';
    const format = interaction.options.getString('format') || 'png';
    
    // Convert size string to number and ensure it's a valid size
    const sizeNumber = parseInt(sizeString);
    // Ensure size is one of the valid Discord banner sizes
    const validSizes = [16, 32, 64, 128, 256, 512, 1024, 2048, 4096] as const;
    const size = validSizes.includes(sizeNumber as any) ? sizeNumber as typeof validSizes[number] : 1024;
    
    // We need to fetch the user to get their banner data
    const fetchedUser = await interaction.client.users.fetch(targetUser.id, { force: true });
    
    // Check if the user has a banner
    if (!fetchedUser.banner) {
      const noBannerEmbed = EmbedBuilderService.warning(`${targetUser.username} doesn't have a banner set.`);
      return await interaction.editReply({ embeds: [noBannerEmbed] });
    }

    // Note: For gif format, we need to check if the banner is animated
    const isAnimated = fetchedUser.banner.startsWith('a_');
    // If gif is requested but banner isn't animated, fallback to png
    const actualFormat = format === 'gif' && !isAnimated ? 'png' : format;
    
    // Generate the banner URL
    const bannerURL = fetchedUser.bannerURL({
      size: size,
      extension: actualFormat as 'png' | 'jpg' | 'jpeg' | 'webp' | 'gif'
    });
    
    if (!bannerURL) {
      const errorEmbed = EmbedBuilderService.warning(`Could not generate a banner URL for ${targetUser.username}.`);
      return await interaction.editReply({ embeds: [errorEmbed] });
    }
    
    // Create an embed to display the banner
    const embed = EmbedBuilderService.createEmbed()
      .setTitle(`${targetUser.username}'s Banner`)
      .setDescription(`[Download Link](${bannerURL})`)
      .setImage(bannerURL)
      .setFooter({ text: `Requested by ${interaction.user.username}` });
    
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in banner command:', error);
    
    const errorEmbed = EmbedBuilderService.error('An error occurred while fetching the banner.');
    
    if (interaction.deferred) {
      await interaction.editReply({ embeds: [errorEmbed] });
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
} 