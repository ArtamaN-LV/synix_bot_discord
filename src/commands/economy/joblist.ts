import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { EconomyService } from '../../services/EconomyService';
import { COLORS } from '../../utils/constants';

export = {
  data: new SlashCommandBuilder()
    .setName('joblist')
    .setDescription('Browse available jobs'),
  
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    
    try {
      // Get user data to show current level
      const userId = interaction.user.id;
      const userData = await EconomyService.getUser(userId);
      
      // Get all available jobs
      const jobs = await EconomyService.getJobs();
      
      if (jobs.length === 0) {
        return interaction.editReply({
          embeds: [
            EmbedBuilderService.info('There are currently no jobs available. Check back later!')
          ]
        });
      }
      
      // Create jobs embed
      const jobEmbed = EmbedBuilderService.createEmbed()
        .setColor(COLORS.INFO)
        .setTitle('💼 Available Jobs')
        .setDescription(`Browse available jobs. Use \`/job <job_id>\` to apply for a job.\nYour current level: **${userData.level}**`)
        .setFooter({ text: 'Higher level jobs offer better pay but have higher failure rates' });
      
      // Add each job as a field
      for (const job of jobs) {
        // Format the job details
        const levelRequirement = userData.level < job.requiredLevel 
          ? `🔒 **Requires Level ${job.requiredLevel}**`
          : `✅ **Available at your level**`;
        
        const fieldValue = [
          `${job.description}`,
          `💰 Pay: $${job.salary.min.toLocaleString()} to $${job.salary.max.toLocaleString()} per shift`,
          `⏱️ Cooldown: ${job.cooldown} min`,
          `⚠️ Failure Rate: ${job.failRate}%`,
          `📊 XP Reward: ${job.xpReward} XP`,
          levelRequirement
        ].join('\n');
        
        jobEmbed.addFields({
          name: `${job.name} (ID: ${job.jobId})`,
          value: fieldValue,
          inline: false
        });
      }
      
      // If user has a current job, add a field with that info
      if (userData.job) {
        const currentJob = await EconomyService.getJob(userData.job);
        
        if (currentJob) {
          jobEmbed.addFields({
            name: '🏢 Your Current Job',
            value: `You are currently working as a **${currentJob.name}**`,
            inline: false
          });
        }
      }
      
      return interaction.editReply({ embeds: [jobEmbed] });
    } catch (error) {
      console.error('Error getting jobs:', error);
      return interaction.editReply({ 
        embeds: [EmbedBuilderService.error('An error occurred while fetching the job list. Please try again later.')]
      });
    }
  },
  
  category: 'economy',
  cooldown: 5, // 5 seconds cooldown
} as Command; 