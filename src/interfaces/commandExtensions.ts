import { Message } from 'discord.js';
import { Command } from './command';

// Extend existing interface
declare module './command' {
  interface Command {
    textVerify?: (message: Message) => Promise<any>;
  }
} 