import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';

export = {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll one or more dice with specified number of sides')
    .addIntegerOption(option => 
      option
        .setName('sides')
        .setDescription('Number of sides on the die (default: 6)')
        .setMinValue(2)
        .setMaxValue(100)
    )
    .addIntegerOption(option => 
      option
        .setName('count')
        .setDescription('Number of dice to roll (default: 1)')
        .setMinValue(1)
        .setMaxValue(10)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      // Get options or use defaults
      const sides = interaction.options.getInteger('sides') || 6;
      const count = interaction.options.getInteger('count') || 1;
      
      // Roll the dice
      const rolls: number[] = [];
      let total = 0;
      
      for (let i = 0; i < count; i++) {
        const roll = Math.floor(Math.random() * sides) + 1;
        rolls.push(roll);
        total += roll;
      }
      
      // Create the embed
      const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle('🎲 Dice Roll')
        .setDescription(`Rolling ${count} ${sides}-sided ${count === 1 ? 'die' : 'dice'}...`)
        .addFields(
          { 
            name: '🎯 Results', 
            value: rolls.map((roll, index) => `Die ${index + 1}: **${roll}**`).join('\n'),
            inline: true 
          },
          { 
            name: '📊 Statistics', 
            value: `
            **Total:** ${total}
            **Average:** ${(total / count).toFixed(2)}
            **Highest:** ${Math.max(...rolls)}
            **Lowest:** ${Math.min(...rolls)}`,
            inline: true 
          }
        )
        .setFooter({ 
          text: `Rolled by ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in roll command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle('❌ Error')
        .setDescription('An error occurred while rolling the dice.')
        .setTimestamp();
      
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  },
  
  category: 'fun',
  cooldown: 3, // 3 seconds cooldown
} as Command; 