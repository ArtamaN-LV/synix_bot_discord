import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';

// Map to store AFK users and their reasons
// In a production bot, this would be stored in a database
const afkUsers = new Map<string, { reason: string, timestamp: number }>();

export = {
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Set yourself as AFK (Away From Keyboard)')
    .addStringOption(option => 
      option
        .setName('reason')
        .setDescription('The reason why you are AFK (optional)')
        .setRequired(false)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const reason = interaction.options.getString('reason') || 'AFK';
    const timestamp = Date.now();
    
    try {
      // Check if user is already AFK
      if (afkUsers.has(userId)) {
        // Remove AFK status
        afkUsers.delete(userId);
        
        return interaction.reply({
          embeds: [
            EmbedBuilderService.success(`Welcome back! Your AFK status has been removed.`)
          ],
          ephemeral: true
        });
      }
      
      // Set user as AFK
      afkUsers.set(userId, { reason, timestamp });
      
      // Try to update nickname to indicate AFK status
      if (interaction.guild && interaction.member) {
        try {
          // Get the GuildMember from interaction.member
          const member = interaction.guild.members.cache.get(userId);
          
          if (member && !member.user.bot && member.manageable) {
            const currentNick = member.nickname || member.user.username;
            
            // Only change nickname if it doesn't already have [AFK] prefix
            if (!currentNick.startsWith('[AFK] ')) {
              await member.setNickname(`[AFK] ${currentNick.slice(0, 26)}`);
            }
          }
        } catch (error) {
          console.error('Error updating nickname:', error);
          // Continue even if nickname update fails
        }
      }
      
      // Create success embed
      const afkEmbed = EmbedBuilderService.createEmbed()
        .setColor(COLORS.INFO)
        .setTitle('🔕 AFK Status Set')
        .setDescription(`You are now marked as AFK: **${reason}**`)
        .setFooter({ text: 'Other users will be notified when they mention you' })
        .setTimestamp();
      
      return interaction.reply({
        embeds: [afkEmbed],
        // Use ephemeral to not clutter the chat
        ephemeral: true
      });
    } catch (error) {
      console.error('Error setting AFK status:', error);
      return interaction.reply({ 
        embeds: [EmbedBuilderService.error('An error occurred while setting your AFK status. Please try again later.')],
        ephemeral: true
      });
    }
  },
  
  // Expose afkUsers map to be used by a messageCreate event handler
  afkUsers,
  
  category: 'misc',
  cooldown: 5, // 5 seconds cooldown
} as Command & { afkUsers: typeof afkUsers }; 