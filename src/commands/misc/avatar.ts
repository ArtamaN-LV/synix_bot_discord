import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  User, 
  EmbedBuilder 
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';
import { EmbedBuilderService } from '../../utils/embedBuilder';

export = {
  data: new SlashCommandBuilder()
    .setName('useravatar')
    .setDescription('View your avatar or another user\'s avatar')
    .addUserOption(option => 
      option
        .setName('user')
        .setDescription('The user whose avatar you want to see (leave empty for your own)')
        .setRequired(false)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    // Get the target user (or self if not specified)
    const targetUser = interaction.options.getUser('user') || interaction.user;
    
    // Get avatar URL in different sizes
    const avatarUrl = targetUser.displayAvatarURL({ size: 4096 });
    
    // Create the avatar embed
    const avatarEmbed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle(`${targetUser.username}'s Avatar`)
      .setImage(avatarUrl)
      .setDescription(`[Avatar URL](${avatarUrl})`)
      .setFooter({ 
        text: `Requested by ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL() 
      })
      .setTimestamp();
    
    // Send the embed
    await interaction.reply({ embeds: [avatarEmbed] });
  }
} as Command; 