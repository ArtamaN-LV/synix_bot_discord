import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  Collection, 
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  Message,
  InteractionResponse,
  MessageComponentInteraction,
  StringSelectMenuInteraction,
  MessageFlags
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';

// Import type extensions
import '../../types/discord';

// Category descriptions
const CATEGORY_DESCRIPTIONS = {
  utility: 'Essential tools and utilities for server management',
  moderation: 'Keep your server safe and organized with comprehensive moderation tools',
  fun: 'Games, entertainment, and interactive features for server engagement',
  economy: 'Earn, spend, and manage your virtual currency through games and activities',
  leveling: 'Progress, ranks, and achievements system to reward active members',
  misc: 'Additional features and utilities for server enhancement'
};

// Command details with syntax and options
interface CommandOption {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface BaseCommand {
  syntax: string;
  description: string;
  options: CommandOption[];
  category: string;
}

interface SubCommand extends BaseCommand {}

interface ModCommand extends Omit<BaseCommand, 'options'> {
  subcommands: {
    [key: string]: SubCommand;
  };
  category: string;
}

type CommandDetails = {
  [key: string]: BaseCommand | ModCommand;
};

// Function to create command details with category
function createCommandDetails(details: Omit<BaseCommand, 'category'> & { category: string }): BaseCommand {
  return {
    syntax: details.syntax,
    description: details.description,
    options: details.options,
    category: details.category
  };
}

// Function to create moderation command details
function createModCommandDetails(details: Omit<ModCommand, 'category'> & { category: string }): ModCommand {
  return {
    syntax: details.syntax,
    description: details.description,
    subcommands: details.subcommands,
    category: details.category
  };
}

const COMMAND_DETAILS: CommandDetails = {
  // Utility Commands
  help: createCommandDetails({
    syntax: '/help [command]',
    description: 'Get information about available commands or specific command details',
    options: [
      { name: 'command', type: 'String', required: false, description: 'The command to get details about' }
    ],
    category: 'utility'
  }),
  ping: createCommandDetails({
    syntax: '/ping',
    description: 'Check bot latency and connection status',
    options: [],
    category: 'utility'
  }),
  stats: createCommandDetails({
    syntax: '/stats',
    description: 'View detailed bot statistics and system information',
    options: [],
    category: 'utility'
  }),
  invite: createCommandDetails({
    syntax: '/invite',
    description: 'Get the bot\'s invite link and required permissions',
    options: [],
    category: 'utility'
  }),
  avatar: createCommandDetails({
    syntax: '/avatar [user]',
    description: 'View a user\'s avatar in high resolution',
    options: [
      { name: 'user', type: 'User', required: false, description: 'The user whose avatar to view' }
    ],
    category: 'utility'
  }),
  'embed-builder': createCommandDetails({
    syntax: '/embed-builder',
    description: 'Create and edit custom embeds with an interactive builder',
    options: [],
    category: 'utility'
  }),
  'embed-edit': createCommandDetails({
    syntax: '/embed-edit <message_id>',
    description: 'Edit an existing embed message',
    options: [
      { name: 'message_id', type: 'String', required: true, description: 'The ID of the message containing the embed to edit' }
    ],
    category: 'utility'
  }),
  statschannel: createCommandDetails({
    syntax: '/statschannel <action> [channel]',
    description: 'Manage server statistics channel',
    options: [
      { name: 'action', type: 'String', required: true, description: 'Action to perform (setup/disable)' },
      { name: 'channel', type: 'Channel', required: false, description: 'Channel to display stats in' }
    ],
    category: 'utility'
  }),
  prefix: createCommandDetails({
    syntax: '/prefix [new_prefix]',
    description: 'View or change the bot\'s prefix',
    options: [
      { name: 'new_prefix', type: 'String', required: false, description: 'New prefix to set' }
    ],
    category: 'utility'
  }),
  emojilist: createCommandDetails({
    syntax: '/emojilist',
    description: 'View all server emojis',
    options: [],
    category: 'utility'
  }),
  servericon: createCommandDetails({
    syntax: '/servericon',
    description: 'View the server\'s icon',
    options: [],
    category: 'utility'
  }),
  banner: createCommandDetails({
    syntax: '/banner [user]',
    description: 'View a user\'s banner',
    options: [
      { name: 'user', type: 'User', required: false, description: 'User to view banner for' }
    ],
    category: 'utility'
  }),
  roleinfo: createCommandDetails({
    syntax: '/roleinfo <role>',
    description: 'Get information about a role',
    options: [
      { name: 'role', type: 'Role', required: true, description: 'Role to get information about' }
    ],
    category: 'utility'
  }),
  channelinfo: createCommandDetails({
    syntax: '/channelinfo [channel]',
    description: 'Get information about a channel',
    options: [
      { name: 'channel', type: 'Channel', required: false, description: 'Channel to get information about' }
    ],
    category: 'utility'
  }),
  whois: createCommandDetails({
    syntax: '/whois [user]',
    description: 'Get detailed information about a user',
    options: [
      { name: 'user', type: 'User', required: false, description: 'User to get information about' }
    ],
    category: 'utility'
  }),
  serverinfo: createCommandDetails({
    syntax: '/serverinfo',
    description: 'Get detailed information about the server',
    options: [],
    category: 'utility'
  }),

  // Moderation Commands
  antihoist: createCommandDetails({
    syntax: '/antihoist <action> [user]',
    description: 'Manage anti-hoist settings for usernames',
    options: [
      { name: 'action', type: 'String', required: true, description: 'Action to perform (enable/disable)' },
      { name: 'user', type: 'User', required: false, description: 'User to apply action to' }
    ],
    category: 'moderation'
  }),
  autorole: createModCommandDetails({
    syntax: '/autorole <subcommand>',
    description: 'Manage automatic role assignment for new members',
    subcommands: {
      set: createCommandDetails({
        syntax: '/autorole set <role>',
        description: 'Set the role to be automatically assigned to new members',
        options: [
          { name: 'role', type: 'Role', required: true, description: 'The role to automatically assign' }
        ],
        category: 'moderation'
      }),
      remove: createCommandDetails({
        syntax: '/autorole remove',
        description: 'Remove the current autorole configuration',
        options: [],
        category: 'moderation'
      }),
      view: createCommandDetails({
        syntax: '/autorole view',
        description: 'View the current autorole configuration',
        options: [],
        category: 'moderation'
      })
    },
    category: 'moderation'
  }),
  moderation: createModCommandDetails({
    syntax: '/moderation <subcommand>',
    description: 'All moderation commands in one place',
    subcommands: {
      ban: createCommandDetails({
        syntax: '/moderation ban <user> [reason] [delete_messages] [days]',
        description: 'Ban a user from the server with optional message deletion',
        options: [
          { name: 'user', type: 'User', required: true, description: 'The user to ban' },
          { name: 'reason', type: 'String', required: false, description: 'Reason for the ban' },
          { name: 'delete_messages', type: 'Boolean', required: false, description: 'Whether to delete user messages' },
          { name: 'days', type: 'Integer', required: false, description: 'Number of days of messages to delete (0-7)' }
        ],
        category: 'moderation'
      }),
      unban: createCommandDetails({
        syntax: '/moderation unban <user_id> [reason]',
        description: 'Remove a user\'s ban from the server',
        options: [
          { name: 'user_id', type: 'String', required: true, description: 'ID of the user to unban' },
          { name: 'reason', type: 'String', required: false, description: 'Reason for the unban' }
        ],
        category: 'moderation'
      }),
      timeout: createCommandDetails({
        syntax: '/moderation timeout <user> <duration> [reason]',
        description: 'Temporarily restrict a user\'s ability to interact',
        options: [
          { name: 'user', type: 'User', required: true, description: 'The user to timeout' },
          { name: 'duration', type: 'String', required: true, description: 'Duration (e.g. 1h, 30m, 1d)' },
          { name: 'reason', type: 'String', required: false, description: 'Reason for the timeout' }
        ],
        category: 'moderation'
      }),
      cleartimeout: createCommandDetails({
        syntax: '/moderation cleartimeout <user> [reason]',
        description: 'Remove a timeout from a user',
        options: [
          { name: 'user', type: 'User', required: true, description: 'The user to remove timeout from' },
          { name: 'reason', type: 'String', required: false, description: 'Reason for removing timeout' }
        ],
        category: 'moderation'
      }),
      kick: createCommandDetails({
        syntax: '/moderation kick <user> [reason]',
        description: 'Remove a user from the server',
        options: [
          { name: 'user', type: 'User', required: true, description: 'The user to kick' },
          { name: 'reason', type: 'String', required: false, description: 'Reason for the kick' }
        ],
        category: 'moderation'
      }),
      nickname: createCommandDetails({
        syntax: '/moderation nickname <user> [nickname]',
        description: 'Change a user\'s nickname',
        options: [
          { name: 'user', type: 'User', required: true, description: 'The user to change nickname for' },
          { name: 'nickname', type: 'String', required: false, description: 'New nickname (empty to remove)' }
        ],
        category: 'moderation'
      }),
      clearchannel: createCommandDetails({
        syntax: '/moderation clearchannel <confirmation> [channel] [reason]',
        description: 'Clear all messages in a channel',
        options: [
          { name: 'confirmation', type: 'Boolean', required: true, description: 'Set to true to confirm this action' },
          { name: 'channel', type: 'Channel', required: false, description: 'The channel to clear (defaults to current channel)' },
          { name: 'reason', type: 'String', required: false, description: 'Reason for clearing the channel' }
        ],
        category: 'moderation'
      }),
      purge: createCommandDetails({
        syntax: '/moderation purge <amount> [user]',
        description: 'Delete multiple messages',
        options: [
          { name: 'amount', type: 'Integer', required: true, description: 'Number of messages to delete (1-100)' },
          { name: 'user', type: 'User', required: false, description: 'Delete messages from this user only' }
        ],
        category: 'moderation'
      })
    },
    category: 'moderation'
  }),
  removerole: createCommandDetails({
    syntax: '/removerole <user> <role> [reason]',
    description: 'Remove a role from a user',
    options: [
      { name: 'user', type: 'User', required: true, description: 'The user to remove the role from' },
      { name: 'role', type: 'Role', required: true, description: 'The role to remove' },
      { name: 'reason', type: 'String', required: false, description: 'Reason for removing the role' }
    ],
    category: 'moderation'
  }),
  role: createCommandDetails({
    syntax: '/role <user> <role> [reason]',
    description: 'Add a role to a user',
    options: [
      { name: 'user', type: 'User', required: true, description: 'The user to add the role to' },
      { name: 'role', type: 'Role', required: true, description: 'The role to add' },
      { name: 'reason', type: 'String', required: false, description: 'Reason for adding the role' }
    ],
    category: 'moderation'
  }),
  verify: createCommandDetails({
    syntax: '/verify <user>',
    description: 'Verify a user in the server',
    options: [
      { name: 'user', type: 'User', required: true, description: 'The user to verify' }
    ],
    category: 'moderation'
  }),
  antispam: createModCommandDetails({
    syntax: '/antispam <subcommand>',
    description: 'Configure anti-spam protection for the server',
    subcommands: {
      enable: createCommandDetails({
        syntax: '/antispam enable [threshold] [timewindow]',
        description: 'Enable anti-spam protection with custom settings',
        options: [
          { name: 'threshold', type: 'Integer', required: false, description: 'Number of messages in time window to trigger' },
          { name: 'timewindow', type: 'Integer', required: false, description: 'Time window in seconds' }
        ],
        category: 'moderation'
      }),
      disable: createCommandDetails({
        syntax: '/antispam disable',
        description: 'Disable anti-spam protection',
        options: [],
        category: 'moderation'
      }),
      settings: createCommandDetails({
        syntax: '/antispam settings',
        description: 'View current anti-spam settings',
        options: [],
        category: 'moderation'
      })
    },
    category: 'moderation'
  }),
  antinuke: createModCommandDetails({
    syntax: '/antinuke <subcommand>',
    description: 'Configure anti-nuke protection for the server',
    subcommands: {
      enable: createCommandDetails({
        syntax: '/antinuke enable [channelthreshold] [rolethreshold] [timewindow]',
        description: 'Enable anti-nuke protection with custom settings',
        options: [
          { name: 'channelthreshold', type: 'Integer', required: false, description: 'Number of channels that can be deleted in time window' },
          { name: 'rolethreshold', type: 'Integer', required: false, description: 'Number of roles that can be deleted in time window' },
          { name: 'timewindow', type: 'Integer', required: false, description: 'Time window in seconds' }
        ],
        category: 'moderation'
      }),
      disable: createCommandDetails({
        syntax: '/antinuke disable',
        description: 'Disable anti-nuke protection',
        options: [],
        category: 'moderation'
      }),
      settings: createCommandDetails({
        syntax: '/antinuke settings',
        description: 'View current anti-nuke settings',
        options: [],
        category: 'moderation'
      })
    },
    category: 'moderation'
  }),
  antighostping: createModCommandDetails({
    syntax: '/antighostping <subcommand>',
    description: 'Configure anti-ghost-ping detection for the server',
    subcommands: {
      enable: createCommandDetails({
        syntax: '/antighostping enable [timewindow]',
        description: 'Enable anti-ghost-ping detection with custom settings',
        options: [
          { name: 'timewindow', type: 'Integer', required: false, description: 'Time window in seconds to detect ghost pings' }
        ],
        category: 'moderation'
      }),
      disable: createCommandDetails({
        syntax: '/antighostping disable',
        description: 'Disable anti-ghost-ping detection',
        options: [],
        category: 'moderation'
      }),
      settings: createCommandDetails({
        syntax: '/antighostping settings',
        description: 'View current anti-ghost-ping settings',
        options: [],
        category: 'moderation'
      })
    },
    category: 'moderation'
  }),
  blacklist: createModCommandDetails({
    syntax: '/blacklist <subcommand>',
    description: 'Manage blacklisted words in the server',
    subcommands: {
      add: createCommandDetails({
        syntax: '/blacklist add <word> <action>',
        description: 'Add a word to the blacklist with specified action',
        options: [
          { name: 'word', type: 'String', required: true, description: 'The word to blacklist' },
          { name: 'action', type: 'String', required: true, description: 'Action to take when word is detected' }
        ],
        category: 'moderation'
      }),
      remove: createCommandDetails({
        syntax: '/blacklist remove <word>',
        description: 'Remove a word from the blacklist',
        options: [
          { name: 'word', type: 'String', required: true, description: 'The word to remove from blacklist' }
        ],
        category: 'moderation'
      }),
      list: createCommandDetails({
        syntax: '/blacklist list',
        description: 'View all blacklisted words',
        options: [],
        category: 'moderation'
      })
    },
    category: 'moderation'
  }),
  customcommand: createModCommandDetails({
    syntax: '/customcommand <subcommand>',
    description: 'Manage custom commands for the server',
    subcommands: {
      create: createCommandDetails({
        syntax: '/customcommand create <name> <response>',
        description: 'Create a new custom command',
        options: [
          { name: 'name', type: 'String', required: true, description: 'The name of the command' },
          { name: 'response', type: 'String', required: true, description: 'The response of the command' }
        ],
        category: 'moderation'
      }),
      edit: createCommandDetails({
        syntax: '/customcommand edit <name> <response>',
        description: 'Edit an existing custom command',
        options: [
          { name: 'name', type: 'String', required: true, description: 'The name of the command to edit' },
          { name: 'response', type: 'String', required: true, description: 'The new response of the command' }
        ],
        category: 'moderation'
      }),
      delete: createCommandDetails({
        syntax: '/customcommand delete <name>',
        description: 'Delete a custom command',
        options: [
          { name: 'name', type: 'String', required: true, description: 'The name of the command to delete' }
        ],
        category: 'moderation'
      }),
      list: createCommandDetails({
        syntax: '/customcommand list',
        description: 'View all custom commands',
        options: [],
        category: 'moderation'
      })
    },
    category: 'moderation'
  }),

  // Fun Commands
  '8ball': createCommandDetails({
    syntax: '/8ball <question>',
    description: 'Ask the magic 8-ball a question',
    options: [
      { name: 'question', type: 'String', required: true, description: 'The question to ask' }
    ],
    category: 'fun'
  }),
  joke: createCommandDetails({
    syntax: '/joke [category]',
    description: 'Get a random joke',
    options: [
      { name: 'category', type: 'String', required: false, description: 'Category of joke' }
    ],
    category: 'fun'
  }),
  roll: createCommandDetails({
    syntax: '/roll [dice] [sides]',
    description: 'Roll one or more dice',
    options: [
      { name: 'dice', type: 'Integer', required: false, description: 'Number of dice to roll' },
      { name: 'sides', type: 'Integer', required: false, description: 'Number of sides per die' }
    ],
    category: 'fun'
  }),
  roast: createCommandDetails({
    syntax: '/roast <user>',
    description: 'Generate a light-hearted roast for someone',
    options: [
      { name: 'user', type: 'User', required: true, description: 'The user to roast' }
    ],
    category: 'fun'
  }),
  rps: createCommandDetails({
    syntax: '/rps <choice>',
    description: 'Play rock-paper-scissors against the bot',
    options: [
      { name: 'choice', type: 'String', required: true, description: 'Your choice (rock/paper/scissors)' }
    ],
    category: 'fun'
  }),
  tictactoe: createCommandDetails({
    syntax: '/tictactoe <opponent>',
    description: 'Start a game of tic-tac-toe',
    options: [
      { name: 'opponent', type: 'User', required: true, description: 'The user to play against' }
    ],
    category: 'fun'
  }),
  ascii: createCommandDetails({
    syntax: '/ascii <text> [font]',
    description: 'Convert text to ASCII art',
    options: [
      { name: 'text', type: 'String', required: true, description: 'Text to convert' },
      { name: 'font', type: 'String', required: false, description: 'Font style to use' }
    ],
    category: 'fun'
  }),
  cat: createCommandDetails({
    syntax: '/cat',
    description: 'Get a random cat image',
    options: [],
    category: 'fun'
  }),
  dog: createCommandDetails({
    syntax: '/dog [breed] [fact]',
    description: 'Get a random dog image',
    options: [
      { name: 'breed', type: 'String', required: false, description: 'Specific dog breed' },
      { name: 'fact', type: 'Boolean', required: false, description: 'Include a fun fact' }
    ],
    category: 'fun'
  }),
  trivia: createCommandDetails({
    syntax: '/trivia [category] [difficulty]',
    description: 'Play a trivia game',
    options: [
      { name: 'category', type: 'String', required: false, description: 'Trivia category' },
      { name: 'difficulty', type: 'String', required: false, description: 'Question difficulty (easy/medium/hard)' }
    ],
    category: 'fun'
  }),
  meme: createCommandDetails({
    syntax: '/meme [subreddit]',
    description: 'Get a random meme',
    options: [
      { name: 'subreddit', type: 'String', required: false, description: 'Specific subreddit to get memes from' }
    ],
    category: 'fun'
  }),
  coinflip: createCommandDetails({
    syntax: '/coinflip',
    description: 'Flip a coin',
    options: [],
    category: 'fun'
  }),
  fact: createCommandDetails({
    syntax: '/fact [category]',
    description: 'Get a random fact',
    options: [
      { name: 'category', type: 'String', required: false, description: 'Category of fact' }
    ],
    category: 'fun'
  }),
  quote: createCommandDetails({
    syntax: '/quote [category]',
    description: 'Get a random quote',
    options: [
      { name: 'category', type: 'String', required: false, description: 'Category of quote' }
    ],
    category: 'fun'
  }),

  // Economy Commands
  slots: createCommandDetails({
    syntax: '/slots <bet>',
    description: 'Play the slot machine',
    options: [
      { name: 'bet', type: 'Integer', required: true, description: 'Amount to bet' }
    ],
    category: 'economy'
  }),
  give: createCommandDetails({
    syntax: '/give <user> <amount>',
    description: 'Give currency to another user',
    options: [
      { name: 'user', type: 'User', required: true, description: 'User to give currency to' },
      { name: 'amount', type: 'Integer', required: true, description: 'Amount to give' }
    ],
    category: 'economy'
  }),
  blackjack: createCommandDetails({
    syntax: '/blackjack <bet>',
    description: 'Play a game of blackjack',
    options: [
      { name: 'bet', type: 'Integer', required: true, description: 'Amount to bet' }
    ],
    category: 'economy'
  }),
  balance: createCommandDetails({
    syntax: '/balance [user]',
    description: 'Check currency balance',
    options: [
      { name: 'user', type: 'User', required: false, description: 'User to check balance for' }
    ],
    category: 'economy'
  }),
  work: createCommandDetails({
    syntax: '/work',
    description: 'Work to earn currency',
    options: [],
    category: 'economy'
  }),
  shop: createCommandDetails({
    syntax: '/shop [item]',
    description: 'View shop or item details',
    options: [
      { name: 'item', type: 'String', required: false, description: 'Item to view details for' }
    ],
    category: 'economy'
  }),
  buy: createCommandDetails({
    syntax: '/buy <item> [quantity]',
    description: 'Purchase items from the shop',
    options: [
      { name: 'item', type: 'String', required: true, description: 'Item to purchase' },
      { name: 'quantity', type: 'Integer', required: false, description: 'Amount to buy (default: 1)' }
    ],
    category: 'economy'
  }),
  sell: createCommandDetails({
    syntax: '/sell <item> [quantity]',
    description: 'Sell items from your inventory',
    options: [
      { name: 'item', type: 'String', required: true, description: 'Item to sell' },
      { name: 'quantity', type: 'Integer', required: false, description: 'Amount to sell (default: 1)' }
    ],
    category: 'economy'
  }),
  inventory: createCommandDetails({
    syntax: '/inventory [user]',
    description: 'View your or another user\'s inventory',
    options: [
      { name: 'user', type: 'User', required: false, description: 'User to check inventory for' }
    ],
    category: 'economy'
  }),
  steal: createCommandDetails({
    syntax: '/steal <user>',
    description: 'Attempt to steal money from another user',
    options: [
      { name: 'user', type: 'User', required: true, description: 'User to steal from' }
    ],
    category: 'economy'
  }),
  gamble: createCommandDetails({
    syntax: '/gamble <amount>',
    description: 'Gamble your money for a chance to win more',
    options: [
      { name: 'amount', type: 'Integer', required: true, description: 'Amount to gamble' }
    ],
    category: 'economy'
  }),
  daily: createCommandDetails({
    syntax: '/daily',
    description: 'Claim your daily reward',
    options: [],
    category: 'economy'
  }),
  deposit: createCommandDetails({
    syntax: '/deposit <amount>',
    description: 'Deposit money into your bank',
    options: [
      { name: 'amount', type: 'Integer', required: true, description: 'Amount to deposit' }
    ],
    category: 'economy'
  }),
  withdraw: createCommandDetails({
    syntax: '/withdraw <amount>',
    description: 'Withdraw money from your bank',
    options: [
      { name: 'amount', type: 'Integer', required: true, description: 'Amount to withdraw' }
    ],
    category: 'economy'
  }),
  job: createCommandDetails({
    syntax: '/job',
    description: 'View or change your current job',
    options: [],
    category: 'economy'
  }),
  joblist: createCommandDetails({
    syntax: '/joblist',
    description: 'View all available jobs',
    options: [],
    category: 'economy'
  }),
  leaderboard: createCommandDetails({
    syntax: '/leaderboard',
    description: 'View the economy leaderboard',
    options: [],
    category: 'economy'
  }),

  // Leveling Commands
  rank: createCommandDetails({
    syntax: '/rank [user]',
    description: 'View rank and XP progress',
    options: [
      { name: 'user', type: 'User', required: false, description: 'User to check rank for' }
    ],
    category: 'leveling'
  }),
  levelinfo: createCommandDetails({
    syntax: '/levelinfo [level]',
    description: 'Get information about levels',
    options: [
      { name: 'level', type: 'Integer', required: false, description: 'Specific level to view' }
    ],
    category: 'leveling'
  }),
  xp: createCommandDetails({
    syntax: '/xp [user]',
    description: 'Check detailed XP information',
    options: [
      { name: 'user', type: 'User', required: false, description: 'User to check XP for' }
    ],
    category: 'leveling'
  }),
  toplevel: createCommandDetails({
    syntax: '/toplevel',
    description: 'View the top leveled users in the server',
    options: [],
    category: 'leveling'
  }),
  levelup: createCommandDetails({
    syntax: '/levelup',
    description: 'View your next level progress',
    options: [],
    category: 'leveling'
  }),
  levelrole: createCommandDetails({
    syntax: '/levelrole <role> <level>',
    description: 'Set a role to be given at a specific level',
    options: [
      { name: 'role', type: 'Role', required: true, description: 'Role to give at specified level' },
      { name: 'level', type: 'Integer', required: true, description: 'Level required to get the role' }
    ],
    category: 'leveling'
  }),
  levelset: createCommandDetails({
    syntax: '/levelset <user> <level>',
    description: 'Set a user\'s level',
    options: [
      { name: 'user', type: 'User', required: true, description: 'User to set level for' },
      { name: 'level', type: 'Integer', required: true, description: 'Level to set' }
    ],
    category: 'leveling'
  }),
  resetxp: createCommandDetails({
    syntax: '/resetxp <user>',
    description: 'Reset a user\'s XP and level',
    options: [
      { name: 'user', type: 'User', required: true, description: 'User to reset XP for' }
    ],
    category: 'leveling'
  }),
  xpboost: createCommandDetails({
    syntax: '/xpboost <multiplier> [duration]',
    description: 'Set an XP boost for the server',
    options: [
      { name: 'multiplier', type: 'Number', required: true, description: 'XP multiplier (e.g. 1.5 for 50% boost)' },
      { name: 'duration', type: 'String', required: false, description: 'Duration of boost (e.g. 1h, 30m, 1d)' }
    ],
    category: 'leveling'
  }),

  // Miscellaneous Commands
  poll: createCommandDetails({
    syntax: '/poll <question> <option1> <option2> [option3] [option4] [option5] [multiple_votes] [duration]',
    description: 'Create a poll',
    options: [
      { name: 'question', type: 'String', required: true, description: 'Poll question' },
      { name: 'option1', type: 'String', required: true, description: 'First option' },
      { name: 'option2', type: 'String', required: true, description: 'Second option' },
      { name: 'option3', type: 'String', required: false, description: 'Third option' },
      { name: 'option4', type: 'String', required: false, description: 'Fourth option' },
      { name: 'option5', type: 'String', required: false, description: 'Fifth option' },
      { name: 'multiple_votes', type: 'Boolean', required: false, description: 'Allow multiple votes' },
      { name: 'duration', type: 'String', required: false, description: 'Poll duration' }
    ],
    category: 'misc'
  }),
  ticket: createCommandDetails({
    syntax: '/ticket <action> [user] [reason]',
    description: 'Manage support tickets',
    options: [
      { name: 'action', type: 'String', required: true, description: 'Action (create/close/add)' },
      { name: 'user', type: 'User', required: false, description: 'User to add to ticket' },
      { name: 'reason', type: 'String', required: false, description: 'Reason for action' }
    ],
    category: 'misc'
  }),
  suggest: createCommandDetails({
    syntax: '/suggest <suggestion>',
    description: 'Submit a suggestion',
    options: [
      { name: 'suggestion', type: 'String', required: true, description: 'Your suggestion' }
    ],
    category: 'misc'
  }),
  remind: createCommandDetails({
    syntax: '/remind <time> <message>',
    description: 'Set a reminder for yourself',
    options: [
      { name: 'time', type: 'String', required: true, description: 'When to remind (e.g. 1h, 30m, tomorrow)' },
      { name: 'message', type: 'String', required: true, description: 'Reminder message' }
    ],
    category: 'misc'
  }),
  weather: createCommandDetails({
    syntax: '/weather <location>',
    description: 'Get weather information for a location',
    options: [
      { name: 'location', type: 'String', required: true, description: 'City or location to check weather for' }
    ],
    category: 'misc'
  }),
  translate: createCommandDetails({
    syntax: '/translate <text> [target_language]',
    description: 'Translate text to another language',
    options: [
      { name: 'text', type: 'String', required: true, description: 'Text to translate' },
      { name: 'target_language', type: 'String', required: false, description: 'Language to translate to' }
    ],
    category: 'misc'
  }),
  steelemoji: createCommandDetails({
    syntax: '/steelemoji <emoji>',
    description: 'Steal an emoji from another server',
    options: [
      { name: 'emoji', type: 'String', required: true, description: 'The emoji to steal' }
    ],
    category: 'misc'
  }),
  afk: createCommandDetails({
    syntax: '/afk [reason]',
    description: 'Set your AFK status',
    options: [
      { name: 'reason', type: 'String', required: false, description: 'Reason for being AFK' }
    ],
    category: 'misc'
  }),
  giveaway: createCommandDetails({
    syntax: '/giveaway <duration> <winners> <prize>',
    description: 'Create a giveaway',
    options: [
      { name: 'duration', type: 'String', required: true, description: 'Duration of the giveaway (e.g. 1h, 30m, 1d)' },
      { name: 'winners', type: 'Integer', required: true, description: 'Number of winners' },
      { name: 'prize', type: 'String', required: true, description: 'Prize to give away' }
    ],
    category: 'misc'
  }),
  qr: createCommandDetails({
    syntax: '/qr <text>',
    description: 'Generate a QR code',
    options: [
      { name: 'text', type: 'String', required: true, description: 'Text to encode in QR code' }
    ],
    category: 'misc'
  }),
  remindme: createCommandDetails({
    syntax: '/remindme <time> <message>',
    description: 'Set a reminder for yourself',
    options: [
      { name: 'time', type: 'String', required: true, description: 'When to remind (e.g. 1h, 30m, tomorrow)' },
      { name: 'message', type: 'String', required: true, description: 'Reminder message' }
    ],
    category: 'misc'
  }),
  report: createCommandDetails({
    syntax: '/report <user> <reason>',
    description: 'Report a user to moderators',
    options: [
      { name: 'user', type: 'User', required: true, description: 'User to report' },
      { name: 'reason', type: 'String', required: true, description: 'Reason for the report' }
    ],
    category: 'misc'
  }),
  shorturl: createCommandDetails({
    syntax: '/shorturl <url>',
    description: 'Shorten a URL',
    options: [
      { name: 'url', type: 'String', required: true, description: 'URL to shorten' }
    ],
    category: 'misc'
  })
};

// Function to get command details safely with proper type checking
function getCommandDetails(details: BaseCommand | ModCommand): { syntax: string; description: string; options?: CommandOption[]; subcommands?: ModCommand['subcommands'] } {
  if (isModCommand(details)) {
    return {
      syntax: details.syntax,
      description: details.description,
      subcommands: details.subcommands
    };
  }
  return {
    syntax: details.syntax,
    description: details.description,
    options: details.options
  };
}

// Function to check if a command is a ModCommand
function isModCommand(command: BaseCommand | ModCommand): command is ModCommand {
  return 'subcommands' in command;
}

// Function to get command options
function getCommandOptions(command: BaseCommand | ModCommand): CommandOption[] {
  if (isModCommand(command)) {
    return []; // Moderation command doesn't have direct options, only subcommands
  }
  return command.options;
}

// Function to create category select menu
function createCategorySelectMenu(categories: Collection<string, Command[]>, currentCategory: string = 'all') {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('help_category')
    .setPlaceholder('Select a category')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('All Categories')
        .setDescription('View all available commands')
        .setValue('all')
        .setDefault(currentCategory === 'all')
    );

  categories.forEach((cmds, category) => {
    const categoryDesc = CATEGORY_DESCRIPTIONS[category as keyof typeof CATEGORY_DESCRIPTIONS] || '';
    const commandCount = cmds.length;
    const emoji = getCategoryEmoji(category);

    selectMenu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(`${emoji} ${category.charAt(0).toUpperCase() + category.slice(1)} (${commandCount} commands)`)
        .setDescription(categoryDesc)
        .setValue(category)
        .setDefault(currentCategory === category)
    );
  });

  return new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(selectMenu);
}

// Helper function to get category emoji
function getCategoryEmoji(category: string): string {
  switch (category) {
    case 'utility':
      return '🔧';
    case 'moderation':
      return '🛡️';
    case 'fun':
      return '🎮';
    case 'economy':
      return '💰';
    case 'leveling':
      return '📈';
    case 'misc':
      return '📦';
    default:
      return '📚';
  }
}

// Function to create navigation buttons for category view
function createCategoryNavigationButtons(currentPage: number, totalPages: number) {
  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('help_prev')
        .setLabel('Previous')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId('help_next')
        .setLabel('Next')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === totalPages - 1)
    );
}

// Function to create paginated embeds for commands
function createPaginatedEmbeds(commands: Collection<string, Command>, selectedCategory: string = 'all') {
  const embeds: EmbedBuilder[] = [];
  const commandsPerPage = 5;
  
  // Group commands by category
  const categories = new Collection<string, Command[]>();
  commands.forEach(cmd => {
    const category = cmd.category;
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)?.push(cmd);
  });

  if (selectedCategory === 'all') {
    // Create overview embed
    const overviewEmbed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle('📚 Command Categories')
      .setDescription('Select a category below to view its commands. Use `/help <command>` for specific command details.')
      .setFooter({ text: 'Tip: Click on a category to view its commands' });

    categories.forEach((cmds, category) => {
      const categoryDesc = CATEGORY_DESCRIPTIONS[category as keyof typeof CATEGORY_DESCRIPTIONS] || '';
      const emoji = getCategoryEmoji(category);
      const commandCount = cmds.length;
      const commandList = cmds
        .map(cmd => `\`/${cmd.data.name}\``)
        .join(', ');

      if (commandList && commandList.length > 0) {
        overviewEmbed.addFields({
          name: `${emoji} ${category.charAt(0).toUpperCase() + category.slice(1)} (${commandCount} commands)`,
          value: `> ${categoryDesc}\n\n${commandList}`,
          inline: false
        });
      }
    });

    embeds.push(overviewEmbed);
  } else {
    // Create embeds for selected category
    const categoryCommands = categories.get(selectedCategory) || [];
    const categoryDesc = CATEGORY_DESCRIPTIONS[selectedCategory as keyof typeof CATEGORY_DESCRIPTIONS] || '';
    const emoji = getCategoryEmoji(selectedCategory);
    
    // Split commands into pages
    for (let i = 0; i < categoryCommands.length; i += commandsPerPage) {
      const pageCommands = categoryCommands.slice(i, i + commandsPerPage);
      const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle(`${emoji} ${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Commands`)
        .setDescription(`> ${categoryDesc}\n\n**Total Commands:** ${categoryCommands.length}`)
        .setFooter({ text: `Page ${Math.floor(i / commandsPerPage) + 1} of ${Math.ceil(categoryCommands.length / commandsPerPage)}` });

      pageCommands.forEach(cmd => {
        if (cmd.data.name && cmd.data.description) {
          const commandDetails = COMMAND_DETAILS[cmd.data.name];
          if (commandDetails) {
            const details = getCommandDetails(commandDetails);
            embed.addFields({
              name: `\`/${cmd.data.name}\``,
              value: `${details.description}\n\`${details.syntax}\``,
              inline: false
            });
          }
        }
      });

      embeds.push(embed);
    }
  }

  return embeds;
}

const help: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get information about available commands')
    .addStringOption(option =>
      option
        .setName('command')
        .setDescription('The command to get details about')
        .setRequired(false)
    ),
  category: 'utility',
  execute: async (interaction: ChatInputCommandInteraction) => {
    const commandName = interaction.options.getString('command');
    
    if (commandName) {
      // Show specific command help
      const commandDetails = COMMAND_DETAILS[commandName];
      if (!commandDetails) {
        return interaction.reply({
          content: `❌ Command \`${commandName}\` not found.`
        });
      }

      const details = getCommandDetails(commandDetails);
      const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle(`Command: \`/${commandName}\``)
        .setDescription(details.description)
        .addFields(
          { name: 'Syntax', value: `\`${details.syntax}\``, inline: false }
        );

      if (details.options && details.options.length > 0) {
        const optionsText = details.options
          .map(opt => `• \`${opt.name}\` (${opt.type})${opt.required ? ' [Required]' : ' [Optional]'}\n  ${opt.description}`)
          .join('\n\n');
        embed.addFields({ name: 'Options', value: optionsText, inline: false });
      }

      if (details.subcommands) {
        const subcommandsText = Object.entries(details.subcommands)
          .map(([name, subcmd]) => `• \`${name}\`\n  ${subcmd.description}`)
          .join('\n\n');
        embed.addFields({ name: 'Subcommands', value: subcommandsText, inline: false });
      }

      return interaction.reply({ 
        embeds: [embed]
      });
    }

    // Show general help
    const categories = new Collection<string, Command[]>();
    const commands = interaction.client.commands;
    
    // Initialize all categories
    Object.keys(CATEGORY_DESCRIPTIONS).forEach(category => {
      categories.set(category, []);
    });
    
    commands.forEach(cmd => {
      if (!categories.has(cmd.category)) {
        categories.set(cmd.category, []);
      }
      categories.get(cmd.category)?.push(cmd);
    });

    const embeds = createPaginatedEmbeds(commands);
    const components = [createCategorySelectMenu(categories)];

    const response = await interaction.reply({
      embeds: [embeds[0]],
      components
    });

    // Create collectors for component interactions
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 300000 // 5 minutes
    });

    collector.on('collect', async (i: StringSelectMenuInteraction) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({ content: 'This menu is not for you!', ephemeral: true });
        return;
      }

      const selectedCategory = i.values[0];
      const categoryCommands = categories.get(selectedCategory) || [];
      const categoryEmbeds = createPaginatedEmbeds(commands, selectedCategory);
      let currentPage = 0;

      // Update the message with the selected category
      await i.update({
        embeds: [categoryEmbeds[0]],
        components: [
          createCategoryNavigationButtons(currentPage, categoryEmbeds.length),
          createCategorySelectMenu(categories, selectedCategory)
        ]
      });

      // Create button collector for navigation
      const buttonCollector = i.message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000 // 5 minutes
      });

      buttonCollector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
          await buttonInteraction.reply({ content: 'This menu is not for you!', ephemeral: true });
          return;
        }

        try {
          switch (buttonInteraction.customId) {
            case 'help_prev':
              if (currentPage > 0) {
                currentPage--;
                await buttonInteraction.update({
                  embeds: [categoryEmbeds[currentPage]],
                  components: [
                    createCategoryNavigationButtons(currentPage, categoryEmbeds.length),
                    createCategorySelectMenu(categories, selectedCategory)
                  ]
                }).catch(error => {
                  if (error.code === 10062) {
                    // Ignore unknown interaction errors
                    return;
                  }
                  console.error('Error updating help message:', error);
                });
              }
              break;

            case 'help_next':
              if (currentPage < categoryEmbeds.length - 1) {
                currentPage++;
                await buttonInteraction.update({
                  embeds: [categoryEmbeds[currentPage]],
                  components: [
                    createCategoryNavigationButtons(currentPage, categoryEmbeds.length),
                    createCategorySelectMenu(categories, selectedCategory)
                  ]
                }).catch(error => {
                  if (error.code === 10062) {
                    // Ignore unknown interaction errors
                    return;
                  }
                  console.error('Error updating help message:', error);
                });
              }
              break;
          }
        } catch (error: any) {
          if (error.code === 40060 || error.code === 10062) {
            // Ignore "Interaction has already been acknowledged" and "Unknown interaction" errors
            return;
          }
          console.error('Error handling button interaction:', error);
        }
      });

      buttonCollector.on('end', () => {
        // Only clean up if we're not in the main view
        if (selectedCategory !== 'all') {
          try {
            if (i.message) {
              i.message.edit({ components: [] }).catch(() => {});
            }
          } catch (error) {
            // Ignore errors if message is already deleted
          }
        }
      });
    });

    collector.on('end', () => {
      // Clean up components when collector ends
      try {
        if (response) {
          response.edit({ components: [] }).catch(() => {});
        }
      } catch (error) {
        // Ignore errors if message is already deleted
      }
    });
  }
};

export default help;
