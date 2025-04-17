import { SlashCommandBuilder, CommandInteraction, ChatInputCommandInteraction, ButtonInteraction } from 'discord.js';

export interface Command {
  data: SlashCommandBuilder | any;
  execute: (interaction: ChatInputCommandInteraction) => Promise<any>;
  handleButton?: (interaction: ButtonInteraction) => Promise<any>;
  category: string;
  cooldown?: number; // Cooldown in seconds
} 