export class Logger {
  static info(message: string): void {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`);
  }

  static warn(message: string): void {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`);
  }

  static error(message: string | Error): void {
    if (message instanceof Error) {
      console.error(`[ERROR] [${new Date().toISOString()}] ${message.message}`);
      console.error(message.stack);
    } else {
      console.error(`[ERROR] [${new Date().toISOString()}] ${message}`);
    }
  }

  static command(userId: string, commandName: string, guildId?: string): void {
    this.info(`User ${userId} executed command ${commandName}${guildId ? ` in guild ${guildId}` : ''}`);
  }
} 