import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  Colors,
  GuildMember
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { LevelingService } from '../../services/LevelingService';

export = {
  data: new SlashCommandBuilder()
    .setName('levelinfo')
    .setDescription('Show information about the leveling system'),
  
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      // Calculate some example levels for display
      const exampleLevels = [5, 10, 25, 50, 100];
      const levelXPs = exampleLevels.map(level => ({
        level,
        xp: LevelingService.xpForLevel(level)
      }));
      
      // Format level requirements
      const levelRequirements = levelXPs
        .map(({ level, xp }) => `**Level ${level}**: ${xp} XP`)
        .join('\n');
      
      // Get server-specific settings if in a guild
      let serverInfo = '';
      if (interaction.guild) {
        const settings = LevelingService.getServerSettings(interaction.guild.id);
        
        // Format announcement settings
        let announcementMode = '';
        switch (settings.announceMode) {
          case 'current':
            announcementMode = 'Level-up messages are sent in the channel where XP is earned';
            break;
          case 'dm':
            announcementMode = 'Level-up messages are sent via DM';
            break;
          case 'channel':
            announcementMode = settings.announceChannel 
              ? `Level-up messages are sent in <#${settings.announceChannel}>`
              : 'Level-up messages are sent in a specific channel';
            break;
          case 'disabled':
            announcementMode = 'Level-up messages are disabled';
            break;
          default:
            announcementMode = 'Current channel';
        }
        
        // Count number of level roles
        const levelRoleCount = settings.levelRoles.length;
        
        serverInfo = `
**Server Settings**
• Leveling System: ${settings.enabled ? 'Enabled' : 'Disabled'}
• XP Rate Multiplier: ${settings.xpMultiplier}x
• Announcement Mode: ${announcementMode}
• Level Roles: ${levelRoleCount} configured
${levelRoleCount > 0 ? '  (Use `/levelrole list` to see them)' : ''}`;
      }
      
      // Create an embed with the leveling system information
      const embed = new EmbedBuilder()
        .setColor(Colors.Blue)
        .setTitle('📊 Leveling System Information')
        .setDescription(
          'The leveling system rewards active members for participating in the server. ' +
          'You earn XP from sending messages and using voice channels.\n\n' +
          '**How to earn XP**\n' +
          '• Send messages (with a 1-minute cooldown)\n' +
          '• Be active in voice channels\n' +
          '• Participate in server events\n\n' +
          '**Level Formula**\n' +
          'Level = √(XP ÷ 10) + 1'
        )
        .addFields(
          { 
            name: 'Example Level Requirements', 
            value: levelRequirements,
            inline: false
          }
        );
      
      // Add server-specific info if available
      if (serverInfo) {
        embed.addFields({ name: 'Server Configuration', value: serverInfo, inline: false });
      }
      
      // Add user's current level if in a guild
      if (interaction.guild && interaction.member) {
        const member = interaction.member as GuildMember;
        const userData = await LevelingService.getUser(member.id);
        const userRank = await LevelingService.getUserRank(member.id);
        
        embed.addFields({
          name: 'Your Stats',
          value: `**Level:** ${userData.level}\n**XP:** ${userData.xp}\n**Rank:** #${userRank}`,
          inline: true
        });
        
        const nextLevel = userData.level + 1;
        const currentLevelXP = LevelingService.xpForLevel(userData.level);
        const nextLevelXP = LevelingService.xpForLevel(nextLevel);
        const xpNeeded = nextLevelXP - userData.xp;
        
        embed.addFields({
          name: 'Next Level',
          value: `**Level ${nextLevel}**\n**XP Needed:** ${xpNeeded} more\n**Total Required:** ${nextLevelXP}`,
          inline: true
        });
        
        // Add user as author
        embed.setAuthor({
          name: member.displayName,
          iconURL: member.displayAvatarURL()
        });
      }
      
      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in levelinfo command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(Colors.Red)
        .setTitle('❌ Error')
        .setDescription('An error occurred while fetching level information.');
      
      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
  
  category: 'leveling',
  cooldown: 5,
} as Command; 