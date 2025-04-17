import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { EconomyService } from '../../services/EconomyService';
import { COLORS } from '../../utils/constants';

export = {
  data: new SlashCommandBuilder()
    .setName('job')
    .setDescription('Apply for a job')
    .addStringOption(option => 
      option
        .setName('job_id')
        .setDescription('The ID of the job to apply for')
        .setRequired(true)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    
    try {
      const userId = interaction.user.id;
      const jobId = interaction.options.getString('job_id', true);
      
      // Apply for the job
      const result = await EconomyService.applyForJob(userId, jobId);
      
      if (!result.success) {
        return interaction.editReply({
          embeds: [
            EmbedBuilderService.error(result.message || 'Failed to apply for the job.')
          ]
        });
      }
      
      const job = result.job!; // Safe assertion since result.success is true
      
      // Create success embed
      const jobEmbed = EmbedBuilderService.createEmbed()
        .setColor(COLORS.SUCCESS)
        .setTitle('🎉 Job Application Successful!')
        .setDescription(`You are now employed as a **${job.name}**!`)
        .addFields(
          { name: '📝 Job Description', value: job.description, inline: false },
          { name: '💰 Salary Range', value: `$${job.salary.min.toLocaleString()} to $${job.salary.max.toLocaleString()} per shift`, inline: true },
          { name: '⏱️ Cooldown', value: `${job.cooldown} minutes`, inline: true },
          { name: '📊 XP Reward', value: `${job.xpReward} XP per shift`, inline: true },
          { 
            name: '💡 Tip', 
            value: `Use the \`/work\` command to start earning money. Remember that there's a ${job.failRate}% chance of failure.`,
            inline: false 
          }
        );
      
      return interaction.editReply({ embeds: [jobEmbed] });
    } catch (error) {
      console.error('Error applying for job:', error);
      return interaction.editReply({ 
        embeds: [EmbedBuilderService.error('An error occurred while applying for the job. Please try again later.')]
      });
    }
  },
  
  category: 'economy',
  cooldown: 5, // 5 seconds cooldown
} as Command; 