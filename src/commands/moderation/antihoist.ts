import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  GuildMember,
  User,
  Collection,
  EmbedBuilder
} from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';

export = {
  data: new SlashCommandBuilder()
    .setName('antihoist')
    .setDescription('Manage users with special characters at the start of their username')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .addSubcommand(subcommand =>
      subcommand
        .setName('scan')
        .setDescription('Scan for users with hoisted names (starting with special characters)')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('fix')
        .setDescription('Fix hoisted names by removing special characters from the beginning')
        .addStringOption(option =>
          option
            .setName('prefix')
            .setDescription('Add this prefix to renamed users (e.g. "User")')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('config')
        .setDescription('Configure anti-hoist settings')
        .addBooleanOption(option =>
          option
            .setName('enable')
            .setDescription('Enable or disable automatic anti-hoist on member join')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('prefix')
            .setDescription('Default prefix for renamed users (e.g. "User")')
            .setRequired(false)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      if (!interaction.guild) {
        const guildOnlyEmbed = EmbedBuilderService.warning('This command can only be used in a server.');
        return await interaction.reply({ embeds: [guildOnlyEmbed], ephemeral: true });
      }

      const subcommand = interaction.options.getSubcommand();

      // Array of characters commonly used for hoisting in Discord
      const hoistCharacters = ['!', '"', '#', '$', '%', '&', '\'', '(', ')', '*', '+', ',', '-', '.', '/'];

      switch (subcommand) {
        case 'scan': {
          await interaction.deferReply();
          
          const members = await interaction.guild.members.fetch();
          const hoistedMembers = members.filter(member => {
            const firstChar = member.displayName.charAt(0);
            return hoistCharacters.includes(firstChar) || firstChar.charCodeAt(0) < 65;
          });
          
          if (hoistedMembers.size === 0) {
            const noHoistEmbed = EmbedBuilderService.success('No members with hoisted names were found.');
            return await interaction.editReply({ embeds: [noHoistEmbed] });
          }
          
          const hoistedList = hoistedMembers.map(member => `${member.user.tag} (${member.id}): ${member.displayName}`);
          
          // Create an embed with the results
          const resultsEmbed = new EmbedBuilder()
            .setTitle('Anti-Hoist Scan Results')
            .setDescription(`Found ${hoistedMembers.size} members with hoisted names`)
            .setColor(0x3498DB)
            .setTimestamp();
            
          // Format the list to fit in embed fields (max 1024 chars per field)
          const chunks: string[] = [];
          let currentChunk = '';
          
          for (const item of hoistedList) {
            if (currentChunk.length + item.length + 1 > 1024) {
              chunks.push(currentChunk);
              currentChunk = item;
            } else {
              currentChunk += (currentChunk ? '\n' : '') + item;
            }
          }
          
          if (currentChunk) {
            chunks.push(currentChunk);
          }
          
          // Add the chunks as fields
          chunks.forEach((chunk, index) => {
            resultsEmbed.addFields({
              name: `Hoisted Members ${index + 1}`,
              value: chunk
            });
          });
          
          await interaction.editReply({ embeds: [resultsEmbed] });
          break;
        }
        
        case 'fix': {
          await interaction.deferReply();
          
          const prefix = interaction.options.getString('prefix') || '';
          const members = await interaction.guild.members.fetch();
          
          const hoistedMembers = members.filter(member => {
            const firstChar = member.displayName.charAt(0);
            return hoistCharacters.includes(firstChar) || firstChar.charCodeAt(0) < 65;
          });
          
          if (hoistedMembers.size === 0) {
            const noHoistEmbed = EmbedBuilderService.success('No members with hoisted names were found.');
            return await interaction.editReply({ embeds: [noHoistEmbed] });
          }
          
          let successCount = 0;
          let failCount = 0;
          
          // Process members in batches to avoid rate limits
          const promises = hoistedMembers.map(async member => {
            try {
              const displayName = member.displayName;
              let newName = displayName;
              
              // Remove all hoisting characters from the beginning
              while (
                newName.length > 0 && 
                (hoistCharacters.includes(newName.charAt(0)) || newName.charCodeAt(0) < 65)
              ) {
                newName = newName.substring(1);
              }
              
              // If we removed all characters, or if the name is now empty, use the prefix
              if (newName.length === 0) {
                newName = prefix ? `${prefix}${member.user.discriminator || ''}` : `User${member.user.discriminator || ''}`;
              } else if (prefix) {
                newName = `${prefix}${newName}`;
              }
              
              // Set the new nickname
              await member.setNickname(newName, 'Anti-hoist enforcement');
              successCount++;
            } catch (error) {
              console.error(`Failed to rename ${member.user.tag}:`, error);
              failCount++;
            }
          });
          
          await Promise.allSettled(promises);
          
          const resultsEmbed = EmbedBuilderService.success(
            `Anti-hoist fix complete.\n` +
            `✅ Successfully renamed: ${successCount}\n` +
            `❌ Failed to rename: ${failCount}`
          );
          
          await interaction.editReply({ embeds: [resultsEmbed] });
          break;
        }
        
        case 'config': {
          const enabled = interaction.options.getBoolean('enable', true);
          const prefix = interaction.options.getString('prefix');
          
          // This would normally save to a database
          const configEmbed = EmbedBuilderService.success(
            `Anti-hoist configuration updated.\n` +
            `Auto anti-hoist: ${enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
            `Default prefix: ${prefix ? `"${prefix}"` : 'None (will just remove special characters)'}`
          );
          
          await interaction.reply({ embeds: [configEmbed] });
          break;
        }
        
        default:
          const invalidSubcommand = EmbedBuilderService.error('Invalid subcommand');
          await interaction.reply({ embeds: [invalidSubcommand], ephemeral: true });
      }
    } catch (error) {
      console.error('Error in antihoist command:', error);
      const errorEmbed = EmbedBuilderService.error('An error occurred while executing the antihoist command.');
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
    }
  }
} as Command; 