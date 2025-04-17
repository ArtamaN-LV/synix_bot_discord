import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  PermissionFlagsBits,
  ChannelType,
  VoiceChannel,
  CategoryChannel,
  OverwriteResolvable
} from 'discord.js';
import { ChannelUpdater } from '../../utils/channelUpdater';
import { Command } from '../../interfaces/command';
import { EmbedBuilder } from 'discord.js';
import { COLORS } from '../../utils/constants';
import { Logger } from '../../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

/**
 * Updates a value in the .env file
 */
async function updateEnvFile(key: string, value: string): Promise<void> {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    
    // Read existing .env file
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Create regex to find the key
    const keyRegex = new RegExp(`^${key}=.*`, 'm');
    
    // Check if key exists
    if (keyRegex.test(envContent)) {
      // Replace existing key
      if (value) {
        envContent = envContent.replace(keyRegex, `${key}=${value}`);
      } else {
        // Remove key if value is empty
        envContent = envContent.replace(keyRegex, '');
      }
    } else if (value) {
      // Add new key if it doesn't exist and value is not empty
      envContent += `\n${key}=${value}`;
    }
    
    // Write updated content back to .env file
    fs.writeFileSync(envPath, envContent);
    
    // Reload environment variables
    dotenv.config();
    
  } catch (error) {
    Logger.error('Error updating .env file:');
    Logger.error(error as Error);
    throw error;
  }
}

export = {
  data: new SlashCommandBuilder()
    .setName('statschannel')
    .setDescription('Set up voice channels for server statistics')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(subcommand => 
      subcommand
        .setName('setup')
        .setDescription('Create stats voice channels or use existing ones')
        .addChannelOption(option => 
          option
            .setName('members_channel')
            .setDescription('The members count channel (leave empty to create a new one)')
            .setRequired(false)
        )
        .addChannelOption(option => 
          option
            .setName('boosters_channel')
            .setDescription('The boosters count channel (leave empty to create a new one)')
            .setRequired(false)
        )
        .addChannelOption(option =>
          option
            .setName('category')
            .setDescription('Category to create channels in (optional)')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('create_category')
            .setDescription('Create a new "Server Stats" category (ignores category option)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand => 
      subcommand
        .setName('update')
        .setDescription('Force an update of the stats channels')
    )
    .addSubcommand(subcommand => 
      subcommand  
        .setName('disable')
        .setDescription('Disable the stats channels')
    ),
    
  category: 'utility',
    
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      
      // Setup stats channels
      if (subcommand === 'setup') {
        // Defer reply since this might take a bit
        await interaction.deferReply({ ephemeral: true });
        
        // Get optional channels from command options
        let membersChannel = interaction.options.getChannel('members_channel') as VoiceChannel | null;
        let boostersChannel = interaction.options.getChannel('boosters_channel') as VoiceChannel | null;
        const category = interaction.options.getChannel('category') as CategoryChannel | null;
        const createCategory = interaction.options.getBoolean('create_category');
        
        // Create or get category
        let targetCategory = category;
        if (createCategory) {
          // Create a new category for stats channels
          targetCategory = await interaction.guild!.channels.create({
            name: 'Server Stats',
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
              {
                id: interaction.guild!.id,
                allow: [PermissionFlagsBits.ViewChannel],
                deny: []
              }
            ],
            position: 0 // Try to position at the top
          });
          Logger.info(`Created Server Stats category: ${targetCategory.name}`);
        }
        
        // Default permissions for the channels - fully locked down
        const permissions: OverwriteResolvable[] = [
          {
            id: interaction.guild!.id, // @everyone role
            deny: [
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.Speak,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.UseVAD,
              PermissionFlagsBits.Stream
            ],
            allow: [PermissionFlagsBits.ViewChannel]
          }
        ];
        
        // Create the channels if they don't exist
        if (!membersChannel) {
          membersChannel = await interaction.guild!.channels.create({
            name: 'Members: Loading...',
            type: ChannelType.GuildVoice,
            parent: targetCategory?.id,
            permissionOverwrites: permissions,
            userLimit: 0 // Set user limit to 0 to make it appear locked
          });
          Logger.info(`Created members count channel: ${membersChannel.name}`);
        }
        
        if (!boostersChannel) {
          boostersChannel = await interaction.guild!.channels.create({
            name: 'Boosters: Loading...',
            type: ChannelType.GuildVoice,
            parent: targetCategory?.id,
            permissionOverwrites: permissions,
            userLimit: 0 // Set user limit to 0 to make it appear locked
          });
          Logger.info(`Created boosters count channel: ${boostersChannel.name}`);
        }
        
        // If we're using existing channels, make sure they're voice channels
        if (membersChannel && membersChannel.type !== ChannelType.GuildVoice) {
          return interaction.editReply({
            content: 'The members channel must be a voice channel. Please provide a voice channel or leave empty to create a new one.'
          });
        }
        
        if (boostersChannel && boostersChannel.type !== ChannelType.GuildVoice) {
          return interaction.editReply({
            content: 'The boosters channel must be a voice channel. Please provide a voice channel or leave empty to create a new one.'
          });
        }
        
        // Update permissions for existing channels if needed
        if (membersChannel) {
          await membersChannel.permissionOverwrites.set(permissions);
          await membersChannel.setUserLimit(0); // Make sure the channel appears locked
        }
        
        if (boostersChannel) {
          await boostersChannel.permissionOverwrites.set(permissions);
          await boostersChannel.setUserLimit(0); // Make sure the channel appears locked
        }
        
        // Update .env file with the new channel IDs
        if (membersChannel) {
          await updateEnvFile('MEMBERS_CHANNEL_ID', membersChannel.id);
          process.env.MEMBERS_CHANNEL_ID = membersChannel.id;
        }
        
        if (boostersChannel) {
          await updateEnvFile('BOOSTERS_CHANNEL_ID', boostersChannel.id);
          process.env.BOOSTERS_CHANNEL_ID = boostersChannel.id;
        }
        
        // Force an immediate update of the channels
        await ChannelUpdater.updateChannels();
        
        const successEmbed = new EmbedBuilder()
          .setColor(COLORS.SUCCESS)
          .setTitle('Stats Channels Set Up')
          .setDescription(
            `Server stats will now be displayed in voice channels:\n` +
            `${membersChannel ? `- Members count: ${membersChannel}\n` : ''}` +
            `${boostersChannel ? `- Boosters count: ${boostersChannel}\n` : ''}` +
            `${targetCategory && targetCategory !== category ? `\nChannels are organized in the "${targetCategory.name}" category.\n` : ''}` +
            `\nThe channels will update every 10 minutes with the latest counts.`
          )
          .setFooter({ text: 'The bot must be restarted for this to take full effect.' });
        
        await interaction.editReply({ embeds: [successEmbed] });
      }
      // Manually update the stats channels
      else if (subcommand === 'update') {
        const membersChannelId = process.env.MEMBERS_CHANNEL_ID;
        const boostersChannelId = process.env.BOOSTERS_CHANNEL_ID;
        
        if (!membersChannelId && !boostersChannelId) {
          return interaction.reply({
            content: 'No stats channels have been set up. Use `/statschannel setup` first!',
            ephemeral: true
          });
        }
        
        // Defer reply while we update
        await interaction.deferReply({ ephemeral: true });
        
        // Force an update of the channels
        await ChannelUpdater.updateChannels();
        
        // Build success message
        let description = 'The following stats channels have been updated:\n';
        
        if (membersChannelId) {
          try {
            const channel = await interaction.client.channels.fetch(membersChannelId) as VoiceChannel;
            if (channel) {
              description += `- Members count: ${channel}\n`;
            }
          } catch (error) {
            description += `- Members count: Channel not found (ID: ${membersChannelId})\n`;
          }
        }
        
        if (boostersChannelId) {
          try {
            const channel = await interaction.client.channels.fetch(boostersChannelId) as VoiceChannel;
            if (channel) {
              description += `- Boosters count: ${channel}\n`;
            }
          } catch (error) {
            description += `- Boosters count: Channel not found (ID: ${boostersChannelId})\n`;
          }
        }
        
        const updateEmbed = new EmbedBuilder()
          .setColor(COLORS.SUCCESS)
          .setTitle('Stats Updated')
          .setDescription(description);
        
        await interaction.editReply({ embeds: [updateEmbed] });
      }
      // Disable the stats channels
      else if (subcommand === 'disable') {
        const membersChannelId = process.env.MEMBERS_CHANNEL_ID;
        const boostersChannelId = process.env.BOOSTERS_CHANNEL_ID;
        
        if (!membersChannelId && !boostersChannelId) {
          return interaction.reply({
            content: 'Stats channels are not currently enabled.',
            ephemeral: true
          });
        }
        
        // Remove from .env file
        if (membersChannelId) {
          await updateEnvFile('MEMBERS_CHANNEL_ID', '');
          process.env.MEMBERS_CHANNEL_ID = '';
        }
        
        if (boostersChannelId) {
          await updateEnvFile('BOOSTERS_CHANNEL_ID', '');
          process.env.BOOSTERS_CHANNEL_ID = '';
        }
        
        const disableEmbed = new EmbedBuilder()
          .setColor(COLORS.INFO)
          .setTitle('Stats Channels Disabled')
          .setDescription('The server stats channels have been disabled. You can delete the channels manually if desired.')
          .setFooter({ text: 'The bot must be restarted for this to take full effect.' });
        
        await interaction.reply({ embeds: [disableEmbed], ephemeral: true });
      }
      
    } catch (error) {
      Logger.error('Error in statschannel command:');
      Logger.error(error as Error);
      
      // If we deferred the reply earlier, we need to edit it
      if (interaction.deferred) {
        await interaction.editReply({
          content: 'There was an error while executing this command.'
        });
      } else {
        await interaction.reply({
          content: 'There was an error while executing this command.',
          ephemeral: true
        });
      }
    }
  }
} as Command; 