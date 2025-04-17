import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  Role,
  EmbedBuilder,
  Colors
} from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { LevelingService } from '../../services/LevelingService';

export = {
  data: new SlashCommandBuilder()
    .setName('levelrole')
    .setDescription('Manage level reward roles')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a role reward for reaching a level')
        .addIntegerOption(option =>
          option
            .setName('level')
            .setDescription('The level to assign the role at')
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(true)
        )
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('The role to assign')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a role reward from a level')
        .addIntegerOption(option =>
          option
            .setName('level')
            .setDescription('The level to remove the role from')
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all level reward roles')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      // Check if command is used in a guild
      if (!interaction.guild) {
        return interaction.reply({
          embeds: [EmbedBuilderService.error('This command can only be used in a server.')],
          ephemeral: true
        });
      }
      
      const subcommand = interaction.options.getSubcommand();
      
      // Add a level role
      if (subcommand === 'add') {
        const level = interaction.options.getInteger('level', true);
        const role = interaction.options.getRole('role', true) as Role;
        
        // Check if bot can manage this role
        const botMember = interaction.guild.members.me;
        if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
          return interaction.reply({
            embeds: [EmbedBuilderService.error('I don\'t have permissions to manage roles.')],
            ephemeral: true
          });
        }
        
        // Check if role is manageable
        if (!role.editable) {
          return interaction.reply({
            embeds: [EmbedBuilderService.error(`I cannot assign the ${role.name} role as it's higher than my highest role.`)],
            ephemeral: true
          });
        }
        
        // Add the level role
        await LevelingService.addLevelRole(interaction.guild.id, level, role.id);
        
        return interaction.reply({
          embeds: [EmbedBuilderService.success(`The ${role.name} role will now be awarded to members when they reach level ${level}.`)]
        });
      }
      
      // Remove a level role
      else if (subcommand === 'remove') {
        const level = interaction.options.getInteger('level', true);
        
        // Remove the level role
        const removed = await LevelingService.removeLevelRole(interaction.guild.id, level);
        
        if (removed) {
          return interaction.reply({
            embeds: [EmbedBuilderService.success(`Successfully removed the role reward for level ${level}.`)]
          });
        } else {
          return interaction.reply({
            embeds: [EmbedBuilderService.warning(`There was no role reward set for level ${level}.`)],
            ephemeral: true
          });
        }
      }
      
      // List level roles
      else if (subcommand === 'list') {
        const levelRoles = LevelingService.getLevelRoles(interaction.guild.id);
        
        if (levelRoles.length === 0) {
          return interaction.reply({
            embeds: [EmbedBuilderService.info('No level roles have been set up yet.')]
          });
        }
        
        // Create embed with role info
        const embed = new EmbedBuilder()
          .setColor(Colors.Blue)
          .setTitle('🏆 Level Reward Roles')
          .setDescription('The following roles are awarded when members reach specific levels:')
          .setFooter({ 
            text: `Server: ${interaction.guild.name}`,
            iconURL: interaction.guild.iconURL() || undefined
          });
        
        // Format role list
        const roleList = await Promise.all(levelRoles.map(async ({ level, roleId }) => {
          try {
            const role = await interaction.guild?.roles.fetch(roleId);
            return role ? `**Level ${level}**: <@&${roleId}> (${role.name})` : `**Level ${level}**: Role not found (ID: ${roleId})`;
          } catch (error) {
            return `**Level ${level}**: Role not found (ID: ${roleId})`;
          }
        }));
        
        embed.setDescription(roleList.join('\n\n'));
        
        return interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Error in levelrole command:', error);
      return interaction.reply({
        embeds: [EmbedBuilderService.error('An error occurred while managing level roles.')],
        ephemeral: true
      });
    }
  },
  
  category: 'leveling',
  cooldown: 5,
} as Command; 