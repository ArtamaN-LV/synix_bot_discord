import { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType, ChatInputCommandInteraction, User, GuildMember, ButtonInteraction, Collection, MessageComponentInteraction } from 'discord.js';
import { config } from '../../config';
import { Logger } from '../../utils/logger';
import { COLORS, BOT_NAME } from '../../utils/constants';

// Game state interface
interface TicTacToeGame {
    players: User[];
    board: string[][];
    currentTurn: number;
    message: any;
    isActive: boolean;
}

// Active games map (channelId -> game)
const activeGames = new Map<string, TicTacToeGame>();

export const data = new SlashCommandBuilder()
    .setName('tictactoe')
    .setDescription('Play a game of Tic Tac Toe with another user')
    .addUserOption(option =>
        option.setName('opponent')
            .setDescription('The user to play against')
            .setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        // Check if there's already an active game in the channel
        const channelId = interaction.channelId;
        if (activeGames.has(channelId)) {
            return interaction.reply({
                content: 'There is already an active Tic Tac Toe game in this channel. Please wait for it to finish.',
                ephemeral: true
            });
        }

        const challenger = interaction.user;
        const opponent = interaction.options.getUser('opponent');

        // Validation checks
        if (!opponent) {
            return interaction.reply({
                content: 'You need to specify an opponent to play against.',
                ephemeral: true
            });
        }

        if (opponent.id === challenger.id) {
            return interaction.reply({
                content: 'You cannot play against yourself!',
                ephemeral: true
            });
        }

        if (opponent.bot) {
            return interaction.reply({
                content: 'You cannot play against a bot!',
                ephemeral: true
            });
        }

        // Create initial embed
        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle('🎮 Tic Tac Toe Challenge')
            .setDescription(`${challenger} has challenged ${opponent} to a game of Tic Tac Toe!\n\n${opponent}, do you accept?`)
            .setFooter({ text: `${BOT_NAME} • Fun Commands`, iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        // Create accept/decline buttons
        const acceptButton = new ButtonBuilder()
            .setCustomId('accept')
            .setLabel('Accept')
            .setStyle(ButtonStyle.Success);

        const declineButton = new ButtonBuilder()
            .setCustomId('decline')
            .setLabel('Decline')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(acceptButton, declineButton);

        // Send initial message
        const response = await interaction.reply({
            embeds: [embed],
            components: [row],
            fetchReply: true
        });

        // Create collector for the accept/decline buttons
        const filter = (i: MessageComponentInteraction) => {
            i.deferUpdate().catch(() => {});
            return i.user.id === opponent.id;
        };

        const collector = response.createMessageComponentCollector({
            filter,
            componentType: ComponentType.Button,
            time: 30000
        });

        collector.on('collect', async (i: ButtonInteraction) => {
            if (i.customId === 'accept') {
                // Start the game
                await startGame(interaction, challenger, opponent, response);
                collector.stop('accepted');
            } else if (i.customId === 'decline') {
                // Update embed to show declined
                const declinedEmbed = new EmbedBuilder()
                    .setColor(COLORS.ERROR)
                    .setTitle('❌ Challenge Declined')
                    .setDescription(`${opponent} has declined the Tic Tac Toe challenge.`)
                    .setFooter({ text: `${BOT_NAME} • Fun Commands`, iconURL: interaction.client.user.displayAvatarURL() })
                    .setTimestamp();

                await interaction.editReply({
                    embeds: [declinedEmbed],
                    components: []
                });
                collector.stop('declined');
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                // If no response, update embed
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(COLORS.WARNING)
                    .setTitle('⏱️ Challenge Timed Out')
                    .setDescription(`${opponent} did not respond to the Tic Tac Toe challenge in time.`)
                    .setFooter({ text: `${BOT_NAME} • Fun Commands`, iconURL: interaction.client.user.displayAvatarURL() })
                    .setTimestamp();

                interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: []
                }).catch(error => Logger.error(`Error updating message: ${error}`));
            }
        });

    } catch (error) {
        Logger.error(`Error in tictactoe command: ${error}`);
        
        const errorEmbed = new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setTitle('Error')
            .setDescription('An error occurred while processing the command.')
            .setFooter({ text: `${BOT_NAME} • Fun Commands`, iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();
            
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ embeds: [errorEmbed], components: [] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
}

async function startGame(interaction: ChatInputCommandInteraction, player1: User, player2: User, message: any) {
    // Initialize the game
    const game: TicTacToeGame = {
        players: [player1, player2],
        board: [
            ['⬜', '⬜', '⬜'],
            ['⬜', '⬜', '⬜'],
            ['⬜', '⬜', '⬜']
        ],
        currentTurn: 0,  // Player 1 starts
        message: message,
        isActive: true
    };

    // Store the game
    activeGames.set(interaction.channelId, game);

    // Update the message with the game board
    await updateGameBoard(interaction, game);

    // Set up game buttons collector
    setupGameCollector(interaction, game);
}

async function updateGameBoard(interaction: ChatInputCommandInteraction, game: TicTacToeGame) {
    // Create the game board representation for the embed
    const boardRepresentation = game.board.map(row => row.join('')).join('\n');
    
    // Symbols for players
    const symbols = ['❌', '⭕'];
    
    // Create the game embed
    const gameEmbed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle('🎮 Tic Tac Toe')
        .setDescription(`${game.players[0]} (❌) vs ${game.players[1]} (⭕)\n\n${boardRepresentation}\n\n**Current Turn:** ${game.players[game.currentTurn]} (${symbols[game.currentTurn]})`)
        .setFooter({ text: `${BOT_NAME} • Fun Commands`, iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();

    // Create game buttons
    const rows = [];
    for (let i = 0; i < 3; i++) {
        const row = new ActionRowBuilder<ButtonBuilder>();
        for (let j = 0; j < 3; j++) {
            const button = new ButtonBuilder()
                .setCustomId(`cell_${i}_${j}`)
                .setStyle(ButtonStyle.Secondary);
            
            // Set label based on board state
            if (game.board[i][j] === '⬜') {
                button.setLabel('⬜');
            } else if (game.board[i][j] === '❌') {
                button.setLabel('❌').setStyle(ButtonStyle.Danger);
            } else if (game.board[i][j] === '⭕') {
                button.setLabel('⭕').setStyle(ButtonStyle.Primary);
            }
            
            // Disable button if cell is already occupied
            if (game.board[i][j] !== '⬜') {
                button.setDisabled(true);
            }
            
            row.addComponents(button);
        }
        rows.push(row);
    }

    // Add surrender button
    const surrenderButton = new ButtonBuilder()
        .setCustomId('surrender')
        .setLabel('Surrender')
        .setStyle(ButtonStyle.Danger);
    
    const controlRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(surrenderButton);
    
    rows.push(controlRow);

    // Update the message
    await interaction.editReply({
        embeds: [gameEmbed],
        components: rows
    });
}

function setupGameCollector(interaction: ChatInputCommandInteraction, game: TicTacToeGame) {
    const filter = (i: MessageComponentInteraction) => {
        // Check if it's a valid player's turn
        const isCurrentPlayer = i.user.id === game.players[game.currentTurn].id;
        
        // If surrender button pressed, any player can press it
        if (i.customId === 'surrender') {
            return game.players.some(player => player.id === i.user.id);
        }
        
        // For game moves, only current player can make them
        if (!isCurrentPlayer) {
            i.reply({ 
                content: "It's not your turn!", 
                ephemeral: true 
            }).catch(() => {});
            return false;
        }
        
        return true;
    };

    const collector = game.message.createMessageComponentCollector({
        filter,
        idle: 300000  // 5 minutes idle timeout
    });

    collector.on('collect', async (i: ButtonInteraction) => {
        await i.deferUpdate().catch(() => {});
        
        if (i.customId === 'surrender') {
            // Handle surrender
            const surrenderingPlayer = game.players.findIndex(player => player.id === i.user.id);
            const winner = game.players[1 - surrenderingPlayer]; // Other player
            
            endGame(interaction, game, winner, 'surrender');
            collector.stop();
            return;
        }
        
        // Parse cell coordinates from button ID
        const [_, row, col] = i.customId.split('_').map(Number);
        
        // Make the move
        game.board[row][col] = game.currentTurn === 0 ? '❌' : '⭕';
        
        // Check win condition
        const winner = checkWinner(game.board);
        if (winner) {
            const winningPlayer = winner === '❌' ? game.players[0] : game.players[1];
            endGame(interaction, game, winningPlayer, 'win');
            collector.stop();
            return;
        }
        
        // Check draw
        if (isBoardFull(game.board)) {
            endGame(interaction, game, null, 'draw');
            collector.stop();
            return;
        }
        
        // Switch turns
        game.currentTurn = 1 - game.currentTurn;
        
        // Update the game board
        await updateGameBoard(interaction, game);
    });

    collector.on('end', (collected: Collection<string, ButtonInteraction>, reason: string) => {
        if (reason === 'idle') {
            // Game timed out
            const timeoutEmbed = new EmbedBuilder()
                .setColor(COLORS.WARNING)
                .setTitle('⏱️ Game Timed Out')
                .setDescription('The Tic Tac Toe game has been abandoned due to inactivity.')
                .setFooter({ text: `${BOT_NAME} • Fun Commands`, iconURL: interaction.client.user.displayAvatarURL() })
                .setTimestamp();

            interaction.editReply({
                embeds: [timeoutEmbed],
                components: []
            }).catch(error => Logger.error(`Error updating message: ${error}`));
            
            // Clean up the game
            activeGames.delete(interaction.channelId);
        }
    });
}

function checkWinner(board: string[][]): string | null {
    // Check rows
    for (let i = 0; i < 3; i++) {
        if (board[i][0] !== '⬜' && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
            return board[i][0];
        }
    }
    
    // Check columns
    for (let j = 0; j < 3; j++) {
        if (board[0][j] !== '⬜' && board[0][j] === board[1][j] && board[1][j] === board[2][j]) {
            return board[0][j];
        }
    }
    
    // Check diagonals
    if (board[0][0] !== '⬜' && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
        return board[0][0];
    }
    
    if (board[0][2] !== '⬜' && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
        return board[0][2];
    }
    
    return null;
}

function isBoardFull(board: string[][]): boolean {
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[i][j] === '⬜') {
                return false;
            }
        }
    }
    return true;
}

async function endGame(interaction: ChatInputCommandInteraction, game: TicTacToeGame, winner: User | null, reason: 'win' | 'draw' | 'surrender') {
    // Create the final board representation
    const boardRepresentation = game.board.map(row => row.join('')).join('\n');
    
    let gameEmbed = new EmbedBuilder();
    
    if (reason === 'win') {
        gameEmbed
            .setColor(COLORS.SUCCESS)
            .setTitle('🎮 Tic Tac Toe - Game Over')
            .setDescription(`${game.players[0]} (❌) vs ${game.players[1]} (⭕)\n\n${boardRepresentation}\n\n**Winner:** ${winner} 🎉`)
            .setFooter({ text: `${BOT_NAME} • Fun Commands`, iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();
    } else if (reason === 'draw') {
        gameEmbed
            .setColor(COLORS.WARNING)
            .setTitle('🎮 Tic Tac Toe - Game Over')
            .setDescription(`${game.players[0]} (❌) vs ${game.players[1]} (⭕)\n\n${boardRepresentation}\n\n**Draw!** Nobody wins.`)
            .setFooter({ text: `${BOT_NAME} • Fun Commands`, iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();
    } else if (reason === 'surrender') {
        gameEmbed
            .setColor(COLORS.ERROR)
            .setTitle('🎮 Tic Tac Toe - Game Over')
            .setDescription(`${game.players[0]} (❌) vs ${game.players[1]} (⭕)\n\n${boardRepresentation}\n\n**${winner} wins!** Their opponent surrendered.`)
            .setFooter({ text: `${BOT_NAME} • Fun Commands`, iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();
    }
    
    // Update the message with final state
    await interaction.editReply({
        embeds: [gameEmbed],
        components: []
    });
    
    // Clean up the game
    activeGames.delete(interaction.channelId);
} 