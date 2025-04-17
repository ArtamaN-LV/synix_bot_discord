import { Collection } from 'discord.js';
import { Command } from '../interfaces/command';

// Extend the Discord.js types
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, Command>;
  }
} 