import { REST, Routes, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { config } from './src/config';
import fs from 'fs';
import path from 'path';
import { Logger } from './src/utils/logger';
import dotenv from 'dotenv';

// Import the module declaration (this is just for the types, not the actual client)
import './src/types/discord';

// Load environment variables
dotenv.config();

const commands: RESTPostAPIApplicationCommandsJSONBody[] = [];
const categoryCount: Record<string, number> = {};
let totalCommandCount = 0;

// Function to load commands
async function loadCommands() {
  const commandsPath = path.join(__dirname, 'src', 'commands');
  const commandFolders = fs.readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    // Initialize category count
    categoryCount[folder] = 0;

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
          commands.push(commandModule.data.toJSON());
          Logger.info(`Loaded command: ${commandModule.data.name} (${folder})`);
          categoryCount[folder]++;
          totalCommandCount++;
        } else {
          Logger.warn(`Command at ${filePath} is missing required properties`);
        }
      } catch (error) {
        Logger.error(`Error loading command at ${filePath}:`);
        Logger.error(error as Error);
      }
    }
  }
}

// Register slash commands with Discord API
async function deployCommands(isDev = false) {
  try {
    Logger.info(`Started refreshing application commands in ${isDev ? 'development' : 'production'} mode...`);
    
    await loadCommands();
    
    // Check if we have commands to deploy
    if (commands.length === 0) {
      Logger.error('No commands found to deploy');
      process.exit(1);
    }
    
    // Display command count summary
    Logger.info('=== Command Count Summary ===');
    for (const [category, count] of Object.entries(categoryCount)) {
      Logger.info(`${category}: ${count} commands`);
    }
    Logger.info(`Total: ${totalCommandCount} commands loaded`);
    Logger.info('============================');
    
    const rest = new REST({ version: '10' }).setToken(config.token);
    
    // Get required IDs
    const clientId = process.env.CLIENT_ID;
    
    if (!clientId) {
      Logger.error('CLIENT_ID is not defined in .env file');
      process.exit(1);
    }
    
    // In development mode, register commands for a specific guild (faster)
    if (isDev) {
      const guildId = process.env.GUILD_ID;
      
      if (!guildId) {
        Logger.error('GUILD_ID is not defined in .env file');
        process.exit(1);
      }
      
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
      
      Logger.info(`Successfully registered ${commands.length} application commands to guild ${guildId} (development mode)`);
    } 
    // In production mode, register commands globally (can take up to an hour to propagate)
    else {
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
      
      Logger.info(`Successfully registered ${commands.length} application commands globally (production mode)`);
    }
  } catch (error) {
    Logger.error('Error deploying commands:');
    Logger.error(error as Error);
    process.exit(1);
  }
}

// Check if dev mode is specified
const devMode = process.argv[2] === '--dev';
deployCommands(devMode); 