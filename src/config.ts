import dotenv from 'dotenv';
import { Logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Check if the required environment variables are present
if (!process.env.DISCORD_TOKEN) {
  Logger.error('DISCORD_TOKEN is not defined in .env file');
  process.exit(1);
}

if (!process.env.CLIENT_ID) {
  Logger.error('CLIENT_ID is not defined in .env file');
  process.exit(1);
}

export const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID, // Optional, used for development
  prefix: process.env.DEFAULT_PREFIX || '!',
  ownerId: process.env.BOT_OWNER_ID, // Optional, for owner-only commands
  logLevel: process.env.LOG_LEVEL || 'info',
  mongodb: {
    uri: process.env.MONGODB_URI,
  },
  // Add more configuration options as needed
}; 