import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { COLORS, BotInfo } from '../../utils/constants';
import fetch from 'node-fetch';

// Define categories - these are just for reference
const categories = [
  { name: 'Any Category', value: '' },
  { name: 'General Knowledge', value: '9' },
  { name: 'Entertainment: Books', value: '10' },
  { name: 'Entertainment: Film', value: '11' },
  { name: 'Entertainment: Music', value: '12' },
  { name: 'Entertainment: Television', value: '14' },
  { name: 'Entertainment: Video Games', value: '15' },
  { name: 'Science & Nature', value: '17' },
  { name: 'Science: Computers', value: '18' },
  { name: 'Science: Mathematics', value: '19' },
  { name: 'Sports', value: '21' },
  { name: 'Geography', value: '22' },
  { name: 'History', value: '23' },
  { name: 'Animals', value: '27' }
];

// Define difficulty levels
const difficulties = [
  { name: 'Any Difficulty', value: '' },
  { name: 'Easy', value: 'easy' },
  { name: 'Medium', value: 'medium' },
  { name: 'Hard', value: 'hard' }
];

// Interface for Trivia API response
interface TriviaResponse {
  response_code: number;
  results: {
    category: string;
    type: string;
    difficulty: string;
    question: string;
    correct_answer: string;
    incorrect_answers: string[];
  }[];
}

export = {
  data: new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('Play a trivia game with random questions'),
  
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply();
      
      // Build API URL - use default settings for now
      let apiUrl = 'https://opentdb.com/api.php?amount=1&encode=url3986';
      
      // Fetch trivia question
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch trivia: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as TriviaResponse;
      
      if (data.response_code !== 0 || data.results.length === 0) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.ERROR)
              .setTitle('❌ No Questions Found')
              .setDescription('Sorry, no trivia questions found for the selected options.')
              .setFooter({ text: 'Try a different category or difficulty.' })
          ]
        });
        return;
      }
      
      const triviaData = data.results[0];
      
      // Decode the URL-encoded strings
      const question = decodeURIComponent(triviaData.question);
      const correctAnswer = decodeURIComponent(triviaData.correct_answer);
      const incorrectAnswers = triviaData.incorrect_answers.map(answer => decodeURIComponent(answer));
      
      // Create answers array and shuffle it
      const answers = [correctAnswer, ...incorrectAnswers];
      shuffleArray(answers);
      
      // Create and send the trivia embed
      const triviaEmbed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle('🎲 Trivia Time!')
        .setDescription(
          `**Category:** ${decodeURIComponent(triviaData.category)}\n` +
          `**Difficulty:** ${capitalizeFirstLetter(triviaData.difficulty)}\n\n` +
          `**Question:**\n${question}`
        )
        .setFooter({ 
          text: `${BotInfo.FOOTER} • You have 15 seconds to answer • ${interaction.user.tag}` 
        })
        .setTimestamp();
      
      // Create the buttons for answers
      const rows: ActionRowBuilder<ButtonBuilder>[] = [];
      
      if (triviaData.type === 'boolean') {
        // For true/false questions
        const row = new ActionRowBuilder<ButtonBuilder>();
        
        answers.forEach((answer, idx) => {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`trivia_${idx}`)
              .setLabel(answer)
              .setStyle(ButtonStyle.Primary)
              .setEmoji(answer === 'True' ? '✅' : '❌')
          );
        });
        
        rows.push(row);
      } else {
        // For multiple choice questions
        for (let i = 0; i < answers.length; i += 3) {
          const row = new ActionRowBuilder<ButtonBuilder>();
          
          // Add at most 3 buttons per row
          const rowAnswers = answers.slice(i, Math.min(i + 3, answers.length));
          
          rowAnswers.forEach((answer, rowIdx) => {
            const idx = i + rowIdx; // Calculate the overall index
            const emoji = ['🇦', '🇧', '🇨', '🇩', '🇪', '🇫'][idx];
            row.addComponents(
              new ButtonBuilder()
                .setCustomId(`trivia_${idx}`)
                .setLabel(answer)
                .setStyle(ButtonStyle.Primary)
                .setEmoji(emoji)
            );
          });
          
          rows.push(row);
        }
      }
      
      // Send the trivia question
      const reply = await interaction.editReply({
        embeds: [triviaEmbed],
        components: rows
      });
      
      // Set up a collector for button interactions
      const collector = reply.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id && i.customId.startsWith('trivia_'),
        time: 15000, // 15 seconds to answer
        max: 1
      });
      
      collector.on('collect', async (i) => {
        const selectedIdx = parseInt(i.customId.split('_')[1]);
        const selectedAnswer = answers[selectedIdx];
        const isCorrect = selectedAnswer === correctAnswer;
        
        // Update embed with result
        triviaEmbed
          .setColor(isCorrect ? COLORS.SUCCESS : COLORS.ERROR)
          .setTitle(isCorrect ? '🎉 Correct Answer!' : '❌ Wrong Answer!')
          .setDescription(
            `${triviaEmbed.data.description}\n\n` +
            `**Your answer:** ${selectedAnswer}\n` +
            `**Result:** ${isCorrect ? 'Correct! 🎉' : `Wrong! The correct answer was: ${correctAnswer}`}`
          );
        
        // Disable all buttons and update their styles
        const updatedRows: ActionRowBuilder<ButtonBuilder>[] = [];
        
        if (triviaData.type === 'boolean') {
          const newRow = new ActionRowBuilder<ButtonBuilder>();
          
          answers.forEach((answer, idx) => {
            const isSelected = idx === selectedIdx;
            const isCorrect = answer === correctAnswer;
            
            const button = new ButtonBuilder()
              .setCustomId(`trivia_${idx}`)
              .setLabel(answer)
              .setDisabled(true)
              .setEmoji(answer === 'True' ? '✅' : '❌')
              .setStyle(
                isCorrect ? ButtonStyle.Success : 
                (isSelected && !isCorrect) ? ButtonStyle.Danger : 
                ButtonStyle.Secondary
              );
            
            newRow.addComponents(button);
          });
          
          updatedRows.push(newRow);
        } else {
          // For multiple choice questions
          const chunks = [];
          for (let i = 0; i < answers.length; i += 3) {
            chunks.push(answers.slice(i, i + 3));
          }
          
          let currentIdx = 0;
          for (const chunk of chunks) {
            const newRow = new ActionRowBuilder<ButtonBuilder>();
            
            for (const answer of chunk) {
              const idx = currentIdx++;
              const isSelected = idx === selectedIdx;
              const isCorrect = answer === correctAnswer;
              const emoji = ['🇦', '🇧', '🇨', '🇩', '🇪', '🇫'][idx];
              
              const button = new ButtonBuilder()
                .setCustomId(`trivia_${idx}`)
                .setLabel(answer)
                .setDisabled(true)
                .setEmoji(emoji)
                .setStyle(
                  isCorrect ? ButtonStyle.Success : 
                  (isSelected && !isCorrect) ? ButtonStyle.Danger : 
                  ButtonStyle.Secondary
                );
              
              newRow.addComponents(button);
            }
            
            updatedRows.push(newRow);
          }
        }
        
        await i.update({ embeds: [triviaEmbed], components: updatedRows });
      });
      
      collector.on('end', async (collected) => {
        if (collected.size === 0) {
          // No answer was given
          triviaEmbed
            .setColor(COLORS.WARNING)
            .setTitle('⏰ Time\'s Up!')
            .setDescription(
              `${triviaEmbed.data.description}\n\n` +
              `**Time ran out!** The correct answer was: ${correctAnswer}`
            );
          
          // Disable all buttons
          const disabledRows = rows.map(row => {
            const newRow = new ActionRowBuilder<ButtonBuilder>();
            row.components.forEach(button => {
              newRow.addComponents(
                ButtonBuilder.from(button).setDisabled(true)
              );
            });
            return newRow;
          });
          
          await interaction.editReply({ embeds: [triviaEmbed], components: disabledRows });
        }
      });
    } catch (error) {
      console.error('Trivia error:', error);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setTitle('❌ Error')
            .setDescription('An error occurred while fetching the trivia question.')
            .setFooter({ text: 'Please try again later.' })
        ]
      });
    }
  }
} as Command;

// Helper function to shuffle an array
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Helper function to capitalize the first letter of a string
function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
} 