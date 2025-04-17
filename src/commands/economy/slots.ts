import { 
    SlashCommandBuilder, 
    ChatInputCommandInteraction,
    EmbedBuilder,
    Colors,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ButtonInteraction
} from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { EconomyService } from '../../services/EconomyService';
import { Logger } from '../../utils/logger';

const SLOTS_SYMBOLS = ['🍒', '🍊', '🍋', '🍇', '🍉', '7️⃣', '💎'];
const MULTIPLIERS = {
    '🍒': 50,
    '🍊': 100,
    '🍋': 200,
    '🍇': 300,
    '🍉': 500,
    '7️⃣': 1000,
    '💎': 5000
};

async function playSlots(interaction: ChatInputCommandInteraction | ButtonInteraction, bet?: number) {
    try {
        const userId = interaction.user.id;
        const isButtonInteraction = interaction instanceof ButtonInteraction;

        // Get user data
        const userData = await EconomyService.getUser(userId);
        
        // For button interaction, use the same bet amount
        const actualBet = isButtonInteraction ? bet! : interaction.options.getInteger('bet', true);
        
        // Check if user has enough money
        if (userData.wallet < actualBet) {
            return interaction.reply({
                embeds: [EmbedBuilderService.warning(`You don't have enough coins to place this bet! Your balance: ${userData.wallet} coins.`)],
                ephemeral: true
            });
        }

        // Deduct bet amount
        await EconomyService.removeMoney(userId, actualBet);

        // Generate slots result
        const slots = Array(3).fill(null).map(() => 
            SLOTS_SYMBOLS[Math.floor(Math.random() * SLOTS_SYMBOLS.length)]
        );

        // Calculate winnings
        let winnings = 0;
        let multiplier = 1;

        // Only win if all three symbols match (jackpot)
        if (slots.every(symbol => symbol === slots[0])) {
            multiplier = MULTIPLIERS[slots[0] as keyof typeof MULTIPLIERS];
            winnings = actualBet * multiplier;
        }

        // Update user's balance with winnings
        if (winnings > 0) {
            await EconomyService.addMoney(userId, winnings);
        }

        // Get updated user data
        const updatedUser = await EconomyService.getUser(userId);

        // Create embed
        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: `${interaction.user.username}'s Slots Game`, 
                iconURL: interaction.user.displayAvatarURL() 
            })
            .setTitle('🎰 Slots Machine')
            .setDescription(`**${slots.join(' | ')}**`)
            .setColor(winnings > 0 ? Colors.Green : Colors.Red)
            .addFields(
                { name: 'Bet', value: `${actualBet} coins`, inline: true },
                { name: 'Winnings', value: `${winnings} coins`, inline: true },
                { name: 'Multiplier', value: `x${multiplier}`, inline: true },
                { name: 'Net Profit/Loss', value: `${winnings - actualBet} coins`, inline: true },
                { name: 'New Balance', value: `${updatedUser.wallet} coins`, inline: true }
            )
            .setFooter({ text: winnings > 0 ? '🎉 Jackpot! Congratulations!' : 'Better luck next time!' })
            .setTimestamp();

        // Create play again button
        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`slots_play_${actualBet}`)
                    .setLabel('Play Again')
                    .setStyle(ButtonStyle.Primary)
            );

        if (isButtonInteraction) {
            return interaction.update({ embeds: [embed], components: [row] });
        } else {
            return interaction.reply({ embeds: [embed], components: [row] });
        }
    } catch (error) {
        Logger.error(`Error in slots command: ${error instanceof Error ? error.message : String(error)}`);
        return interaction.reply({
            embeds: [EmbedBuilderService.error('An error occurred while processing your slots game.')],
            ephemeral: true
        });
    }
}

export = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Play the slots machine')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(10)),
    
    async execute(interaction: ChatInputCommandInteraction) {
        return playSlots(interaction);
    },

    async handleButton(interaction: ButtonInteraction) {
        try {
            const [_, __, bet] = interaction.customId.split('_');
            return playSlots(interaction, parseInt(bet));
        } catch (error) {
            Logger.error(`Error handling slots button interaction: ${error instanceof Error ? error.message : String(error)}`);
            return interaction.reply({
                embeds: [EmbedBuilderService.error('An error occurred while processing your slots game.')],
                ephemeral: true
            });
        }
    },
    
    category: 'economy',
    cooldown: 0
} as Command;

