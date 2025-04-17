import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  Colors
} from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { LevelingService } from '../../services/LevelingService';

export = {
  data: new SlashCommandBuilder()
    .setName('levelup')
    .setDescription('Check your level-up progress and requirements')
    .addIntegerOption(option =>
      option
        .setName('level')
        .setDescription('Check requirements for a specific level')
        .setMinValue(2)
        .setMaxValue(100)
        .setRequired(false)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      // Get the requested level (if provided)
      const targetLevel = interaction.options.getInteger('level');
      
      if (targetLevel) {
        // Show info for the specified level
        const currentXP = LevelingService.xpForLevel(targetLevel - 1);
        const nextXP = LevelingService.xpForLevel(targetLevel);
        const xpNeeded = nextXP - currentXP;
        
        const embed = new EmbedBuilder()
          .setColor(Colors.Blue)
          .setTitle(`📊 Level ${targetLevel} Information`)
          .setDescription(`Here's information about reaching Level ${targetLevel}:`)
          .addFields(
            { name: 'Total XP Required', value: `${nextXP} XP`, inline: true },
            { name: 'XP from Previous Level', value: `${xpNeeded} XP`, inline: true }
          );
        
        // Check if there's a role reward for this level
        if (interaction.guild) {
          const levelRoles = LevelingService.getLevelRoles(interaction.guild.id);
          const roleForLevel = levelRoles.find(lr => lr.level === targetLevel);
          
          if (roleForLevel) {
            try {
              const role = await interaction.guild.roles.fetch(roleForLevel.roleId);
              if (role) {
                embed.addFields({ 
                  name: 'Role Reward', 
                  value: `<@&${role.id}> (${role.name})`,
                  inline: false
                });
              }
            } catch (error) {
              console.error('Error fetching role for levelup command:', error);
            }
          }
        }
        
        return interaction.reply({ embeds: [embed] });
      } else {
        // Show info for the user's current level
        const userData = await LevelingService.getUser(interaction.user.id);
        const currentLevel = userData.level;
        const currentXP = userData.xp;
        const nextLevelXP = LevelingService.xpForLevel(currentLevel + 1);
        
        const xpForCurrentLevel = LevelingService.xpForLevel(currentLevel);
        const xpProgress = currentXP - xpForCurrentLevel;
        const xpNeeded = nextLevelXP - xpForCurrentLevel;
        const progressPercentage = Math.round((xpProgress / xpNeeded) * 100);
        
        // Create progress bar
        const progressBarLength = 20;
        const filledBlocks = Math.round((progressPercentage / 100) * progressBarLength);
        const emptyBlocks = progressBarLength - filledBlocks;
        
        const progressBar = `[${'█'.repeat(filledBlocks)}${' '.repeat(emptyBlocks)}] ${progressPercentage}%`;
        
        const embed = new EmbedBuilder()
          .setColor(Colors.Gold)
          .setTitle(`🎮 ${interaction.user.username}'s Level Progress`)
          .setThumbnail(interaction.user.displayAvatarURL())
          .addFields(
            { name: 'Current Level', value: `${currentLevel}`, inline: true },
            { name: 'Total XP', value: `${currentXP}`, inline: true },
            { name: 'Rank', value: `#${await LevelingService.getUserRank(interaction.user.id)}`, inline: true },
            { name: `Progress to Level ${currentLevel + 1}`, value: progressBar, inline: false },
            { name: 'XP Progress', value: `${xpProgress}/${xpNeeded} XP needed`, inline: true }
          )
          .setFooter({ 
            text: `You can earn XP by chatting in the server.`
          });
        
        // Show upcoming role rewards if in a guild
        if (interaction.guild) {
          const levelRoles = LevelingService.getLevelRoles(interaction.guild.id);
          const upcomingRoles = levelRoles
            .filter(lr => lr.level > currentLevel)
            .sort((a, b) => a.level - b.level)
            .slice(0, 3);
          
          if (upcomingRoles.length > 0) {
            const upcomingRolesList = await Promise.all(upcomingRoles.map(async ({ level, roleId }) => {
              try {
                const role = await interaction.guild?.roles.fetch(roleId);
                return role ? `**Level ${level}**: <@&${roleId}> (${role.name})` : `**Level ${level}**: Role reward`;
              } catch (error) {
                return `**Level ${level}**: Role reward`;
              }
            }));
            
            embed.addFields({ 
              name: 'Upcoming Role Rewards', 
              value: upcomingRolesList.join('\n'),
              inline: false
            });
          }
        }
        
        return interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Error in levelup command:', error);
      return interaction.reply({
        embeds: [EmbedBuilderService.error('An error occurred while fetching level-up information.')],
        ephemeral: true
      });
    }
  },
  
  category: 'leveling',
  cooldown: 5,
} as Command; 