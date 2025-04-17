import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ButtonInteraction
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { COLORS, MAX_VALUES } from '../../utils/constants';
import { v4 as uuidv4 } from 'uuid';

// Import type extensions
import '../../types/discord';

// Track polls and votes in memory (in a real bot, use a database)
interface PollOption {
  id: string;
  text: string;
  votes: Set<string>;
  percentage?: number;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  creatorId: string;
  multipleVotes: boolean;
  endTime?: number;
  totalVotes: number;
}

const activePolls = new Map<string, Poll>();

// Emoji for poll status
const statusEmojis = {
  active: '📊',
  ended: '✅',
  multiple: '🔢'
};

export = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll with multiple options')
    .addStringOption(option => 
      option.setName('question')
        .setDescription('The poll question')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('option1')
        .setDescription('Option 1')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('option2')
        .setDescription('Option 2')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('option3')
        .setDescription('Option 3')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('option4')
        .setDescription('Option 4')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('option5')
        .setDescription('Option 5')
        .setRequired(false))
    .addBooleanOption(option => 
      option.setName('multiple_votes')
        .setDescription('Allow users to vote for multiple options')
        .setRequired(false))
    .addIntegerOption(option => 
      option.setName('duration')
        .setDescription('Poll duration in minutes (max 10080 = 1 week)')
        .setMinValue(1)
        .setMaxValue(10080)
        .setRequired(false)),
  
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      // Get all options
      const question = interaction.options.getString('question', true);
      const option1 = interaction.options.getString('option1', true);
      const option2 = interaction.options.getString('option2', true);
      const option3 = interaction.options.getString('option3');
      const option4 = interaction.options.getString('option4');
      const option5 = interaction.options.getString('option5');
      const multipleVotes = interaction.options.getBoolean('multiple_votes') || false;
      const duration = interaction.options.getInteger('duration');
      
      // Create poll options array
      const options = [
        { id: uuidv4(), text: option1, votes: new Set<string>() },
        { id: uuidv4(), text: option2, votes: new Set<string>() }
      ];
      
      if (option3) options.push({ id: uuidv4(), text: option3, votes: new Set<string>() });
      if (option4) options.push({ id: uuidv4(), text: option4, votes: new Set<string>() });
      if (option5) options.push({ id: uuidv4(), text: option5, votes: new Set<string>() });
      
      // Create poll object
      const poll: Poll = {
        id: uuidv4(),
        question,
        options,
        creatorId: interaction.user.id,
        multipleVotes,
        totalVotes: 0
      };
      
      // Set end time if duration is specified
      if (duration) {
        poll.endTime = Date.now() + duration * 60 * 1000;
      }
      
      // Store poll
      activePolls.set(poll.id, poll);
      
      // Create poll embed
      const pollEmbed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle(`${statusEmojis.active} ${question}`)
        .setDescription('Vote by clicking the buttons below!')
        .setFooter({ 
          text: `Created by ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();
      
      // Add poll options to embed
      options.forEach((option, index) => {
        pollEmbed.addFields({
          name: `Option ${index + 1}`,
          value: `${option.text}\nVotes: 0 (0%)`,
          inline: false
        });
      });
      
      // Add poll info
      pollEmbed.addFields({
        name: '📊 Poll Info',
        value: `
        **Total Votes:** 0
        **Multiple Votes:** ${multipleVotes ? '✅ Yes' : '❌ No'}
        ${duration ? `**Duration:** ${duration} minutes` : '**Duration:** Until manually ended'}
        **Status:** Active`,
        inline: false
      });
      
      // Create vote buttons
      const buttons = new ActionRowBuilder<ButtonBuilder>();
      options.forEach((option, index) => {
        buttons.addComponents(
          new ButtonBuilder()
            .setCustomId(`poll_vote_${poll.id}_${option.id}`)
            .setLabel(`Option ${index + 1}`)
            .setStyle(ButtonStyle.Primary)
        );
      });
      
      // Add end poll button if creator
      if (interaction.user.id === poll.creatorId) {
        buttons.addComponents(
          new ButtonBuilder()
            .setCustomId(`poll_end_${poll.id}`)
            .setLabel('End Poll')
            .setStyle(ButtonStyle.Danger)
        );
      }
      
      // Send poll message
      const pollMessage = await interaction.reply({
        embeds: [pollEmbed],
        components: [buttons],
        fetchReply: true
      });
      
      // Set up collector for button interactions
      const collector = pollMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: duration ? duration * 60 * 1000 : undefined
      });
      
      collector.on('collect', async (i: ButtonInteraction) => {
        try {
          const [action, pollId, optionId] = i.customId.split('_');
          
          // Get poll
          const currentPoll = activePolls.get(pollId);
          if (!currentPoll) {
            await i.reply({ content: 'This poll no longer exists.', ephemeral: true });
            return;
          }
          
          if (action === 'poll_vote') {
            // Handle voting
            const option = currentPoll.options.find(opt => opt.id === optionId);
            if (!option) {
              await i.reply({ content: 'Invalid option.', ephemeral: true });
              return;
            }
            
            // Check if user already voted
            const hasVoted = option.votes.has(i.user.id);
            
            if (hasVoted) {
              // Remove vote
              option.votes.delete(i.user.id);
              currentPoll.totalVotes--;
              await i.reply({ content: 'Your vote has been removed.', ephemeral: true });
            } else {
              // Check if user can vote for multiple options
              if (!currentPoll.multipleVotes) {
                // Remove any existing votes
                currentPoll.options.forEach(opt => {
                  if (opt.votes.has(i.user.id)) {
                    opt.votes.delete(i.user.id);
                    currentPoll.totalVotes--;
                  }
                });
              }
              
              // Add vote
              option.votes.add(i.user.id);
              currentPoll.totalVotes++;
              await i.reply({ content: 'Your vote has been recorded.', ephemeral: true });
            }
            
            // Update poll embed
            const updatedEmbed = new EmbedBuilder()
              .setColor(COLORS.INFO)
              .setTitle(`${statusEmojis.active} ${currentPoll.question}`)
              .setDescription('Vote by clicking the buttons below!')
              .setFooter({ 
                text: `Created by ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL()
              })
              .setTimestamp();
            
            // Update options with vote counts and percentages
            currentPoll.options.forEach((opt, index) => {
              const percentage = currentPoll.totalVotes > 0 
                ? Math.round((opt.votes.size / currentPoll.totalVotes) * 100) 
                : 0;
              opt.percentage = percentage;
              
              updatedEmbed.addFields({
                name: `Option ${index + 1}`,
                value: `${opt.text}\nVotes: ${opt.votes.size} (${percentage}%)`,
                inline: false
              });
            });
            
            // Update poll info
            updatedEmbed.addFields({
              name: '📊 Poll Info',
              value: `
              **Total Votes:** ${currentPoll.totalVotes}
              **Multiple Votes:** ${currentPoll.multipleVotes ? '✅ Yes' : '❌ No'}
              ${duration ? `**Duration:** ${duration} minutes` : '**Duration:** Until manually ended'}
              **Status:** Active`,
              inline: false
            });
            
            await i.update({ embeds: [updatedEmbed] });
          } else if (action === 'poll_end' && i.user.id === currentPoll.creatorId) {
            // End poll
            currentPoll.endTime = Date.now();
            
            // Update poll embed
            const finalEmbed = new EmbedBuilder()
              .setColor(COLORS.SUCCESS)
              .setTitle(`${statusEmojis.ended} ${currentPoll.question}`)
              .setDescription('This poll has ended!')
              .setFooter({ 
                text: `Created by ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL()
              })
              .setTimestamp();
            
            // Add final results
            currentPoll.options.forEach((opt, index) => {
              const percentage = currentPoll.totalVotes > 0 
                ? Math.round((opt.votes.size / currentPoll.totalVotes) * 100) 
                : 0;
              
              finalEmbed.addFields({
                name: `Option ${index + 1}`,
                value: `${opt.text}\nVotes: ${opt.votes.size} (${percentage}%)`,
                inline: false
              });
            });
            
            // Add final poll info
            finalEmbed.addFields({
              name: '📊 Final Results',
              value: `
              **Total Votes:** ${currentPoll.totalVotes}
              **Multiple Votes:** ${currentPoll.multipleVotes ? '✅ Yes' : '❌ No'}
              **Status:** Ended`,
              inline: false
            });
            
            // Remove buttons
            await i.update({ 
              embeds: [finalEmbed],
              components: []
            });
            
            // Remove poll from active polls
            activePolls.delete(pollId);
          }
        } catch (error) {
          console.error('Error handling poll interaction:', error);
          await i.reply({ 
            content: 'An error occurred while processing your vote.',
            ephemeral: true 
          });
        }
      });
      
      collector.on('end', async () => {
        const currentPoll = activePolls.get(poll.id);
        if (!currentPoll || currentPoll.endTime) return;
        
        // Update poll embed
        const finalEmbed = new EmbedBuilder()
          .setColor(COLORS.SUCCESS)
          .setTitle(`${statusEmojis.ended} ${currentPoll.question}`)
          .setDescription('This poll has ended!')
          .setFooter({ 
            text: `Created by ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL()
          })
          .setTimestamp();
        
        // Add final results
        currentPoll.options.forEach((opt, index) => {
          const percentage = currentPoll.totalVotes > 0 
            ? Math.round((opt.votes.size / currentPoll.totalVotes) * 100) 
            : 0;
          
          finalEmbed.addFields({
            name: `Option ${index + 1}`,
            value: `${opt.text}\nVotes: ${opt.votes.size} (${percentage}%)`,
            inline: false
          });
        });
        
        // Add final poll info
        finalEmbed.addFields({
          name: '📊 Final Results',
          value: `
          **Total Votes:** ${currentPoll.totalVotes}
          **Multiple Votes:** ${currentPoll.multipleVotes ? '✅ Yes' : '❌ No'}
          **Status:** Ended`,
          inline: false
        });
        
        // Update message
        await interaction.editReply({ 
          embeds: [finalEmbed],
          components: []
        });
        
        // Remove poll from active polls
        activePolls.delete(poll.id);
      });
    } catch (error) {
      console.error('Error creating poll:', error);
      await interaction.reply({ 
        content: 'An error occurred while creating the poll.',
        ephemeral: true 
      });
    }
  },
  
  category: 'misc',
  cooldown: 10,
} as Command; 