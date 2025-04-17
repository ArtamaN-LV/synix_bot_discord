import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  PermissionFlagsBits
} from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { getGuildPrefix, setGuildPrefix, resetGuildPrefix } from '../../services/GuildPrefixService';

export const data = new SlashCommandBuilder()
  .setName('prefix')
  .setDescription('View or change the command prefix for text-based commands')
  .addSubcommand(subcommand =>
    subcommand
      .setName('view')
      .setDescription('View the current command prefix')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('set')
      .setDescription('Set a new command prefix')
      .addStringOption(option => 
        option
          .setName('new_prefix')
          .setDescription('The new prefix to set')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('reset')
      .setDescription('Reset the command prefix to the default')
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    // Check if the command is used in a guild
    if (!interaction.guild) {
      const guildOnlyEmbed = EmbedBuilderService.warning('This command can only be used in a server.');
      return await interaction.reply({ embeds: [guildOnlyEmbed], ephemeral: true });
    }
    
    const subcommand = interaction.options.getSubcommand();
    
    // View the current prefix
    if (subcommand === 'view') {
      const currentPrefix = await getGuildPrefix(interaction.guild.id);
      const prefixEmbed = EmbedBuilderService.info(`The current command prefix is: \`${currentPrefix}\``);
      return await interaction.reply({ embeds: [prefixEmbed] });
    }
    
    // Set a new prefix
    if (subcommand === 'set') {
      const newPrefix = interaction.options.getString('new_prefix', true);
      
      // Check if the new prefix is too long
      if (newPrefix.length > 5) {
        const tooLongEmbed = EmbedBuilderService.warning('The prefix cannot be longer than 5 characters.');
        return await interaction.reply({ embeds: [tooLongEmbed], ephemeral: true });
      }
      
      // Update the prefix
      await setGuildPrefix(interaction.guild.id, newPrefix);
      
      // Confirm the change
      const successEmbed = EmbedBuilderService.success(`The command prefix has been updated to: \`${newPrefix}\``);
      return await interaction.reply({ embeds: [successEmbed] });
    }
    
    // Reset the prefix to default
    if (subcommand === 'reset') {
      await resetGuildPrefix(interaction.guild.id);
      
      // Get the default prefix after reset
      const defaultPrefix = await getGuildPrefix(interaction.guild.id);
      
      // Confirm the reset
      const resetEmbed = EmbedBuilderService.success(`The command prefix has been reset to the default: \`${defaultPrefix}\``);
      return await interaction.reply({ embeds: [resetEmbed] });
    }
  } catch (error) {
    console.error('Error in prefix command:', error);
    
    // Handle database connection errors
    let errorMessage = 'An error occurred while updating the prefix.';
    if (error instanceof Error && error.message.includes('MongoDB')) {
      errorMessage = 'Could not connect to the database. The prefix feature may not be available yet.';
    }
    
    const errorEmbed = EmbedBuilderService.error(errorMessage);
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
  }
} 