import { EmbedBuilder, User, ColorResolvable } from 'discord.js';
import { COLORS, BotInfo } from './constants';

export class EmbedBuilderService {
  /**
   * Creates a default embed with consistent styling
   */
  static createEmbed(options: {
    title?: string;
    description?: string;
    color?: ColorResolvable;
    fields?: { name: string; value: string; inline?: boolean }[];
    footer?: { text: string; iconURL?: string };
    thumbnail?: string;
    image?: string;
    author?: { name: string; iconURL?: string; url?: string };
    timestamp?: boolean;
  } = {}) {
    const embed = new EmbedBuilder();

    if (options.title) embed.setTitle(options.title);
    if (options.description) embed.setDescription(options.description);
    if (options.color) embed.setColor(options.color);
    if (options.fields) embed.addFields(options.fields);
    if (options.footer) embed.setFooter(options.footer);
    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    if (options.image) embed.setImage(options.image);
    if (options.author) embed.setAuthor(options.author);
    if (options.timestamp) embed.setTimestamp();

    return embed;
  }

  /**
   * Creates a success embed
   * @param description The success message
   */
  static success(message: string) {
    return this.createEmbed({
      title: '✅ Success',
      description: message,
      color: COLORS.SUCCESS,
      timestamp: true
    });
  }

  /**
   * Creates an error embed
   * @param description The error message
   */
  static error(message: string) {
    return this.createEmbed({
      title: '❌ Error',
      description: message,
      color: COLORS.ERROR,
      timestamp: true
    });
  }

  /**
   * Creates a warning embed
   * @param description The warning message
   */
  static warning(message: string) {
    return this.createEmbed({
      title: '⚠️ Warning',
      description: message,
      color: COLORS.WARNING,
      timestamp: true
    });
  }

  /**
   * Creates an info embed
   * @param description The info message
   */
  static info(message: string) {
    return this.createEmbed({
      title: 'ℹ️ Information',
      description: message,
      color: COLORS.INFO,
      timestamp: true
    });
  }

  /**
   * Creates a user info embed
   * @param user The user to show info for
   */
  static userInfo(user: User) {
    return this.createEmbed()
      .setColor(COLORS.INFO)
      .setTitle(`User Information: ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ size: 128 }))
      .addFields(
        { name: 'Username', value: user.username, inline: true },
        { name: 'ID', value: user.id, inline: true },
        { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
      );
  }
} 