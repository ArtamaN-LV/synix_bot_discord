import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';
import { EmbedBuilderService } from '../../utils/embedBuilder';

// Import type extensions
import '../../types/discord';

export = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the magic 8-ball a question')
    .addStringOption(option => 
      option.setName('question')
        .setDescription('The question you want to ask')
        .setRequired(true)),
  
  async execute(interaction: ChatInputCommandInteraction) {
    const question = interaction.options.getString('question', true);
    const user = interaction.user;
    
    // Array of possible 8-ball responses
    const responses = [
      // Positive responses
      'It is certain.',
      'It is decidedly so.',
      'Without a doubt.',
      'Yes, definitely.',
      'You may rely on it.',
      'As I see it, yes.',
      'Most likely.',
      'Outlook good.',
      'Yes.',
      'Signs point to yes.',
      // Neutral responses
      'Reply hazy, try again.',
      'Ask again later.',
      'Better not tell you now.',
      'Cannot predict now.',
      'Concentrate and ask again.',
      // Negative responses
      'Don\'t count on it.',
      'My reply is no.',
      'My sources say no.',
      'Outlook not so good.',
      'Very doubtful.'
    ];
    
    // Get a random response
    const response = responses[Math.floor(Math.random() * responses.length)];
    
    // Create the embed
    const ballEmbed = EmbedBuilderService.createEmbed()
      .setColor(COLORS.INFO)
      .setTitle('🎱 Magic 8-Ball')
      .addFields(
        { name: 'Question', value: question },
        { name: 'Answer', value: response }
      )
      .setFooter({ text: `Asked by ${user.tag}` })
      .setTimestamp();
    
    await interaction.reply({ embeds: [ballEmbed] });
  },
  
  category: 'fun',
  cooldown: 5, // 5 seconds cooldown
} as Command; 