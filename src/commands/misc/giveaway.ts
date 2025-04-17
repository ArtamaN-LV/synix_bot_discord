import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
  ComponentType,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';

// Map to store active giveaways (in a real app, this would be in a database)
const activeGiveaways = new Map();

// Parse duration string into milliseconds
function parseDuration(durationStr: string): number | null {
  const durationRegex = /^(\d+)([smhd])$/i;
  const match = durationStr.match(durationRegex);
  
  if (!match) return null;
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  // Convert to milliseconds
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

// Create a unique ID
function createUniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Start a giveaway')
    .addStringOption(option => 
      option
        .setName('prize')
        .setDescription('What are you giving away?')
        .setRequired(true)
    )
    .addStringOption(option => 
      option
        .setName('duration')
        .setDescription('How long should the giveaway last? (e.g., 10s, 5m, 2h, 1d)')
        .setRequired(true)
    )
    .addIntegerOption(option => 
      option
        .setName('winners')
        .setDescription('Number of winners (default: 1)')
        .setMinValue(1)
        .setMaxValue(10)
    )
    .addStringOption(option => 
      option
        .setName('description')
        .setDescription('Additional information about the giveaway')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  async execute(interaction: ChatInputCommandInteraction) {
    // Get options
    const prize = interaction.options.getString('prize', true);
    const durationString = interaction.options.getString('duration', true);
    const winnerCount = interaction.options.getInteger('winners') || 1;
    const description = interaction.options.getString('description') || '';
    
    // Parse duration
    const durationMs = parseDuration(durationString);
    
    if (!durationMs) {
      return interaction.reply({
        content: 'Invalid duration format. Please use a number followed by s (seconds), m (minutes), h (hours), or d (days). Example: 5m',
        ephemeral: true
      });
    }
    
    // Calculate end time
    const endTime = Date.now() + durationMs;
    
    // Create giveaway ID
    const giveawayId = createUniqueId();
    
    // Create giveaway embed
    const giveawayEmbed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle('🎉 GIVEAWAY 🎉')
      .setDescription(`**${prize}**\n\n${description}`)
      .addFields(
        { name: 'Duration', value: `Ends: <t:${Math.floor(endTime / 1000)}:R>`, inline: true },
        { name: 'Winners', value: `${winnerCount}`, inline: true },
        { name: 'Hosted by', value: `${interaction.user}`, inline: true },
        { name: 'Entries', value: '0', inline: true }
      )
      .setFooter({ text: `Giveaway ID: ${giveawayId}` })
      .setTimestamp();
    
    // Create enter button
    const enterButton = new ButtonBuilder()
      .setCustomId(`giveaway-enter-${giveawayId}`)
      .setLabel('Enter Giveaway')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎉');
    
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(enterButton);
    
    await interaction.reply({ content: 'Giveaway created!', ephemeral: true });
    
    // Send giveaway message
    const channel = interaction.channel as TextChannel;
    const giveawayMessage = await channel.send({
      embeds: [giveawayEmbed],
      components: [row]
    });
    
    // Store giveaway data
    const giveawayData = {
      messageId: giveawayMessage.id,
      channelId: channel.id,
      endTime,
      prize,
      winnerCount,
      hostId: interaction.user.id,
      description,
      participants: new Set<string>()
    };
    
    activeGiveaways.set(giveawayId, giveawayData);
    
    // Set up button collector
    const collector = giveawayMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: durationMs
    });
    
    collector.on('collect', async (i) => {
      // Get giveaway data
      const giveaway = activeGiveaways.get(giveawayId);
      
      if (!giveaway) {
        await i.reply({ content: 'This giveaway no longer exists!', ephemeral: true });
        return;
      }
      
      if (i.customId === `giveaway-enter-${giveawayId}`) {
        // Check if user already entered
        if (giveaway.participants.has(i.user.id)) {
          await i.reply({ content: 'You have already entered this giveaway!', ephemeral: true });
          return;
        }
        
        // Add user to participants
        giveaway.participants.add(i.user.id);
        
        // Update embed with new entry count
        const updatedEmbed = EmbedBuilder.from(giveawayMessage.embeds[0])
          .spliceFields(3, 1, { name: 'Entries', value: `${giveaway.participants.size}`, inline: true });
        
        await giveawayMessage.edit({ embeds: [updatedEmbed] });
        
        await i.reply({ content: 'You have entered the giveaway! Good luck! 🍀', ephemeral: true });
      }
    });
    
    // Set timeout to end giveaway
    setTimeout(async () => {
      try {
        const giveaway = activeGiveaways.get(giveawayId);
        
        if (!giveaway) return;
        
        // Try to fetch the message
        let giveawayMessage;
        try {
          // Ensure channel ID is a valid string
          if (typeof giveaway.channelId !== 'string') {
            console.error('Invalid channel ID');
            return;
          }
          
          const channel = await interaction.client.channels.fetch(giveaway.channelId) as TextChannel;
          
          // Ensure message ID is a valid string
          if (typeof giveaway.messageId !== 'string') {
            console.error('Invalid message ID');
            return;
          }
          
          giveawayMessage = await channel.messages.fetch(giveaway.messageId);
        } catch (error) {
          console.error('Could not fetch giveaway message:', error instanceof Error ? error.message : String(error));
          return;
        }
        
        // Convert participants set to array
        const participants = Array.from(giveaway.participants) as string[];
        const winners: string[] = [];
        
        // Select winners
        if (participants.length > 0) {
          const winnerCount = Math.min(giveaway.winnerCount, participants.length);
          
          for (let i = 0; i < winnerCount; i++) {
            const winnerIndex = Math.floor(Math.random() * participants.length);
            winners.push(participants[winnerIndex]);
            participants.splice(winnerIndex, 1);
          }
        }
        
        // Create winners announcement
        let winnersText = 'No one entered the giveaway!';
        
        if (winners.length > 0) {
          winnersText = winners.map(id => `<@${id}>`).join(', ');
        }
        
        // Create completed giveaway embed
        const completedEmbed = EmbedBuilder.from(giveawayMessage.embeds[0])
          .setColor(COLORS.SUCCESS)
          .setTitle('🎊 GIVEAWAY ENDED 🎊')
          .spliceFields(0, 1, { name: 'Winner(s)', value: winnersText, inline: false });
        
        // Disable the enter button
        const disabledRow = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            ButtonBuilder.from((giveawayMessage.components[0].components[0] as any))
              .setDisabled(true)
              .setLabel('Giveaway Ended')
          );
        
        // Update the giveaway message
        await giveawayMessage.edit({
          embeds: [completedEmbed],
          components: [disabledRow]
        });
        
        // Send winner announcement
        if (winners.length > 0) {
          await giveawayMessage.reply({
            content: `Congratulations ${winnersText}! You won **${giveaway.prize}**!`,
            allowedMentions: { users: winners }
          });
        } else {
          await giveawayMessage.reply('No one entered the giveaway!');
        }
        
        // Clean up
        activeGiveaways.delete(giveawayId);
        
      } catch (error) {
        console.error('Error ending giveaway:', error instanceof Error ? error.message : String(error));
      }
    }, durationMs);
  }
} as Command; 