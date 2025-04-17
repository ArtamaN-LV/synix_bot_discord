import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  Colors
} from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { EconomyService } from '../../services/EconomyService';

export = {
  data: new SlashCommandBuilder()
    .setName('gamble')
    .setDescription('Gamble your money for a chance to win more')
    .addIntegerOption(option => 
      option
        .setName('amount')
        .setDescription('The amount to gamble')
        .setMinValue(50)
        .setRequired(true)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      // Check if command is used in a guild
      if (!interaction.guild) {
        return interaction.reply({
          embeds: [EmbedBuilderService.error('This command can only be used in a server.')],
          ephemeral: true
        });
      }
      
      // Get the amount to gamble
      const amount = interaction.options.getInteger('amount', true);
      
      // Minimum bet is 50 coins
      if (amount < 50) {
        return interaction.reply({
          embeds: [EmbedBuilderService.warning('The minimum bet is 50 coins.')],
          ephemeral: true
        });
      }
      
      // Await the response while we process
      await interaction.deferReply();
      
      // Get user data
      const userData = await EconomyService.getUser(interaction.user.id);
      
      // Check if user has enough money
      if (userData.wallet < amount) {
        return interaction.editReply({
          embeds: [EmbedBuilderService.warning(`You don't have enough money. Your balance: ${userData.wallet} coins.`)]
        });
      }
      
      // Generate a random number between 0 and 100
      const chance = Math.random() * 100;
      let multiplier = 0;
      let outcome = '';
      
      // Determine the outcome based on chance
      if (chance < 40) {
        // 40% chance to lose everything
        multiplier = 0;
        outcome = 'You lost all your bet!';
      } else if (chance < 65) {
        // 25% chance to get half back
        multiplier = 0.5;
        outcome = 'You recovered half your bet!';
      } else if (chance < 85) {
        // 20% chance to win 1.5x
        multiplier = 1.5;
        outcome = 'You won 50% more!';
      } else if (chance < 95) {
        // 10% chance to win 2x
        multiplier = 2;
        outcome = 'You doubled your money!';
      } else {
        // 5% chance to win 3x
        multiplier = 3;
        outcome = 'Jackpot! You tripled your money!';
      }
      
      // Calculate winnings (or losses)
      const winnings = Math.floor(amount * multiplier);
      const profit = winnings - amount;
      
      // Process the transaction
      if (multiplier === 0) {
        // Lost everything
        await EconomyService.removeMoney(interaction.user.id, amount);
      } else if (multiplier < 1) {
        // Lost some (got some back)
        await EconomyService.removeMoney(interaction.user.id, amount - winnings);
      } else {
        // Won some amount
        await EconomyService.addMoney(interaction.user.id, profit);
      }
      
      // Get updated balance
      const updatedUser = await EconomyService.getUser(interaction.user.id);
      
      // Create embed based on result
      let embed = new EmbedBuilder()
        .setTitle('🎰 Gambling Results')
        .setDescription(`**${outcome}**`)
        .addFields(
          { name: 'Bet Amount', value: `${amount} coins`, inline: true },
          { name: 'Result', value: multiplier === 0 ? 'Loss' : (profit < 0 ? 'Partial Loss' : 'Win'), inline: true },
          { name: 'Winnings', value: `${winnings} coins`, inline: true },
          { name: 'Profit/Loss', value: `${profit >= 0 ? '+' : ''}${profit} coins`, inline: true },
          { name: 'New Balance', value: `${updatedUser.wallet} coins`, inline: true }
        )
        .setFooter({ 
          text: `Gambling is risky! Play responsibly.`,
          iconURL: interaction.user.displayAvatarURL() 
        })
        .setTimestamp();
      
      // Set color based on outcome
      if (multiplier === 0) {
        embed.setColor(Colors.Red);
      } else if (multiplier < 1) {
        embed.setColor(Colors.Yellow);
      } else {
        embed.setColor(Colors.Green);
      }
      
      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in gamble command:', error);
      
      return interaction.deferred
        ? interaction.editReply({ embeds: [EmbedBuilderService.error('An error occurred while processing your bet.')] })
        : interaction.reply({ embeds: [EmbedBuilderService.error('An error occurred while processing your bet.')], ephemeral: true });
    }
  },
  
  category: 'economy',
  cooldown: 30, // Longer cooldown for gambling
} as Command; 