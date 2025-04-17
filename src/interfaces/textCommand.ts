import { Message } from 'discord.js';

/**
 * Interface for text-based commands
 */
export interface TextCommand {
  /**
   * Execute the text command
   * @param message The message that triggered the command
   * @param args The command arguments
   */
  textExecute(message: Message, args: string[]): Promise<void>;
} 