import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';
import User from '../../models/User';

// Import type extensions
import '../../types/discord';

// We'll need to extend the User model to track XP boosts
// This is a temporary solution until we update the model
// In a real implementation, add xpBoost and xpBoostExpiry to the User model

export = {
  data: new SlashCommandBuilder()
    .setName('xpboost')
    .setDescription('Apply an XP boost multiplier to a user')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to apply the XP boost to')
        .setRequired(true))
    .addNumberOption(option => 
      option.setName('multiplier')
        .setDescription('The multiplier to apply (1.5 = 50% more XP, max 3)')
        .setMinValue(1.1)
        .setMaxValue(3.0)
        .setRequired(true))
    .addIntegerOption(option => 
      option.setName('duration')
        .setDescription('Duration in hours (max 168 = 1 week)')
        .setMinValue(1)
        .setMaxValue(168)
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false),
  
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    
    try {
      const targetUser = interaction.options.getUser('user', true);
      const multiplier = interaction.options.getNumber('multiplier', true);
      const duration = interaction.options.getInteger('duration', true);
      
      // Round the multiplier to 1 decimal place
      const roundedMultiplier = Math.round(multiplier * 10) / 10;
      
      // Calculate expiry time
      const expiryTime = new Date();
      expiryTime.setHours(expiryTime.getHours() + duration);
      
      // Find or create user in database
      let user = await User.findOne({ userId: targetUser.id });
      
      if (!user) {
        user = new User({ userId: targetUser.id });
      }
      
      // Store the boost data in a "custom" field (would be better to add to model properly)
      // This is a hack for demonstration purposes
      // In production, update the User model to include xpBoost and xpBoostExpiry fields
      user.set('xpBoost', roundedMultiplier);
      user.set('xpBoostExpiry', expiryTime);
      
      await user.save();
      
      // Create success embed
      const embed = EmbedBuilderService.createEmbed()
        .setColor(COLORS.SUCCESS)
        .setTitle('🚀 XP Boost Applied')
        .setDescription(`An XP boost has been applied to ${targetUser.username}!`)
        .addFields(
          { name: 'Multiplier', value: `${roundedMultiplier}x`, inline: true },
          { name: 'Duration', value: `${duration} hour${duration === 1 ? '' : 's'}`, inline: true },
          { name: 'Expires', value: `<t:${Math.floor(expiryTime.getTime() / 1000)}:R>`, inline: true }
        );
      
      await interaction.editReply({ embeds: [embed] });
      
      // Send a DM to the user
      try {
        const dmEmbed = EmbedBuilderService.createEmbed()
          .setColor(COLORS.SUCCESS)
          .setTitle('🚀 You Got an XP Boost!')
          .setDescription(`You've received an XP boost in **${interaction.guild?.name}**!`)
          .addFields(
            { name: 'Multiplier', value: `${roundedMultiplier}x`, inline: true },
            { name: 'Duration', value: `${duration} hour${duration === 1 ? '' : 's'}`, inline: true },
            { name: 'Expires', value: `<t:${Math.floor(expiryTime.getTime() / 1000)}:R>`, inline: true }
          );
        
        await targetUser.send({ embeds: [dmEmbed] });
      } catch (error) {
        // User might have DMs closed, ignore
      }
    } catch (error) {
      console.error('Error applying XP boost:', error);
      await interaction.editReply({
        embeds: [EmbedBuilderService.error('An error occurred while applying the XP boost.')]
      });
    }
  },
  
  category: 'leveling',
  cooldown: 5,
} as Command; 