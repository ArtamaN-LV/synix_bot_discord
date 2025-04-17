import { SlashCommandBuilder, ChatInputCommandInteraction, User, EmbedBuilder } from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { EconomyService } from '../../services/EconomyService';
import { COLORS } from '../../utils/constants';
import UserModel from '../../models/User';

// Import type extensions
import '../../types/discord';

export = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Show your level and XP')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to show rank for (defaults to yourself)')
        .setRequired(false)),
  
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    
    // Get the target user (either mentioned or command user)
    const targetUser = interaction.options.getUser('user') || interaction.user;
    
    try {
      // Get or create user data
      let userData = await UserModel.findOne({ userId: targetUser.id });
      
      if (!userData) {
        userData = new UserModel({
          userId: targetUser.id,
          xp: 0,
          level: 1
        });
        await userData.save();
      }
      
      // Calculate XP needed for next level (simple formula: level * 100)
      const nextLevelXP = userData.level * 100;
      const currentXP = userData.xp;
      const progress = Math.floor((currentXP / nextLevelXP) * 100);
      
      // Create progress bar (10 segments)
      const progressBar = createProgressBar(progress);
      
      // Create and send embed
      const rankEmbed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle(`📊 ${targetUser.username}'s Level Profile`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
        .setDescription(`Here's your current level and progress information:`)
        .addFields(
          { 
            name: '🏆 Level', 
            value: `**${userData.level}**`, 
            inline: true 
          },
          { 
            name: '✨ XP', 
            value: `**${currentXP}** / **${nextLevelXP}**`, 
            inline: true 
          },
          { 
            name: '📈 Progress', 
            value: `${progressBar} **${progress}%**`, 
            inline: false 
          }
        );
      
      // Add jobs info if user has a job
      if (userData.job) {
        const job = await EconomyService.getJob(userData.job);
        if (job) {
          rankEmbed.addFields({
            name: '💼 Current Job',
            value: `**${job.name}**\n${job.description || 'No description available'}`,
            inline: true
          });
        }
      }
      
      // Add next rewards
      rankEmbed.addFields({
        name: '🎁 Next Level Rewards',
        value: '• Access to better jobs\n• Higher earning potential\n• Exclusive roles\n• Special perks',
        inline: false
      });
      
      // Add footer with user tag
      rankEmbed.setFooter({ 
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL()
      });
      
      await interaction.editReply({ embeds: [rankEmbed] });
    } catch (error) {
      console.error('Error retrieving rank:', error);
      await interaction.editReply({ 
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setTitle('❌ Error')
            .setDescription('There was an error processing your request!')
            .setFooter({ text: 'Please try again later.' })
        ]
      });
    }
  },
  
  category: 'leveling',
  cooldown: 5,
} as Command;

/**
 * Creates a visual progress bar
 * @param percent Percentage filled (0-100)
 * @returns String representing a progress bar
 */
function createProgressBar(percent: number): string {
  const filledSegments = Math.floor(percent / 10);
  const emptySegments = 10 - filledSegments;
  
  const filled = '█'.repeat(filledSegments);
  const empty = '░'.repeat(emptySegments);
  
  return `[${filled}${empty}]`;
} 