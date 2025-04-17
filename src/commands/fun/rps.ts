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

// Define choices and their emojis
const choices = {
  rock: { name: 'Rock', emoji: '🪨', beats: 'scissors' },
  paper: { name: 'Paper', emoji: '📄', beats: 'rock' },
  scissors: { name: 'Scissors', emoji: '✂️', beats: 'paper' }
};

export = {
  data: new SlashCommandBuilder()
    .setName('rps')
    .setDescription('Play rock-paper-scissors against the bot')
    .addStringOption(option => 
      option
        .setName('choice')
        .setDescription('Choose rock, paper, or scissors')
        .setRequired(false)
        .addChoices(
          { name: '🪨 Rock', value: 'rock' },
          { name: '📄 Paper', value: 'paper' },
          { name: '✂️ Scissors', value: 'scissors' }
        )
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      // Get the user's choice from the command option
      const userChoice = interaction.options.getString('choice');
      
      // If user provided a choice directly in the command
      if (userChoice) {
        const botChoice = getBotChoice();
        const result = determineWinner(userChoice, botChoice);
        
        // Create and send the result embed
        const resultEmbed = createResultEmbed(interaction.user.username, userChoice, botChoice, result);
        await interaction.reply({ embeds: [resultEmbed] });
        return;
      }
      
      // If no choice provided, create buttons for interactive play
      const rockButton = new ButtonBuilder()
        .setCustomId('rps_rock')
        .setLabel('Rock')
        .setEmoji('🪨')
        .setStyle(ButtonStyle.Primary);
        
      const paperButton = new ButtonBuilder()
        .setCustomId('rps_paper')
        .setLabel('Paper')
        .setEmoji('📄')
        .setStyle(ButtonStyle.Primary);
        
      const scissorsButton = new ButtonBuilder()
        .setCustomId('rps_scissors')
        .setLabel('Scissors')
        .setEmoji('✂️')
        .setStyle(ButtonStyle.Primary);
        
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(rockButton, paperButton, scissorsButton);
      
      // Create initial embed
      const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle('Rock Paper Scissors')
        .setDescription('Choose your move:')
        .setFooter({ text: BotInfo.FOOTER })
        .setTimestamp();
      
      // Send message with buttons
      const response = await interaction.reply({
        embeds: [embed],
        components: [row],
        fetchReply: true
      });
      
      // Create a collector for button interactions
      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000 // 30 seconds to make a choice
      });
      
      collector.on('collect', async (i) => {
        // Ensure only the command user can use the buttons
        if (i.user.id !== interaction.user.id) {
          await i.reply({
            content: 'This game is not for you. Start your own game with `/rps`.',
            ephemeral: true
          });
          return;
        }
        
        // Extract the choice from the button ID
        const userChoice = i.customId.split('_')[1];
        const botChoice = getBotChoice();
        const result = determineWinner(userChoice, botChoice);
        
        // Create and send the result embed
        const resultEmbed = createResultEmbed(interaction.user.username, userChoice, botChoice, result);
        
        // Update the message with the result and remove buttons
        await i.update({
          embeds: [resultEmbed],
          components: []
        });
        
        // Stop the collector
        collector.stop();
      });
      
      collector.on('end', async (collected, reason) => {
        // If no buttons were pressed, update the message
        if (reason === 'time' && collected.size === 0) {
          const timeoutEmbed = new EmbedBuilder()
            .setColor(COLORS.WARNING)
            .setTitle('Rock Paper Scissors - Game Over')
            .setDescription('You took too long to choose! Game cancelled.')
            .setFooter({ text: BotInfo.FOOTER })
            .setTimestamp();
          
          await interaction.editReply({
            embeds: [timeoutEmbed],
            components: []
          });
        }
      });
      
    } catch (error) {
      console.error('Error in RPS command:', error instanceof Error ? error.message : String(error));
      
      await interaction.reply({
        content: 'There was an error processing your game. Please try again.',
        ephemeral: true
      });
    }
  }
} as Command;

// Helper function to get a random bot choice
function getBotChoice(): string {
  const options = Object.keys(choices);
  const randomIndex = Math.floor(Math.random() * options.length);
  return options[randomIndex];
}

// Helper function to determine the winner
function determineWinner(userChoice: string, botChoice: string): 'win' | 'lose' | 'tie' {
  if (userChoice === botChoice) {
    return 'tie';
  }
  
  if (choices[userChoice as keyof typeof choices].beats === botChoice) {
    return 'win';
  }
  
  return 'lose';
}

// Helper function to create result embed
function createResultEmbed(username: string, userChoice: string, botChoice: string, result: 'win' | 'lose' | 'tie'): EmbedBuilder {
  const userChoiceData = choices[userChoice as keyof typeof choices];
  const botChoiceData = choices[botChoice as keyof typeof choices];
  
  let color: number;
  let resultText: string;
  
  switch (result) {
    case 'win':
      color = COLORS.SUCCESS;
      resultText = `${userChoiceData.emoji} beats ${botChoiceData.emoji}\n**You win!** 🎉`;
      break;
    case 'lose':
      color = COLORS.ERROR;
      resultText = `${botChoiceData.emoji} beats ${userChoiceData.emoji}\n**You lose!** 😔`;
      break;
    case 'tie':
      color = COLORS.INFO;
      resultText = `Both chose ${userChoiceData.emoji}\n**It's a tie!** 🤝`;
      break;
  }
  
  return new EmbedBuilder()
    .setColor(color)
    .setTitle('Rock Paper Scissors - Result')
    .addFields(
      { name: username, value: `${userChoiceData.emoji} ${userChoiceData.name}`, inline: true },
      { name: 'VS', value: '⚔️', inline: true },
      { name: 'Bot', value: `${botChoiceData.emoji} ${botChoiceData.name}`, inline: true },
      { name: 'Result', value: resultText, inline: false }
    )
    .setFooter({ text: BotInfo.FOOTER })
    .setTimestamp();
} 