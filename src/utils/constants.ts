/**
 * Constants used throughout the bot
 */

// Bot information
export const BOT_NAME = 'Synix Bot';
export const BOT_VERSION = '1.0.0';

// Colors for embeds (using numeric values for ColorResolvable compatibility)
export const COLORS = {
  PRIMARY: 0x5865F2,    // Discord blue
  SUCCESS: 0x57F287,    // Green
  WARNING: 0xFEE75C,    // Yellow  
  ERROR: 0xED4245,      // Red
  INFO: 0x5865F2,       // Blue
  SECONDARY: 0x99AAB5   // Grey
};

// Emoji IDs
export const EMOJIS = {
  SUCCESS: '✅',
  ERROR: '❌',
  INFO: 'ℹ️',
  WARNING: '⚠️'
};

// Cooldowns (in seconds)
export const COOLDOWNS = {
  DEFAULT: 3,
  ECONOMY: 10,
  DAILY: 86400 // 24 hours
};

// Max values
export const MAX_VALUES = {
  PURGE_MESSAGES: 100,
  POLL_OPTIONS: 10
};

export const BotInfo = {
  NAME: 'Synix Bot',
  VERSION: '1.0.0',
  FOOTER: 'Synix Bot • v1.0.0',
}; 