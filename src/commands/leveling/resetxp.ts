import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';
import { LevelingService } from '../../services/LevelingService';

// Import type extensions
import '../../types/discord';

export = {
  data: new SlashCommandBuilder()
    .setName('resetxp')
    .setDescription("Reset a user's XP and level")
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to reset XP for')
        .setRequired(true))
    .addBooleanOption(option => 
      option.setName('confirm')
        .setDescription('Confirm that you want to reset their XP (this action cannot be undone)')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false),
  
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    
    const targetUser = interaction.options.getUser('user', true);
    const confirmation = interaction.options.getBoolean('confirm', true);
    
    if (!confirmation) {
      return interaction.editReply({
        embeds: [EmbedBuilderService.info('XP reset cancelled. No changes were made.')]
      });
    }
    
    try {
      // Get the user's current data
      const oldUserData = await LevelingService.getUser(targetUser.id);
      const oldLevel = oldUserData.level;
      const oldXP = oldUserData.xp;
      
      // Reset the user's XP and level
      const userData = await LevelingService.resetXP(targetUser.id);
      
      // Create success embed
      const embed = EmbedBuilderService.createEmbed()
        .setColor(COLORS.SUCCESS)
        .setTitle('🧹 XP Reset')
        .setDescription(`${targetUser.username}'s XP and level have been reset.`)
        .addFields(
          { name: 'Previous Level', value: oldLevel.toString(), inline: true },
          { name: 'Previous XP', value: oldXP.toString(), inline: true },
          { name: 'New Level', value: userData.level.toString(), inline: true },
          { name: 'New XP', value: userData.xp.toString(), inline: true }
        );
      
      await interaction.editReply({ embeds: [embed] });
      
      // Try to send a DM to the user
      try {
        const dmEmbed = EmbedBuilderService.createEmbed()
          .setColor(COLORS.WARNING)
          .setTitle('Your XP Has Been Reset')
          .setDescription(`Your XP and level in **${interaction.guild?.name}** have been reset by a moderator.`)
          .addFields(
            { name: 'Previous Level', value: oldLevel.toString(), inline: true },
            { name: 'Previous XP', value: oldXP.toString(), inline: true }
          );
        
        await targetUser.send({ embeds: [dmEmbed] });
      } catch (error) {
        // User might have DMs closed, ignore
      }
    } catch (error) {
      console.error('Error resetting XP:', error);
      await interaction.editReply({
        embeds: [EmbedBuilderService.error('An error occurred while resetting the XP.')]
      });
    }
  },
  
  category: 'leveling',
  cooldown: 10,
} as Command; 