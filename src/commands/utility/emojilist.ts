import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  Collection,
  GuildEmoji
} from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';

// Import type extensions
import '../../types/discord';

export = {
  data: new SlashCommandBuilder()
    .setName('emojilist')
    .setDescription('Display all emojis in the server'),
  
  async execute(interaction: ChatInputCommandInteraction) {
    // Check if command is used in a guild
    if (!interaction.guild) {
      return interaction.reply({
        embeds: [EmbedBuilderService.error('This command can only be used in a server.')],
        ephemeral: true
      });
    }
    
    try {
      // Fetch all emojis from the guild
      const emojis = interaction.guild.emojis.cache;
      
      if (emojis.size === 0) {
        return interaction.reply({
          embeds: [EmbedBuilderService.info('This server has no custom emojis.')],
          ephemeral: true
        });
      }
      
      // Split into standard and animated emojis
      const standardEmojis = emojis.filter(emoji => !emoji.animated);
      const animatedEmojis = emojis.filter(emoji => emoji.animated);
      
      // Create the embed
      const embed = EmbedBuilderService.createEmbed()
        .setColor(COLORS.INFO)
        .setTitle(`Emojis in ${interaction.guild.name}`)
        .setThumbnail(interaction.guild.iconURL() || '')
        .setDescription(`This server has **${emojis.size}** custom emojis (**${standardEmojis.size}** standard, **${animatedEmojis.size}** animated).`);
      
      // Format standard emojis, 15 per field
      if (standardEmojis.size > 0) {
        const standardEmojiChunks = createEmojiChunks(standardEmojis, 15);
        for (let i = 0; i < standardEmojiChunks.length; i++) {
          embed.addFields({
            name: i === 0 ? 'Standard Emojis' : '\u200B',
            value: standardEmojiChunks[i],
            inline: false
          });
        }
      }
      
      // Format animated emojis, 15 per field
      if (animatedEmojis.size > 0) {
        const animatedEmojiChunks = createEmojiChunks(animatedEmojis, 15);
        for (let i = 0; i < animatedEmojiChunks.length; i++) {
          embed.addFields({
            name: i === 0 ? 'Animated Emojis' : '\u200B',
            value: animatedEmojiChunks[i],
            inline: false
          });
        }
      }
      
      // Add footer with emoji count
      embed.setFooter({ text: `Total: ${emojis.size} emojis` });
      
      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error getting emoji list:', error);
      return interaction.reply({
        embeds: [EmbedBuilderService.error('An error occurred while fetching emojis.')],
        ephemeral: true
      });
    }
  },
  
  category: 'utility',
  cooldown: 5,
} as Command;

/**
 * Format emoji collections into chunks for display
 */
function createEmojiChunks(emojiCollection: Collection<string, GuildEmoji>, chunkSize: number): string[] {
  const emojiArray = Array.from(emojiCollection.values());
  const chunks: string[] = [];
  
  for (let i = 0; i < emojiArray.length; i += chunkSize) {
    const chunk = emojiArray.slice(i, i + chunkSize);
    const emojiStrings = chunk.map((emoji: GuildEmoji) => `${emoji} \`:${emoji.name}:\``);
    chunks.push(emojiStrings.join(' '));
  }
  
  return chunks;
} 