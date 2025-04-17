import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  Colors,
  User
} from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { EconomyService } from '../../services/EconomyService';

// Store cooldowns in memory
const cooldowns = new Map<string, number>();

export = {
  data: new SlashCommandBuilder()
    .setName('steal')
    .setDescription('Attempt to steal coins from another user')
    .addUserOption(option => 
      option
        .setName('user')
        .setDescription('The user to steal from')
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

      // Check cooldown
      const now = Date.now();
      const cooldownTime = 30 * 60 * 1000; // 30 minutes in milliseconds
      const cooldownKey = `${interaction.user.id}_${interaction.guild.id}`;
      
      if (cooldowns.has(cooldownKey)) {
        const expirationTime = cooldowns.get(cooldownKey)! + cooldownTime;
        if (now < expirationTime) {
          const timeLeft = Math.ceil((expirationTime - now) / 1000);
          const minutes = Math.floor(timeLeft / 60);
          const seconds = timeLeft % 60;
          return interaction.reply({
            embeds: [EmbedBuilderService.warning(`You must wait ${minutes}m ${seconds}s before attempting to steal again.`)],
            ephemeral: true
          });
        }
      }
      
      // Get the target user
      const targetUser = interaction.options.getUser('user', true);
      
      // Ensure user is not stealing from themselves
      if (targetUser.id === interaction.user.id) {
        return interaction.reply({
          embeds: [EmbedBuilderService.warning('You cannot steal from yourself.')],
          ephemeral: true
        });
      }

      // Ensure target is not a bot
      if (targetUser.bot) {
        return interaction.reply({
          embeds: [EmbedBuilderService.warning('You cannot steal from a bot.')],
          ephemeral: true
        });
      }
      
      // Await the response while we process
      await interaction.deferReply();
      
      // Get user and target data
      const [userData, targetData] = await Promise.all([
        EconomyService.getUser(interaction.user.id),
        EconomyService.getUser(targetUser.id)
      ]);
      
      // Calculate attempt fee based on user's level and target's money
      // Base fee: 200 coins
      // Additional fee based on target's wallet (0.5% of target's wallet)
      const baseFee = 200;
      const targetFee = Math.floor(targetData.wallet * 0.005);
      const attemptFee = baseFee + targetFee;
      
      if (userData.wallet < attemptFee) {
        return interaction.editReply({
          embeds: [EmbedBuilderService.warning(`You need at least ${attemptFee} coins to attempt stealing. Your balance: ${userData.wallet} coins.`)]
        });
      }
      
      // Check if target has any money
      if (targetData.wallet < 100) {
        return interaction.editReply({
          embeds: [EmbedBuilderService.warning(`${targetUser.username} doesn't have enough coins to steal from.`)]
        });
      }
      
      // Calculate success chance based on user's level and target's wallet
      // Base chance: 40%
      // Bonus chance based on user's level (up to +10%)
      // Penalty based on target's wallet size (up to -15%)
      const baseChance = 0.4;
      const levelBonus = Math.min(0.1, userData.level * 0.01); // 1% per level, max 10%
      const walletPenalty = Math.min(0.15, targetData.wallet / 1000000); // Penalty based on target's wallet size
      const successChance = baseChance + levelBonus - walletPenalty;
      
      // Calculate how much to steal
      // Base steal: 15-30% of target's wallet
      // Bonus based on user's level (up to +10%)
      const baseStealPercentage = Math.random() * 0.15 + 0.15;
      const levelStealBonus = Math.min(0.1, userData.level * 0.01); // 1% per level, max 10%
      const stealPercentage = baseStealPercentage + levelStealBonus;
      const stealAmount = Math.floor(targetData.wallet * stealPercentage);
      
      // Ensure minimum steal amount is 50
      const actualStealAmount = Math.max(50, Math.min(stealAmount, targetData.wallet));
      
      // Create base embed
      let embed = new EmbedBuilder()
        .setAuthor({ 
          name: `${interaction.user.username}'s Theft Attempt`, 
          iconURL: interaction.user.displayAvatarURL() 
        })
        .setTimestamp();
      
      if (Math.random() < successChance) {
        // Successful theft
        await Promise.all([
          EconomyService.removeMoney(targetUser.id, actualStealAmount),
          EconomyService.addMoney(interaction.user.id, actualStealAmount)
        ]);
        
        embed
          .setColor(Colors.Green)
          .setTitle('🥷 Successful Heist!')
          .setDescription(`You successfully stole **${actualStealAmount} coins** from ${targetUser.username}!`)
          .addFields(
            { name: 'Success Chance', value: `${Math.round(successChance * 100)}%`, inline: true },
            { name: 'Steal Percentage', value: `${Math.round(stealPercentage * 100)}%`, inline: true }
          )
          .setFooter({ text: 'The perfect crime!' });
      } else {
        // Failed theft (lose the attempt fee)
        await EconomyService.removeMoney(interaction.user.id, attemptFee);
        
        // Determine failure message
        const failureMessages = [
          `You were caught by ${targetUser.username} in the act!`,
          `${targetUser.username}'s pet scared you away!`,
          `You tripped an alarm while attempting to steal!`,
          `The guards spotted you before you could steal anything!`,
          `Your clumsy fingers couldn't grab the coins in time!`
        ];
        
        const randomMessage = failureMessages[Math.floor(Math.random() * failureMessages.length)];
        
        embed
          .setColor(Colors.Red)
          .setTitle('💔 Failed Heist!')
          .setDescription(`${randomMessage} You paid **${attemptFee} coins** in fines.`)
          .addFields(
            { name: 'Success Chance', value: `${Math.round(successChance * 100)}%`, inline: true },
            { name: 'Steal Percentage', value: `${Math.round(stealPercentage * 100)}%`, inline: true }
          )
          .setFooter({ text: 'Better luck next time, criminal!' });
      }
      
      // Get updated balances
      const [updatedUser, updatedTarget] = await Promise.all([
        EconomyService.getUser(interaction.user.id),
        EconomyService.getUser(targetUser.id)
      ]);
      
      embed.addFields(
        { name: 'Your Balance', value: `${updatedUser.wallet} coins`, inline: true },
        { name: `${targetUser.username}'s Balance`, value: `${updatedTarget.wallet} coins`, inline: true }
      );
      
      // Set cooldown after successful attempt
      cooldowns.set(cooldownKey, now);
      
      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in steal command:', error);
      
      return interaction.deferred
        ? interaction.editReply({ embeds: [EmbedBuilderService.error('An error occurred while processing your theft attempt.')] })
        : interaction.reply({ embeds: [EmbedBuilderService.error('An error occurred while processing your theft attempt.')], ephemeral: true });
    }
  },
  
  category: 'economy',
  cooldown: 1800, // 30 minute cooldown to prevent abuse
} as Command; 