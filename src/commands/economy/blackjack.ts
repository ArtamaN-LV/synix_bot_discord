import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  Message,
  MessageComponentInteraction,
  ColorResolvable
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { EconomyService } from '../../services/EconomyService';

interface Card {
  suit: string;
  value: string;
  points: number;
  emoji: string;
}

const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const CARD_EMOJIS = {
  'A': '🅰️', '2': '2️⃣', '3': '3️⃣', '4': '4️⃣', '5': '5️⃣', '6': '6️⃣', '7': '7️⃣', 
  '8': '8️⃣', '9': '9️⃣', '10': '🔟', 'J': '🇯', 'Q': '🇶', 'K': '🇰'
};
const POINTS = {
  'A': 11,
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 10, 'Q': 10, 'K': 10
};

class BlackjackGame {
  private deck: Card[];
  private playerHand: Card[];
  private dealerHand: Card[];
  private bet: number;
  private message: Message | null = null;
  private interaction: ChatInputCommandInteraction;
  private economyService: typeof EconomyService;
  private canSplit: boolean = false;
  private canInsure: boolean = false;
  private secondHand: Card[] | null = null;
  private isPlayingSecondHand: boolean = false;

  constructor(interaction: ChatInputCommandInteraction, bet: number) {
    this.interaction = interaction;
    this.bet = bet;
    this.economyService = EconomyService;
    this.deck = this.createDeck();
    this.playerHand = [];
    this.dealerHand = [];
  }

  private createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
      for (const value of VALUES) {
        deck.push({
          suit,
          value,
          points: POINTS[value as keyof typeof POINTS],
          emoji: CARD_EMOJIS[value as keyof typeof CARD_EMOJIS]
        });
      }
    }
    return this.shuffleDeck(deck);
  }

  private shuffleDeck(deck: Card[]): Card[] {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  private calculateHandValue(hand: Card[]): number {
    let value = hand.reduce((sum, card) => sum + card.points, 0);
    let aces = hand.filter(card => card.value === 'A').length;
    
    // Convert aces from 11 to 1 as needed
    while (value > 21 && aces > 0) {
      value -= 10; // Convert an ace from 11 to 1
      aces--;
    }
    
    // If we still have aces and value is less than 21, we can keep them as 11
    return value;
  }

  private formatCard(card: Card): string {
    return `${card.suit}${card.emoji}`;
  }

  private formatHand(hand: Card[], hideFirst: boolean = false): string {
    if (hideFirst) {
      return `${this.formatCard(hand[0])} 🃏`;
    }
    return hand.map(card => this.formatCard(card)).join(' ');
  }

  private async createGameEmbed(): Promise<EmbedBuilder> {
    const playerValue = this.calculateHandValue(this.playerHand);
    const dealerValue = this.calculateHandValue(this.dealerHand);

    return EmbedBuilderService.createEmbed({
      title: '🎮 Blackjack',
      color: COLORS.PRIMARY,
      description: '**Game Controls:**\n⬆️ Hit - Take another card\n🛑 Stand - Keep your current hand\n💵 Double - Double your bet and take one more card\n✂️ Split - Split your hand into two (if same value)\n🛡️ Insurance - Protect against dealer blackjack\n🏳️ Surrender - Give up half your bet',
      fields: [
        { name: '🎴 Your Hand', value: this.formatHand(this.playerHand), inline: true },
        { name: '📊 Your Total', value: `**${playerValue}**`, inline: true },
        { name: '\u200B', value: '\u200B' },
        { name: '🎴 Dealer\'s Hand', value: this.formatHand(this.dealerHand, true), inline: true },
        { name: '📊 Dealer\'s Total', value: '?', inline: true },
        { name: '\u200B', value: '\u200B' },
        { name: '💰 Current Bet', value: `**${this.bet} coins**`, inline: true }
      ],
      timestamp: true
    });
  }

  private createButtons(): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('hit')
          .setLabel('Hit')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('⬆️'),
        new ButtonBuilder()
          .setCustomId('stand')
          .setLabel('Stand')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🛑'),
        new ButtonBuilder()
          .setCustomId('double')
          .setLabel('Double')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('💵')
          .setDisabled(this.playerHand.length > 2)
      );

    if (this.canSplit) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('split')
          .setLabel('Split')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('✂️')
      );
    }

    if (this.canInsure) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('insurance')
          .setLabel('Insurance')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🛡️')
      );
    }

    row.addComponents(
      new ButtonBuilder()
        .setCustomId('surrender')
        .setLabel('Surrender')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🏳️')
    );

    return row;
  }

  async start(): Promise<void> {
    // Check if user has enough money
    const user = await this.economyService.getUser(this.interaction.user.id);
    if (user.wallet < this.bet) {
      await this.interaction.reply({
        embeds: [EmbedBuilderService.error('You don\'t have enough coins to place this bet!')],
        ephemeral: true
      });
      return;
    }

    // Deal initial cards
    this.playerHand = [this.deck.pop()!, this.deck.pop()!];
    this.dealerHand = [this.deck.pop()!, this.deck.pop()!];

    // Check for split possibility
    this.canSplit = this.playerHand[0].value === this.playerHand[1].value;
    
    // Check for insurance possibility
    this.canInsure = this.dealerHand[0].value === 'A';

    // Check for blackjack
    const playerValue = this.calculateHandValue(this.playerHand);
    if (playerValue === 21) {
      await this.handleBlackjack();
      return;
    }

    // Send initial game state
    const embed = await this.createGameEmbed();
    const buttons = this.createButtons();
    
    this.message = await this.interaction.reply({
      embeds: [embed],
      components: [buttons],
      fetchReply: true
    }) as Message;

    // Create collector for button interactions
    const collector = this.message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000 // 1 minute
    });

    collector.on('collect', async (i: MessageComponentInteraction) => {
      if (i.user.id !== this.interaction.user.id) {
        await i.reply({ content: 'This is not your game!', ephemeral: true });
        return;
      }

      switch (i.customId) {
        case 'hit':
          await this.handleHit(i);
          break;
        case 'stand':
          await this.handleStand(i);
          break;
        case 'double':
          await this.handleDouble(i);
          break;
        case 'split':
          await this.handleSplit(i);
          break;
        case 'insurance':
          await this.handleInsurance(i);
          break;
        case 'surrender':
          await this.handleSurrender(i);
          break;
      }
    });

    collector.on('end', async (collected, reason) => {
      // Only disable the Play Again button if the collector explicitly ended due to timeout.
      // If the reason is anything else (like manual stop), do nothing.
      if (reason === 'time') { 
          // Check if the message still exists and has the Play Again button before editing
          if (this.message) {
              try {
                  const currentMessage = await this.message.fetch();
                  // Check if the current components actually include the play_again button
                  const hasPlayAgain = currentMessage.components.some(row => 
                      row.components.some(component => component.customId === 'play_again' && !component.disabled)
                  );

                  if (hasPlayAgain) {
                      const disabledButton = new ButtonBuilder()
                        .setCustomId('play_again')
                        .setLabel('Play Again')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔄')
                        .setDisabled(true);
              
                      const disabledRow = new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(disabledButton);
              
                      await this.message.edit({ components: [disabledRow] });
                  }
              } catch (error) {
                  // Silently fail if we can't disable the button
              }
          }
      }
    });
  }

  private async handleHit(interaction: MessageComponentInteraction): Promise<void> {
    try {
      // Add new card to player's hand
      this.playerHand.push(this.deck.pop()!);
      const playerValue = this.calculateHandValue(this.playerHand);

      // Check for bust
      if (playerValue > 21) {
        await this.handleBust(interaction);
        return;
      }

      // Update the game state
      const embed = await this.createGameEmbed();
      const buttons = this.createButtons();
      
      try {
        // Try to update the message
        await interaction.update({ embeds: [embed], components: [buttons] });
      } catch (updateError) {
        // If update fails, try to send a new message
        console.error('Failed to update message:', updateError);
        await interaction.followUp({ 
          embeds: [embed], 
          components: [buttons],
          ephemeral: true 
        });
      }
    } catch (error) {
      console.error('Error handling hit:', error);
      // If we can't handle the hit at all, try to send a new message
      try {
        await interaction.followUp({ 
          content: 'There was an error processing your hit. Please try again.', 
          ephemeral: true 
        });
      } catch (followUpError) {
        console.error('Failed to send error message:', followUpError);
      }
    }
  }

  private async handleStand(interaction: MessageComponentInteraction): Promise<void> {
    // Dealer draws until 17 or higher
    while (this.calculateHandValue(this.dealerHand) < 17) {
      this.dealerHand.push(this.deck.pop()!);
    }

    await this.endGame(interaction);
  }

  private async handleDouble(interaction: MessageComponentInteraction): Promise<void> {
    const user = await this.economyService.getUser(this.interaction.user.id);
    if (user.wallet < this.bet) {
      await interaction.reply({
        embeds: [EmbedBuilderService.error('You don\'t have enough coins to double down!')],
        ephemeral: true
      });
      return;
    }

    this.bet *= 2;
    this.playerHand.push(this.deck.pop()!);
    await this.handleStand(interaction);
  }

  private async handleSplit(interaction: MessageComponentInteraction): Promise<void> {
    try {
      // Check if user has enough money to split
      const user = await this.economyService.getUser(this.interaction.user.id);
      if (user.wallet < this.bet) {
        await interaction.reply({
          embeds: [EmbedBuilderService.error('You don\'t have enough coins to split!')],
          ephemeral: true
        });
        return;
      }

      // Create two separate hands
      const firstHand = [this.playerHand[0], this.deck.pop()!];
      const secondHand = [this.playerHand[1], this.deck.pop()!];

      // Update the game state
      this.playerHand = firstHand;
      this.canSplit = false; // Can't split again

      const embed = EmbedBuilderService.createEmbed({
        title: '✂️ Split Hand',
        color: COLORS.INFO,
        description: 'You split your hand into two separate hands. Playing first hand now.',
        fields: [
          { name: '🎴 First Hand', value: this.formatHand(firstHand) },
          { name: '📊 First Hand Total', value: `**${this.calculateHandValue(firstHand)}**` },
          { name: '🎴 Second Hand', value: this.formatHand(secondHand) },
          { name: '📊 Second Hand Total', value: `**${this.calculateHandValue(secondHand)}**` },
          { name: '🎴 Dealer\'s Hand', value: this.formatHand(this.dealerHand, true) },
          { name: '💰 Current Bet (per hand)', value: `**${this.bet} coins**` }
        ],
        timestamp: true
      });

      await interaction.update({ embeds: [embed], components: [this.createButtons()] });

      // Store the second hand for later
      this.secondHand = secondHand;
      this.isPlayingSecondHand = false;

    } catch (error) {
      console.error('Error handling split:', error);
      await interaction.followUp({ 
        content: 'There was an error processing your split. Please try again.', 
        ephemeral: true 
      });
    }
  }

  private async handleInsurance(interaction: MessageComponentInteraction): Promise<void> {
    const insuranceBet = Math.floor(this.bet / 2);
    const user = await this.economyService.getUser(this.interaction.user.id);
    
    if (user.wallet < insuranceBet) {
      await interaction.reply({
        embeds: [EmbedBuilderService.error('You don\'t have enough coins for insurance!')],
        ephemeral: true
      });
      return;
    }

    await this.economyService.removeMoney(this.interaction.user.id, insuranceBet);
    
    if (this.calculateHandValue(this.dealerHand) === 21) {
      const winnings = insuranceBet * 2;
      await this.economyService.addMoney(this.interaction.user.id, winnings);
      await interaction.reply({
        embeds: [EmbedBuilderService.success(`Insurance paid out! You won ${winnings} coins.`)],
        ephemeral: true
      });
    } else {
      await interaction.reply({
        embeds: [EmbedBuilderService.warning('Insurance did not pay out.')],
        ephemeral: true
      });
    }
  }

  private async handleSurrender(interaction: MessageComponentInteraction): Promise<void> {
    const surrenderAmount = Math.floor(this.bet / 2);
    await this.economyService.removeMoney(this.interaction.user.id, surrenderAmount);
    
    // Get user's new balance
    const user = await this.economyService.getUser(this.interaction.user.id);

    const embed = EmbedBuilderService.createEmbed({
      title: '🏳️ Surrendered!',
      color: COLORS.WARNING,
      description: `You surrendered and lost ${surrenderAmount} coins.`,
      fields: [
        { name: '🎴 Your Hand', value: this.formatHand(this.playerHand) },
        { name: '📊 Your Total', value: `**${this.calculateHandValue(this.playerHand)}**` },
        { name: '🎴 Dealer\'s Hand', value: this.formatHand(this.dealerHand) },
        { name: '📊 Dealer\'s Total', value: `**${this.calculateHandValue(this.dealerHand)}**` },
        { name: '💰 New Balance', value: `**${user.wallet} coins**` }
      ],
      timestamp: true
    });

    try {
      await interaction.update({ embeds: [embed], components: [] });
    } catch (error) {
      console.error('Error updating surrender message:', error);
      await interaction.followUp({ embeds: [embed], ephemeral: true });
    }
  }

  private async handleBust(interaction: MessageComponentInteraction): Promise<void> {
    await this.economyService.removeMoney(this.interaction.user.id, this.bet);
    
    // Get user's new balance
    const user = await this.economyService.getUser(this.interaction.user.id);

    const embed = EmbedBuilderService.createEmbed({
      title: '💥 Bust!',
      color: COLORS.ERROR,
      description: `You went over 21 and lost ${this.bet} coins!`,
      fields: [
        { name: '🎴 Your Hand', value: this.formatHand(this.playerHand) },
        { name: '📊 Your Total', value: `**${this.calculateHandValue(this.playerHand)}**` },
        { name: '🎴 Dealer\'s Hand', value: this.formatHand(this.dealerHand) },
        { name: '📊 Dealer\'s Total', value: `**${this.calculateHandValue(this.dealerHand)}**` },
        { name: '💰 New Balance', value: `**${user.wallet} coins**` }
      ],
      timestamp: true
    });

    try {
      await interaction.update({ embeds: [embed], components: [] });
    } catch (error) {
      console.error('Error updating bust message:', error);
      await interaction.followUp({ embeds: [embed], ephemeral: true });
    }
  }

  private async handleBlackjack(interaction?: MessageComponentInteraction): Promise<void> {
    const dealerValue = this.calculateHandValue(this.dealerHand);
    let embed: EmbedBuilder;

    if (dealerValue === 21) {
      await this.economyService.addMoney(this.interaction.user.id, this.bet);
      
      embed = EmbedBuilderService.createEmbed({
        title: '🤝 Push!',
        color: COLORS.INFO,
        description: 'Both you and the dealer have blackjack! Your bet is returned.',
        fields: [
          { name: '🎴 Your Hand', value: this.formatHand(this.playerHand) },
          { name: '📊 Your Total', value: `**21**` },
          { name: '🎴 Dealer\'s Hand', value: this.formatHand(this.dealerHand) },
          { name: '📊 Dealer\'s Total', value: `**21**` }
        ],
        timestamp: true
      });
    } else {
      const winnings = Math.floor(this.bet * 2.5);
      await this.economyService.addMoney(this.interaction.user.id, winnings);
      
      embed = EmbedBuilderService.createEmbed({
        title: '🎉 Blackjack!',
        color: COLORS.SUCCESS,
        description: `You got a blackjack and won ${winnings} coins! (3:2 payout)`,
        fields: [
          { name: '🎴 Your Hand', value: this.formatHand(this.playerHand) },
          { name: '📊 Your Total', value: `**21**` },
          { name: '🎴 Dealer\'s Hand', value: this.formatHand(this.dealerHand) },
          { name: '📊 Dealer\'s Total', value: `**${dealerValue}**` }
        ],
        timestamp: true
      });
    }

    // If called from component interaction (Play Again), update it
    if (interaction) {
       // For blackjack, we should probably end the game and show Play Again
       const playAgainButton = new ButtonBuilder()
         .setCustomId('play_again')
         .setLabel('Play Again')
         .setStyle(ButtonStyle.Primary)
         .setEmoji('🔄');
       const row = new ActionRowBuilder<ButtonBuilder>().addComponents(playAgainButton);
       await interaction.editReply({ embeds: [embed], components: [row] });
       // Need to set up the collector for play_again again here, or refactor endGame call
    } else {
       // Original command interaction reply
       await this.interaction.reply({ embeds: [embed] });
    }
  }

  private async endGame(interaction: MessageComponentInteraction): Promise<void> {
    // If we have a second hand and haven't played it yet, switch to it
    if (this.secondHand && !this.isPlayingSecondHand) {
      this.isPlayingSecondHand = true;
      this.playerHand = this.secondHand;
      
      const embed = await this.createGameEmbed();
      await interaction.update({ embeds: [embed], components: [this.createButtons()] });
      return;
    }

    const playerValue = this.calculateHandValue(this.playerHand);
    const dealerValue = this.calculateHandValue(this.dealerHand);
    
    let result: string;
    let color: ColorResolvable;
    let winnings: number;
    let emoji: string;

    if (playerValue > 21) {
      result = '💥 Bust!';
      color = COLORS.ERROR;
      winnings = 0;
      emoji = '💥';
      await this.economyService.removeMoney(this.interaction.user.id, this.bet);
    }
    else if (dealerValue > 21) {
      result = '🎉 Dealer Bust!';
      color = COLORS.SUCCESS;
      winnings = this.bet * 2;
      emoji = '🎉';
      await this.economyService.addMoney(this.interaction.user.id, winnings);
    }
    else if (playerValue > dealerValue) {
      result = '🎉 You Win!';
      color = COLORS.SUCCESS;
      winnings = this.bet * 2;
      emoji = '🎉';
      await this.economyService.addMoney(this.interaction.user.id, winnings);
    }
    else if (playerValue === dealerValue) {
      result = '🤝 Push!';
      color = COLORS.INFO;
      winnings = this.bet;
      emoji = '🤝';
      await this.economyService.addMoney(this.interaction.user.id, winnings);
    }
    else {
      result = '💥 You Lose!';
      color = COLORS.ERROR;
      winnings = 0;
      emoji = '💥';
      await this.economyService.removeMoney(this.interaction.user.id, this.bet);
    }

    // Get user's new balance
    const user = await this.economyService.getUser(this.interaction.user.id);

    const embed = EmbedBuilderService.createEmbed({
      title: result,
      color,
      description: winnings > 0 ? 
        (playerValue === dealerValue ? 
          `${emoji} Push! Your bet of ${this.bet} coins is returned.` : 
          `${emoji} You won ${winnings} coins!`) : 
        `${emoji} You lost ${this.bet} coins!`,
      fields: [
        { name: '🎴 Your Hand', value: this.formatHand(this.playerHand) },
        { name: '📊 Your Total', value: `**${playerValue}**` },
        { name: '🎴 Dealer\'s Hand', value: this.formatHand(this.dealerHand) },
        { name: '📊 Dealer\'s Total', value: `**${dealerValue}**` },
        { name: '💰 New Balance', value: `**${user.wallet} coins**` }
      ],
      timestamp: true
    });

    try {
      await interaction.update({ embeds: [embed], components: [] });
    } catch (error) {
      console.error('Error updating game end message:', error);
      await interaction.followUp({ embeds: [embed], ephemeral: true });
    }
  }
}

export = {
  data: new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('Play a game of blackjack')
    .addIntegerOption(option =>
      option
        .setName('bet')
        .setDescription('Amount to bet')
        .setRequired(true)
        .setMinValue(1)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    const bet = interaction.options.getInteger('bet', true);
    const game = new BlackjackGame(interaction, bet);
    await game.start();
  },
  
  category: 'economy',
  cooldown: 5
} as Command; 