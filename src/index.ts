import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import { config } from './config';
import { Logger } from './utils/logger';
import { Database } from './utils/db';
import fs from 'fs';
import path from 'path';
import { Command } from './interfaces/command';

// Import type extensions
import './types/discord';

// Create a new client instance with appropriate intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// Register the client with the ClientProvider
import { clientProvider } from './utils/clientProvider';
clientProvider.setClient(client);

// Initialize commands collection
client.commands = new Collection();

// Function to load commands
async function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  const commandFolders = fs.readdirSync(commandsPath);
  const commands = [];

  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);
      
      try {
        const command = require(filePath);
        
        // Handle both CommonJS and ES modules
        const commandModule = command.default || command;
        
        // Set a proper category based on the folder
        if (commandModule.data && typeof commandModule.execute === 'function') {
          commandModule.category = folder;
          client.commands.set(commandModule.data.name, commandModule);
          commands.push(commandModule.data.toJSON());
          Logger.info(`Loaded command: ${commandModule.data.name} (${folder})`);
        } else {
          Logger.warn(`Command at ${filePath} is missing required properties`);
        }
      } catch (error) {
        Logger.error(`Error loading command at ${filePath}:`);
        Logger.error(error as Error);
      }
    }
  }

  return commands;
}

// Function to load events
function loadEvents() {
  const eventsPath = path.join(__dirname, 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
    
    Logger.info(`Loaded event: ${event.name}`);
  }
}

// Register slash commands with Discord API
async function registerCommands(commands: any[]) {
  try {
    Logger.info('Started refreshing application commands...');
    
    const rest = new REST({ version: '10' }).setToken(config.token);
    
    // Register commands globally (all servers)
    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands }
    );
    
    Logger.info('Successfully registered application commands');
  } catch (error) {
    Logger.error('Error registering application commands:');
    Logger.error(error as Error);
  }
}

// Initialize the bot
async function init() {
  try {
    // Connect to database (if MongoDB URI is provided)
    await Database.connect();
    
    // Load commands
    const commands = await loadCommands();
    
    // Load events
    loadEvents();
    
    // Log in to Discord
    await client.login(config.token);
    
    // Register commands after login
    if (commands.length > 0) {
      await registerCommands(commands);
    }
  } catch (error) {
    Logger.error('Error during initialization:');
    Logger.error(error as Error);
    process.exit(1);
  }
}

// Start the bot
init(); 