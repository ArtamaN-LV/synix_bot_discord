import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
  PermissionFlagsBits
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';

// Import type extensions
import '../../types/discord';

interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface EmbedData {
  title?: string;
  description?: string;
  color?: string;
  fields?: EmbedField[];
  footer?: { text: string; icon_url?: string };
  author?: { name: string; icon_url?: string; url?: string };
  thumbnail?: { url: string };
  image?: { url: string };
  timestamp?: boolean;
}

export = {
  data: new SlashCommandBuilder()
    .setName('embed-edit')
    .setDescription('Edit an existing embed message')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option
        .setName('message_id')
        .setDescription('The ID of the message containing the embed to edit')
        .setRequired(true)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    // Check if user has administrator permissions
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: '❌ This command is restricted to administrators only.',
        ephemeral: true
      });
    }

    const messageId = interaction.options.getString('message_id', true);
    
    try {
      // Fetch the message
      const message = await interaction.channel?.messages.fetch(messageId);
      if (!message) {
        return interaction.reply({ 
          content: '❌ Message not found. Make sure the message ID is correct and the message is in this channel.',
          ephemeral: true 
        });
      }

      // Check if the message has an embed
      if (!message.embeds.length) {
        return interaction.reply({ 
          content: '❌ The specified message does not contain any embeds.',
          ephemeral: true 
        });
      }

      const embed = message.embeds[0];
      
      // Create a select menu for choosing what to edit
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('embed_edit_select')
        .setPlaceholder('Select what to edit')
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel('Title')
            .setDescription('Edit the embed title')
            .setValue('title'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Description')
            .setDescription('Edit the embed description')
            .setValue('description'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Color')
            .setDescription('Edit the embed color')
            .setValue('color'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Fields')
            .setDescription('Edit embed fields')
            .setValue('fields'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Footer')
            .setDescription('Edit the embed footer')
            .setValue('footer'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Author')
            .setDescription('Edit the embed author')
            .setValue('author'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Thumbnail')
            .setDescription('Edit the embed thumbnail')
            .setValue('thumbnail'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Image')
            .setDescription('Edit the embed image')
            .setValue('image')
        );

      const row = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(selectMenu);

      await interaction.reply({ 
        content: 'Select what you want to edit in the embed:',
        components: [row],
        ephemeral: true 
      });

      // Handle the select menu interaction
      const collector = interaction.channel?.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
        time: 60000
      });

      collector?.on('collect', async (i: StringSelectMenuInteraction) => {
        const selectedOption = i.values[0];
        
        // Create a modal based on the selected option
        const modal = new ModalBuilder()
          .setCustomId(`embed_edit_${selectedOption}`)
          .setTitle(`Edit Embed ${selectedOption.charAt(0).toUpperCase() + selectedOption.slice(1)}`);

        const input = new TextInputBuilder()
          .setCustomId(selectedOption)
          .setLabel(`Enter new ${selectedOption}`)
          .setStyle(TextInputStyle.Paragraph);

        if (selectedOption === 'title') {
          input.setValue(embed.title || '');
        } else if (selectedOption === 'description') {
          input.setValue(embed.description || '');
        } else if (selectedOption === 'color') {
          input.setValue(embed.hexColor || '#000000');
        } else if (selectedOption === 'footer') {
          input.setValue(embed.footer?.text || '');
        } else if (selectedOption === 'author') {
          input.setValue(embed.author?.name || '');
        }

        const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(input);
        modal.addComponents(actionRow);

        await i.showModal(modal);

        // Create a modal collector
        const modalCollector = await i.awaitModalSubmit({
          time: 60000,
          filter: (modalInteraction) => modalInteraction.customId === `embed_edit_${selectedOption}`
        });

        if (!modalCollector) return;

        try {
          const value = modalCollector.fields.getTextInputValue(selectedOption);
          const newEmbed = new EmbedBuilder(embed.toJSON());
          
          switch (selectedOption) {
            case 'title':
              newEmbed.setTitle(value);
              break;
            case 'description':
              newEmbed.setDescription(value);
              break;
            case 'color':
              newEmbed.setColor(value as `#${string}`);
              break;
            case 'footer':
              newEmbed.setFooter({ text: value });
              break;
            case 'author':
              newEmbed.setAuthor({ name: value });
              break;
            case 'thumbnail':
              newEmbed.setThumbnail(value);
              break;
            case 'image':
              newEmbed.setImage(value);
              break;
          }

          await message.edit({ embeds: [newEmbed] });
          await modalCollector.reply({ 
            content: `✅ Successfully updated the embed's ${selectedOption}!`,
            ephemeral: true 
          });
        } catch (error) {
          await modalCollector.reply({ 
            content: '❌ Failed to update the embed. Please try again.',
            ephemeral: true 
          });
        }
      });

    } catch (error) {
      console.error('Error in embed-edit command:', error);
      return interaction.reply({ 
        content: '❌ An error occurred while trying to edit the embed. Please try again.',
        ephemeral: true 
      });
    }
  },
  
  category: 'utility',
  cooldown: 5
} as Command; 