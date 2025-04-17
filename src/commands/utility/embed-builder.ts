import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Message,
  ButtonInteraction,
  ModalSubmitInteraction,
  ColorResolvable,
  APIEmbedField,
  MessageFlags,
  Interaction,
  PermissionFlagsBits
} from 'discord.js';
import { Command } from '../../interfaces/command';

interface EmbedData {
  title?: string;
  description?: string;
  color?: string;
  fields: APIEmbedField[];
  footer?: { text: string; iconURL?: string };
  thumbnail?: string;
  image?: string;
  author?: { name: string; iconURL?: string; url?: string };
}

interface ModalConfig {
  id: string;
  title: string;
  inputs: { id: string; label: string; style: TextInputStyle; required?: boolean; placeholder?: string }[];
}

class EmbedBuilderCommand {
  private readonly interaction: ChatInputCommandInteraction;
  private message: Message | null = null;
  private messageId: string | null = null;
  private embedData: EmbedData = { fields: [] };
  private isEdited: boolean = false;

  constructor(interaction: ChatInputCommandInteraction) {
    this.interaction = interaction;
  }

  private createButtons(): ActionRowBuilder<ButtonBuilder>[] {
    return [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('title').setLabel('Title').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('description').setLabel('Description').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('color').setLabel('Color').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('field').setLabel('Add Field').setStyle(ButtonStyle.Secondary)
      ),
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('footer').setLabel('Footer').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('thumbnail').setLabel('Thumbnail').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('image').setLabel('Image').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('author').setLabel('Author').setStyle(ButtonStyle.Secondary)
      ),
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('preview').setLabel('Preview').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('send').setLabel('Send').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('clear').setLabel('Clear').setStyle(ButtonStyle.Danger)
      )
    ];
  }

  private createEmbed(): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor((this.embedData.color as ColorResolvable) || '#0099ff')
      .setTimestamp();

    if (this.embedData.title) embed.setTitle(this.embedData.title);
    if (this.embedData.description) embed.setDescription(this.embedData.description);
    if (this.embedData.fields.length) embed.addFields(this.embedData.fields);
    if (this.embedData.thumbnail) embed.setThumbnail(this.embedData.thumbnail);
    if (this.embedData.image) embed.setImage(this.embedData.image);
    if (this.embedData.author) embed.setAuthor(this.embedData.author);

    if (this.isEdited) {
      embed.setFooter({
        text: this.embedData.footer ? `${this.embedData.footer.text} (edited)` : '(edited)',
        iconURL: this.embedData.footer?.iconURL
      });
    } else if (this.embedData.footer) {
      embed.setFooter({ text: this.embedData.footer.text, iconURL: this.embedData.footer.iconURL });
    }

    return embed;
  }

  private createModal(config: ModalConfig): ModalBuilder {
    const modal = new ModalBuilder().setCustomId(config.id).setTitle(config.title);
    const components = config.inputs.map(input => 
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(input.id)
          .setLabel(input.label)
          .setStyle(input.style)
          .setRequired(input.required ?? false)
          .setPlaceholder(input.placeholder ?? '')
      )
    );
    return modal.addComponents(components);
  }

  private async verifyMessage(): Promise<boolean> {
    if (!this.message || !this.messageId || !this.interaction.channel) return false;

    try {
      const fetchedMessage = await this.interaction.channel.messages.fetch(this.messageId).catch(() => null);
      if (!fetchedMessage || !fetchedMessage.editable) {
        this.message = null;
        this.messageId = null;
        return false;
      }
      this.message = fetchedMessage;
      return true;
    } catch (error) {
      console.error(`Message verification failed: ${error}`);
      this.message = null;
      this.messageId = null;
      return false;
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private async handleButton(interaction: ButtonInteraction): Promise<void> {
    if (interaction.user.id !== this.interaction.user.id) {
      await interaction.reply({ 
        content: 'This is not your embed builder!', 
        flags: MessageFlags.Ephemeral 
      });
      return;
    }

    if (!await this.verifyMessage()) {
      await interaction.reply({ 
        content: 'Session expired or message deleted. Use /embed-builder to start a new session.', 
        flags: MessageFlags.Ephemeral 
      });
      return;
    }

    const modalConfigs: Record<string, ModalConfig> = {
      title: {
        id: 'title',
        title: 'Set Title',
        inputs: [{ id: 'title', label: 'Title', style: TextInputStyle.Short, required: true, placeholder: 'Enter embed title' }]
      },
      description: {
        id: 'description',
        title: 'Set Description',
        inputs: [{ id: 'description', label: 'Description', style: TextInputStyle.Paragraph, required: true, placeholder: 'Enter embed description' }]
      },
      color: {
        id: 'color',
        title: 'Set Color',
        inputs: [{ id: 'color', label: 'Hex Color', style: TextInputStyle.Short, required: true, placeholder: '#FF0000' }]
      },
      field: {
        id: 'field',
        title: 'Add Field',
        inputs: [
          { id: 'name', label: 'Field Name', style: TextInputStyle.Short, required: true, placeholder: 'Field name' },
          { id: 'value', label: 'Field Value', style: TextInputStyle.Paragraph, required: true, placeholder: 'Field value' },
          { id: 'inline', label: 'Inline (true/false)', style: TextInputStyle.Short, placeholder: 'false' }
        ]
      },
      footer: {
        id: 'footer',
        title: 'Set Footer',
        inputs: [
          { id: 'text', label: 'Footer Text', style: TextInputStyle.Short, required: true, placeholder: 'Footer text' },
          { id: 'icon', label: 'Footer Icon URL', style: TextInputStyle.Short, placeholder: 'Icon URL' }
        ]
      },
      thumbnail: {
        id: 'thumbnail',
        title: 'Set Thumbnail',
        inputs: [{ id: 'thumbnail', label: 'Thumbnail URL', style: TextInputStyle.Short, required: true, placeholder: 'Image URL' }]
      },
      image: {
        id: 'image',
        title: 'Set Image',
        inputs: [{ id: 'image', label: 'Image URL', style: TextInputStyle.Short, required: true, placeholder: 'Image URL' }]
      },
      author: {
        id: 'author',
        title: 'Set Author',
        inputs: [
          { id: 'name', label: 'Author Name', style: TextInputStyle.Short, required: true, placeholder: 'Author name' },
          { id: 'icon', label: 'Author Icon URL', style: TextInputStyle.Short, placeholder: 'Icon URL' },
          { id: 'url', label: 'Author URL', style: TextInputStyle.Short, placeholder: 'Author URL' }
        ]
      }
    };

    try {
      if (interaction.customId in modalConfigs) {
        await interaction.showModal(this.createModal(modalConfigs[interaction.customId]));
      } else if (interaction.customId === 'preview') {
        await interaction.reply({ embeds: [this.createEmbed()], flags: MessageFlags.Ephemeral });
      } else if (interaction.customId === 'send') {
        if (!this.message) {
          await interaction.reply({ content: 'Message not found. Please start a new session.', flags: MessageFlags.Ephemeral });
          return;
        }
        await this.message.edit({ embeds: [this.createEmbed()], components: [] });
        await interaction.reply({ content: 'Embed sent!', flags: MessageFlags.Ephemeral });
      } else if (interaction.customId === 'clear') {
        this.embedData = { fields: [] };
        this.isEdited = false;
        const embed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle('Embed Builder')
          .setDescription('Create a new embed using the buttons below')
          .setTimestamp();
        if (!this.message) {
          await interaction.reply({ content: 'Message not found. Please start a new session.', flags: MessageFlags.Ephemeral });
          return;
        }
        await this.message.edit({ embeds: [embed], components: this.createButtons() });
        await interaction.reply({ content: 'Embed cleared!', flags: MessageFlags.Ephemeral });
      }
    } catch (error) {
      console.error(`Button interaction error: ${error}`);
      await interaction.reply({ 
        content: 'Error processing button interaction. The message may have been deleted.', 
        flags: MessageFlags.Ephemeral 
      });
    }
  }

  private async handleModal(interaction: ModalSubmitInteraction): Promise<void> {
    if (interaction.user.id !== this.interaction.user.id) return;

    // Verify message before any processing
    if (!await this.verifyMessage()) {
      await interaction.reply({ 
        content: 'Session expired or message deleted. Use /embed-builder to start a new session.', 
        flags: MessageFlags.Ephemeral 
      });
      return;
    }

    try {
      await interaction.deferUpdate();

      // Process modal data
      this.isEdited = true;
      switch (interaction.customId) {
        case 'title':
          this.embedData.title = interaction.fields.getTextInputValue('title');
          break;
        case 'description':
          this.embedData.description = interaction.fields.getTextInputValue('description');
          break;
        case 'color':
          const color = interaction.fields.getTextInputValue('color');
          if (!/^#[0-9A-F]{6}$/i.test(color)) throw new Error('Invalid hex color (e.g., #FF0000)');
          this.embedData.color = color;
          break;
        case 'field':
          this.embedData.fields.push({
            name: interaction.fields.getTextInputValue('name'),
            value: interaction.fields.getTextInputValue('value'),
            inline: interaction.fields.getTextInputValue('inline')?.toLowerCase() === 'true'
          });
          break;
        case 'footer':
          const footerText = interaction.fields.getTextInputValue('text');
          const footerIcon = interaction.fields.getTextInputValue('icon');
          if (footerText) {
            this.embedData.footer = { text: footerText };
            if (footerIcon && this.isValidUrl(footerIcon)) {
              this.embedData.footer.iconURL = footerIcon;
            }
          }
          break;
        case 'thumbnail':
          const thumbnail = interaction.fields.getTextInputValue('thumbnail');
          if (!this.isValidUrl(thumbnail)) throw new Error('Invalid thumbnail URL');
          this.embedData.thumbnail = thumbnail;
          break;
        case 'image':
          const image = interaction.fields.getTextInputValue('image');
          if (!this.isValidUrl(image)) throw new Error('Invalid image URL');
          this.embedData.image = image;
          break;
        case 'author':
          const authorName = interaction.fields.getTextInputValue('name');
          const authorIcon = interaction.fields.getTextInputValue('icon');
          const authorUrl = interaction.fields.getTextInputValue('url');
          this.embedData.author = { name: authorName };
          if (authorIcon && this.isValidUrl(authorIcon)) this.embedData.author.iconURL = authorIcon;
          if (authorUrl && this.isValidUrl(authorUrl)) this.embedData.author.url = authorUrl;
          break;
      }

      // Verify message again before editing
      if (!await this.verifyMessage()) {
        await interaction.followUp({ 
          content: 'Message was deleted while processing. Please start a new session.', 
          flags: MessageFlags.Ephemeral 
        });
        return;
      }

      if (!this.message) {
        await interaction.followUp({ 
          content: 'Message was deleted while processing. Please start a new session.', 
          flags: MessageFlags.Ephemeral 
        });
        return;
      }

      await this.message.edit({ embeds: [this.createEmbed()], components: this.createButtons() });
    } catch (error) {
      console.error(`Modal interaction error: ${error}`);
      await interaction.followUp({ 
        content: `Error: ${error instanceof Error ? error.message : 'Failed to update embed'}`,
        flags: MessageFlags.Ephemeral 
      });
    }
  }

  async execute(): Promise<void> {
    try {
      // Check if user has administrator permissions
      if (!this.interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        await this.interaction.reply({
          content: '❌ This command is restricted to administrators only.',
          ephemeral: true
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Embed Builder')
        .setDescription('Create a new embed using the buttons below')
        .setTimestamp();

      // Send non-ephemeral message to ensure message stability
      const reply = await this.interaction.reply({
        embeds: [embed],
        components: this.createButtons(),
        fetchReply: true
      });

      this.message = reply as Message;
      this.messageId = reply.id;

      const collector = this.message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 600000 // 10 minutes
      });

      collector.on('collect', async (interaction: ButtonInteraction) => {
        try {
          await this.handleButton(interaction);
        } catch (error) {
          console.error(`Collector error: ${error}`);
          if (!interaction.replied) {
            await interaction.reply({ 
              content: 'Error processing interaction.', 
              flags: MessageFlags.Ephemeral 
            });
          }
        }
      });

      // Scoped modal listener for this instance
      const modalListener = async (interaction: Interaction) => {
        if (!interaction.isModalSubmit() || interaction.user.id !== this.interaction.user.id) return;
        try {
          await this.handleModal(interaction);
        } catch (error) {
          console.error(`Modal collector error: ${error}`);
          if (!interaction.replied) {
            await interaction.reply({ 
              content: 'Error processing modal submission.', 
              flags: MessageFlags.Ephemeral 
            });
          }
        }
      };

      this.interaction.client.on('interactionCreate', modalListener);

      collector.on('end', async () => {
        try {
          // Remove modal listener when collector ends
          this.interaction.client.off('interactionCreate', modalListener);

          if (await this.verifyMessage() && this.message) {
            await this.message.edit({ components: [] });
          }
        } catch (error) {
          console.error(`Collector end error: ${error}`);
        }
      });
    } catch (error) {
      console.error(`Execute error: ${error}`);
      await this.interaction.followUp({ 
        content: 'Failed to start embed builder.', 
        flags: MessageFlags.Ephemeral 
      });
    }
  }
}

export = {
  data: new SlashCommandBuilder()
    .setName('embed-builder')
    .setDescription('Interactively create and customize Discord embeds')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction: ChatInputCommandInteraction) {
    const builder = new EmbedBuilderCommand(interaction);
    await builder.execute();
  },
  category: 'utility',
  cooldown: 5
} as Command;