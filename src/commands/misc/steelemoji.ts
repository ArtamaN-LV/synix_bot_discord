import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';

export = {
  data: new SlashCommandBuilder()
    .setName('steelemoji')
    .setDescription('Steal (copy) an emoji and add it to your server')
    .addStringOption(option => 
      option
        .setName('emoji')
        .setDescription('The emoji to steal (custom emoji only)')
        .setRequired(true)
    )
    .addStringOption(option => 
      option
        .setName('name')
        .setDescription('Optional name for the emoji (defaults to original name)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEmojisAndStickers),
  
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    
    try {
      // Get emoji input from user
      const emojiInput = interaction.options.getString('emoji', true);
      const customName = interaction.options.getString('name');
      
      // Extract emoji ID and name using regex
      // Matches both animated and static custom emoji formats:
      // <:name:id> or <a:name:id>
      const emojiRegex = /<(?:a)?:([a-zA-Z0-9_]+):(\d+)>/;
      const emojiMatch = emojiInput.match(emojiRegex);
      
      if (!emojiMatch) {
        return interaction.editReply({
          embeds: [EmbedBuilderService.error('That doesn\'t appear to be a valid custom emoji. Make sure you\'re using a custom emoji, not a standard one.')]
        });
      }
      
      // Extract emoji details
      const emojiName = customName || emojiMatch[1];
      const emojiId = emojiMatch[2];
      const isAnimated = emojiInput.startsWith('<a:');
      
      // Build emoji URL
      const emojiURL = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}`;
      
      // Check if user/bot has permission to add emojis
      const guild = interaction.guild;
      if (!guild) {
        return interaction.editReply({
          embeds: [EmbedBuilderService.error('This command can only be used in a server.')]
        });
      }
      
      // Verify the bot has permissions to manage emojis
      if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
        return interaction.editReply({
          embeds: [EmbedBuilderService.error('I don\'t have permission to manage emojis in this server.')]
        });
      }
      
      // Create the emoji in the server
      try {
        const newEmoji = await guild.emojis.create({
          attachment: emojiURL,
          name: emojiName
        });
        
        // Create success embed
        const successEmbed = EmbedBuilderService.createEmbed()
          .setColor(COLORS.SUCCESS)
          .setTitle('✅ Emoji Added Successfully')
          .setDescription(`Emoji ${newEmoji} has been added to the server as \`:${newEmoji.name}:\``)
          .setThumbnail(emojiURL)
          .setFooter({ text: `Added by ${interaction.user.username}` })
          .setTimestamp();
        
        return interaction.editReply({ embeds: [successEmbed] });
      } catch (error: any) {
        console.error('Error creating emoji:', error);
        
        // Handle specific error cases
        let errorMessage = 'Failed to add the emoji. Please try again later.';
        
        if (error.code === 30008) {
          errorMessage = 'This server has reached the maximum number of emojis.';
        } else if (error.code === 50035) {
          errorMessage = 'The emoji name is invalid or too long (must be 2-32 characters).';
        } else if (error.message.includes('Maximum size')) {
          errorMessage = 'The emoji file is too large (must be under 256KB).';
        }
        
        return interaction.editReply({
          embeds: [EmbedBuilderService.error(errorMessage)]
        });
      }
    } catch (error) {
      console.error('Error in steelemoji command:', error);
      return interaction.editReply({ 
        embeds: [EmbedBuilderService.error('An unexpected error occurred while processing the emoji.')]
      });
    }
  },
  
  category: 'misc',
  cooldown: 10 // 10 seconds cooldown
} as Command; 