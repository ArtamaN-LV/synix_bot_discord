import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';
import User from '../../models/User';

export = {
  data: new SlashCommandBuilder()
    .setName('toplevel')
    .setDescription('View the users with the highest levels')
    .addIntegerOption(option => 
      option
        .setName('limit')
        .setDescription('How many users to show (default: 10)')
        .setMinValue(1)
        .setMaxValue(25)
        .setRequired(false)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    
    try {
      const limit = interaction.options.getInteger('limit') || 10;
      
      if (!interaction.guild) {
        return interaction.editReply({
          embeds: [EmbedBuilderService.error('This command can only be used in a server.')]
        });
      }
      
      // Find top users by level and then by XP
      const topUsers = await User.find({})
        .sort({ level: -1, xp: -1 })
        .limit(limit);
      
      if (topUsers.length === 0) {
        return interaction.editReply({
          embeds: [EmbedBuilderService.info('No users have gained any levels yet.')]
        });
      }
      
      // Fetch discord usernames for the top users
      let leaderboardText = '';
      let rank = 1;
      
      for (const userData of topUsers) {
        try {
          // Try to get member from guild
          const member = await interaction.guild.members.fetch(userData.userId).catch(() => null);
          const username = member ? member.user.username : 'Unknown User';
          
          // Format level and XP info
          const level = userData.level;
          const xp = userData.xp;
          const xpNeeded = level * 100;
          const percent = Math.floor((xp / xpNeeded) * 100);
          
          // Medal emojis for top 3
          let medal = '';
          if (rank === 1) medal = '🥇 ';
          else if (rank === 2) medal = '🥈 ';
          else if (rank === 3) medal = '🥉 ';
          else medal = `#${rank} `;
          
          leaderboardText += `${medal}**${username}** - Level ${level} (${xp}/${xpNeeded} XP, ${percent}%)\n`;
          rank++;
        } catch (err) {
          console.error(`Error fetching user ${userData.userId}:`, err);
        }
      }
      
      // Create leaderboard embed
      const leaderboardEmbed = EmbedBuilderService.createEmbed()
        .setColor(COLORS.INFO)
        .setTitle('🏆 Level Leaderboard')
        .setDescription(leaderboardText || 'No data available')
        .setFooter({ text: `Top ${limit} highest-level users` })
        .setTimestamp();
      
      // Try to find the requesting user's position if not in top
      const requestingUserId = interaction.user.id;
      const userInTop = topUsers.some(u => u.userId === requestingUserId);
      
      if (!userInTop) {
        // Find the user's rank
        const userDoc = await User.findOne({ userId: requestingUserId });
        
        if (userDoc) {
          const userRank = await User.countDocuments({
            $or: [
              { level: { $gt: userDoc.level } },
              { 
                level: { $eq: userDoc.level },
                xp: { $gt: userDoc.xp }
              },
              {
                level: { $eq: userDoc.level },
                xp: { $eq: userDoc.xp },
                userId: { $lt: requestingUserId }
              }
            ]
          }) + 1;
          
          leaderboardEmbed.addFields({
            name: 'Your Position',
            value: `You are ranked #${userRank} at Level ${userDoc.level} with ${userDoc.xp} XP`
          });
        }
      }
      
      return interaction.editReply({ embeds: [leaderboardEmbed] });
    } catch (error) {
      console.error('Error getting level leaderboard:', error);
      return interaction.editReply({ 
        embeds: [EmbedBuilderService.error('An error occurred while fetching the leaderboard. Please try again later.')]
      });
    }
  },
  
  category: 'leveling',
  cooldown: 10, // 10 seconds cooldown
} as Command; 