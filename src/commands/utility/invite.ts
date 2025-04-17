import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder,
  OAuth2Scopes,
  PermissionFlagsBits
} from 'discord.js';
import { Command } from '../../interfaces/command';
import { COLORS, BOT_NAME } from '../../utils/constants';
import { Logger } from '../../utils/logger';

export = {
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Get the bot\'s invite link and information'),
  
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      // Get the application information
      const application = await interaction.client.application.fetch();
      
      // Generate an invite link with common permissions
      const inviteLink = interaction.client.generateInvite({
        scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
        permissions: [
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.UseExternalEmojis,
          PermissionFlagsBits.AddReactions,
          PermissionFlagsBits.CreatePublicThreads,
          PermissionFlagsBits.ModerateMembers,
          PermissionFlagsBits.ManageMessages,
        ]
      });
      
      // Create an embed with the invite link
      const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle('📨 Invite Me to Your Server')
        .setDescription(`Thank you for your interest in adding me to your server! I'm a powerful bot with many features to enhance your server.\n\n[Click here to invite me](${inviteLink})`)
        .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 }))
        .addFields(
          { 
            name: '🤖 Bot Information', 
            value: `
            **Name:** ${interaction.client.user.username}
            **Created By:** ${application.owner ? application.owner.toString() : 'Unknown'}
            **Version:** ${process.env.BOT_VERSION || '1.0.0'}`,
            inline: false 
          },
          { 
            name: '🔑 Required Permissions', 
            value: `
            • Read Message History
            • Send Messages
            • Embed Links
            • Attach Files
            • Use External Emojis
            • Add Reactions
            • Create Public Threads
            • Moderate Members
            • Manage Messages`,
            inline: false 
          },
          { 
            name: '💡 Features', 
            value: `
            • Moderation Tools
            • Economy System
            • Leveling System
            • Ticket System
            • Utility Commands
            • And much more!`,
            inline: false 
          }
        )
        .setFooter({ 
          text: `${BOT_NAME} • Utility Commands`,
          iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();
        
      await interaction.reply({ embeds: [embed] });
      
      Logger.info(`User ${interaction.user.tag} generated an invite link in ${interaction.guild?.name || 'DM'}`);
      
    } catch (error) {
      Logger.error(`Error in invite command: ${error}`);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle('❌ Error')
        .setDescription('An error occurred while generating the invite link.')
        .setTimestamp();
        
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  },
  
  category: 'utility',
  cooldown: 5, // 5 seconds cooldown
} as Command; 