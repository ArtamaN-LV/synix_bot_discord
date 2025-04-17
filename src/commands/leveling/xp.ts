import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  PermissionFlagsBits
} from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { LevelingService } from '../../services/LevelingService';

// Add admin-only XP management command
export = {
  data: new SlashCommandBuilder()
    .setName('xp')
    .setDescription('Add or remove XP from a user (Admin only)')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to modify XP for')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Amount of XP to add (positive) or remove (negative)')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      // Check if command is used in a guild
      if (!interaction.guild) {
        return interaction.reply({
          embeds: [EmbedBuilderService.error('This command can only be used in a server.')],
          ephemeral: true
        });
      }
      
      // Get command parameters
      const targetUser = interaction.options.getUser('user', true);
      const amount = interaction.options.getInteger('amount', true);
      
      // Await the reply while we process
      await interaction.deferReply();
      
      // Get user's current XP and level
      const userData = await LevelingService.getUser(targetUser.id);
      const oldXP = userData.xp;
      const oldLevel = userData.level;
      
      // Calculate new XP (ensure it doesn't go below 0)
      let newXP = Math.max(0, oldXP + amount);
      
      // Manually update user's XP
      userData.xp = newXP;
      
      // Calculate new level
      const newLevel = LevelingService.calculateLevel(newXP);
      userData.level = newLevel;
      
      // Save changes
      await userData.save();
      
      // Create response message
      let description = '';
      if (amount > 0) {
        description = `Added **${amount}** XP to <@${targetUser.id}>.`;
      } else if (amount < 0) {
        description = `Removed **${Math.abs(amount)}** XP from <@${targetUser.id}>.`;
      } else {
        description = `No XP change for <@${targetUser.id}>.`;
      }
      
      // Add level change information if applicable
      if (newLevel !== oldLevel) {
        if (newLevel > oldLevel) {
          description += `\nThey leveled up from **Level ${oldLevel}** to **Level ${newLevel}**!`;
        } else {
          description += `\nTheir level decreased from **Level ${oldLevel}** to **Level ${newLevel}**.`;
        }
      }
      
      const embed = EmbedBuilderService.success(description);
      
      // Add before/after fields
      embed.addFields(
        { name: 'Previous', value: `Level: ${oldLevel}\nXP: ${oldXP}`, inline: true },
        { name: 'Current', value: `Level: ${newLevel}\nXP: ${newXP}`, inline: true }
      );
      
      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in xp command:', error);
      
      return interaction.deferred
        ? interaction.editReply({ embeds: [EmbedBuilderService.error('An error occurred while modifying XP.')] })
        : interaction.reply({ embeds: [EmbedBuilderService.error('An error occurred while modifying XP.')], ephemeral: true });
    }
  },
  
  category: 'leveling',
  cooldown: 5,
} as Command; 