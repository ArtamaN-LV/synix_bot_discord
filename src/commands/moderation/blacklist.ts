import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';

const blacklist: Command = {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Manage blacklisted words in the server')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a word to the blacklist')
        .addStringOption(option =>
          option
            .setName('word')
            .setDescription('The word to blacklist')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('Action to take when word is detected')
            .addChoices(
              { name: 'Delete Message', value: 'delete' },
              { name: 'Warn User', value: 'warn' },
              { name: 'Timeout User', value: 'timeout' }
            )
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a word from the blacklist')
        .addStringOption(option =>
          option
            .setName('word')
            .setDescription('The word to remove from blacklist')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('View all blacklisted words')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  category: 'moderation',
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
      return interaction.reply({
        content: '❌ This command can only be used in a server.',
        ephemeral: true
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const embed = new EmbedBuilder().setColor(COLORS.INFO);

    switch (subcommand) {
      case 'add': {
        const word = interaction.options.getString('word', true);
        const action = interaction.options.getString('action', true);

        try {
          // Here you would typically save the word and action to a database
          embed
            .setTitle('✅ Word Blacklisted')
            .setDescription(`The word "${word}" has been added to the blacklist.`)
            .addFields(
              { name: 'Word', value: word, inline: true },
              { name: 'Action', value: action, inline: true }
            );
        } catch (error) {
          console.error('Error adding word to blacklist:', error);
          return interaction.reply({
            content: '❌ An error occurred while adding the word to the blacklist.',
            ephemeral: true
          });
        }
        break;
      }

      case 'remove': {
        const word = interaction.options.getString('word', true);

        try {
          // Here you would typically remove the word from the database
          embed
            .setTitle('✅ Word Removed')
            .setDescription(`The word "${word}" has been removed from the blacklist.`);
        } catch (error) {
          console.error('Error removing word from blacklist:', error);
          return interaction.reply({
            content: '❌ An error occurred while removing the word from the blacklist.',
            ephemeral: true
          });
        }
        break;
      }

      case 'list': {
        try {
          // Here you would typically fetch the blacklist from the database
          // For now, we'll just show a placeholder message
          embed
            .setTitle('📋 Blacklisted Words')
            .setDescription('No words are currently blacklisted.');
        } catch (error) {
          console.error('Error viewing blacklist:', error);
          return interaction.reply({
            content: '❌ An error occurred while viewing the blacklist.',
            ephemeral: true
          });
        }
        break;
      }
    }

    return interaction.reply({ embeds: [embed] });
  }
};

export default blacklist; 