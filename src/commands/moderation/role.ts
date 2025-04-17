import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  GuildMember,
  Role,
  EmbedBuilder,
  ColorResolvable,
  ChannelType,
  Collection
} from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';

export = {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Manage server roles')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a role to a user')
        .addUserOption(option => 
          option
            .setName('user')
            .setDescription('The user to add the role to')
            .setRequired(true)
        )
        .addRoleOption(option => 
          option
            .setName('role')
            .setDescription('The role to add')
            .setRequired(true)
        )
        .addStringOption(option => 
          option
            .setName('reason')
            .setDescription('The reason for adding the role')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a new role')
        .addStringOption(option => 
          option
            .setName('name')
            .setDescription('The name of the new role')
            .setRequired(true)
        )
        .addStringOption(option => 
          option
            .setName('color')
            .setDescription('The color of the role (hex code)')
            .setRequired(false)
        )
        .addBooleanOption(option => 
          option
            .setName('hoisted')
            .setDescription('Whether the role should be displayed separately')
            .setRequired(false)
        )
        .addBooleanOption(option => 
          option
            .setName('mentionable')
            .setDescription('Whether the role can be mentioned by everyone')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('delete')
        .setDescription('Delete a role')
        .addRoleOption(option => 
          option
            .setName('role')
            .setDescription('The role to delete')
            .setRequired(true)
        )
        .addStringOption(option => 
          option
            .setName('reason')
            .setDescription('The reason for deleting the role')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('edit')
        .setDescription('Edit a role\'s properties')
        .addRoleOption(option => 
          option
            .setName('role')
            .setDescription('The role to edit')
            .setRequired(true)
        )
        .addStringOption(option => 
          option
            .setName('name')
            .setDescription('New name for the role')
            .setRequired(false)
        )
        .addStringOption(option => 
          option
            .setName('color')
            .setDescription('New color for the role (hex code)')
            .setRequired(false)
        )
        .addBooleanOption(option => 
          option
            .setName('hoisted')
            .setDescription('Whether the role should be displayed separately')
            .setRequired(false)
        )
        .addBooleanOption(option => 
          option
            .setName('mentionable')
            .setDescription('Whether the role can be mentioned by everyone')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('Get information about a role')
        .addRoleOption(option => 
          option
            .setName('role')
            .setDescription('The role to get info about')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all roles in the server')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      if (!interaction.guild) {
        const guildOnlyEmbed = EmbedBuilderService.warning('This command can only be used in a server.');
        return await interaction.reply({ embeds: [guildOnlyEmbed], ephemeral: true });
      }

      const subcommand = interaction.options.getSubcommand();

      switch (subcommand) {
        case 'add': {
          // Get options
          const user = interaction.options.getUser('user', true);
          const role = interaction.options.getRole('role', true) as Role;
          const reason = interaction.options.getString('reason') || 'No reason provided';
          
          // Check bot permissions
          const me = interaction.guild.members.me;
          if (!me) {
            const errorEmbed = EmbedBuilderService.error('Failed to get bot member information.');
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          }
          
          // Check if the bot can manage this role
          if (me.roles.highest.position <= role.position) {
            const errorEmbed = EmbedBuilderService.error(
              'I cannot add this role because it is higher than or equal to my highest role.'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          }
          
          // Check if the user can manage this role
          const member = interaction.member as GuildMember;
          if (member.roles.highest.position <= role.position && interaction.guild.ownerId !== member.id) {
            const errorEmbed = EmbedBuilderService.error(
              'You cannot add this role because it is higher than or equal to your highest role.'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          }
          
          // Ensure the user is a member of the guild
          const targetMember = await interaction.guild.members.fetch(user.id).catch(() => null);
          
          if (!targetMember) {
            const errorEmbed = EmbedBuilderService.error('This user is not a member of this server.');
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          }
          
          // Check if the user already has the role
          if (targetMember.roles.cache.has(role.id)) {
            const errorEmbed = EmbedBuilderService.warning(`${user.tag} already has the role **${role.name}**.`);
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          }
          
          // Add the role
          const auditReason = `Added by ${interaction.user.tag} | Reason: ${reason}`;
          
          await targetMember.roles.add(role, auditReason);
          
          // Try to notify the user about the role addition
          try {
            const notificationEmbed = new EmbedBuilder()
              .setTitle('Role Added')
              .setDescription(`You have been given the role **${role.name}** in **${interaction.guild.name}**`)
              .setColor(role.color || 0x3498DB)
              .addFields({ name: 'Reason', value: reason })
              .setTimestamp();
            
            await targetMember.send({ embeds: [notificationEmbed] }).catch(() => {
              // Silently fail if we can't DM the user
            });
          } catch (error) {
            // Ignore errors when trying to DM the user
          }
          
          const successEmbed = EmbedBuilderService.success(
            `Successfully added the role **${role.name}** to ${user.tag}.`
          );
          
          await interaction.reply({ embeds: [successEmbed] });
          break;
        }
        
        case 'create': {
          // Get options
          const name = interaction.options.getString('name', true);
          const colorInput = interaction.options.getString('color');
          const hoisted = interaction.options.getBoolean('hoisted') ?? false;
          const mentionable = interaction.options.getBoolean('mentionable') ?? false;
          
          // Parse the color
          let color: ColorResolvable = 0x5865F2; // Discord default blue
          if (colorInput) {
            const hexColor = colorInput.startsWith('#') ? colorInput : `#${colorInput}`;
            if (/^#[0-9A-F]{6}$/i.test(hexColor)) {
              color = hexColor as ColorResolvable;
            } else {
              const errorEmbed = EmbedBuilderService.warning('Invalid color format. Using default color instead.');
              await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
          }
          
          // Create the role
          const auditReason = `Created by ${interaction.user.tag}`;
          
          const newRole = await interaction.guild.roles.create({
            name,
            color,
            hoist: hoisted,
            mentionable,
            reason: auditReason
          });
          
          const successEmbed = EmbedBuilderService.success(`Successfully created the role **${newRole.name}**.`)
            .setColor(newRole.color || 0x3498DB)
            .addFields(
              { name: 'Name', value: newRole.name, inline: true },
              { name: 'Color', value: newRole.hexColor, inline: true },
              { name: 'Hoisted', value: hoisted ? 'Yes' : 'No', inline: true },
              { name: 'Mentionable', value: mentionable ? 'Yes' : 'No', inline: true },
              { name: 'ID', value: newRole.id, inline: true }
            );
          
          await interaction.reply({ embeds: [successEmbed] });
          break;
        }
        
        case 'delete': {
          // Get options
          const role = interaction.options.getRole('role', true) as Role;
          const reason = interaction.options.getString('reason') || 'No reason provided';
          
          // Check bot permissions
          const me = interaction.guild.members.me;
          if (!me) {
            const errorEmbed = EmbedBuilderService.error('Failed to get bot member information.');
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          }
          
          // Check if the bot can manage this role
          if (me.roles.highest.position <= role.position) {
            const errorEmbed = EmbedBuilderService.error(
              'I cannot delete this role because it is higher than or equal to my highest role.'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          }
          
          // Check if the user can manage this role
          const member = interaction.member as GuildMember;
          if (member.roles.highest.position <= role.position && interaction.guild.ownerId !== member.id) {
            const errorEmbed = EmbedBuilderService.error(
              'You cannot delete this role because it is higher than or equal to your highest role.'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          }
          
          const roleName = role.name;
          const auditReason = `Deleted by ${interaction.user.tag} | Reason: ${reason}`;
          
          await role.delete(auditReason);
          
          const successEmbed = EmbedBuilderService.success(`Successfully deleted the role **${roleName}**.`);
          
          await interaction.reply({ embeds: [successEmbed] });
          break;
        }
        
        case 'edit': {
          // Get options
          const role = interaction.options.getRole('role', true) as Role;
          const name = interaction.options.getString('name');
          const colorInput = interaction.options.getString('color');
          const hoisted = interaction.options.getBoolean('hoisted');
          const mentionable = interaction.options.getBoolean('mentionable');
          
          // Check if any options are provided
          if (!name && colorInput === null && hoisted === null && mentionable === null) {
            const errorEmbed = EmbedBuilderService.error('You must provide at least one property to edit.');
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          }
          
          // Check bot permissions
          const me = interaction.guild.members.me;
          if (!me) {
            const errorEmbed = EmbedBuilderService.error('Failed to get bot member information.');
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          }
          
          // Check if the bot can manage this role
          if (me.roles.highest.position <= role.position) {
            const errorEmbed = EmbedBuilderService.error(
              'I cannot edit this role because it is higher than or equal to my highest role.'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          }
          
          // Check if the user can manage this role
          const member = interaction.member as GuildMember;
          if (member.roles.highest.position <= role.position && interaction.guild.ownerId !== member.id) {
            const errorEmbed = EmbedBuilderService.error(
              'You cannot edit this role because it is higher than or equal to your highest role.'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          }
          
          // Parse the color
          let color: ColorResolvable | undefined = undefined;
          if (colorInput) {
            const hexColor = colorInput.startsWith('#') ? colorInput : `#${colorInput}`;
            if (/^#[0-9A-F]{6}$/i.test(hexColor)) {
              color = hexColor as ColorResolvable;
            } else {
              const errorEmbed = EmbedBuilderService.warning('Invalid color format. Skipping color update.');
              await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
          }
          
          // Edit the role
          const auditReason = `Edited by ${interaction.user.tag}`;
          
          const changes: string[] = [];
          
          if (name && name !== role.name) {
            changes.push(`Name: ${role.name} → ${name}`);
          }
          
          if (color && role.hexColor.toLowerCase() !== (colorInput?.startsWith('#') ? colorInput.toLowerCase() : `#${colorInput?.toLowerCase()}`)) {
            changes.push(`Color: ${role.hexColor} → ${typeof color === 'string' ? color : String(color)}`);
          }
          
          if (hoisted !== null && hoisted !== role.hoist) {
            changes.push(`Hoisted: ${role.hoist ? 'Yes' : 'No'} → ${hoisted ? 'Yes' : 'No'}`);
          }
          
          if (mentionable !== null && mentionable !== role.mentionable) {
            changes.push(`Mentionable: ${role.mentionable ? 'Yes' : 'No'} → ${mentionable ? 'Yes' : 'No'}`);
          }
          
          const updatedRole = await role.edit({
            name: name || undefined,
            color: color,
            hoist: hoisted !== null ? hoisted : undefined,
            mentionable: mentionable !== null ? mentionable : undefined,
            reason: auditReason
          });
          
          const successEmbed = EmbedBuilderService.success(`Successfully edited the role **${updatedRole.name}**.`)
            .setColor(updatedRole.color || 0x3498DB);
          
          if (changes.length > 0) {
            successEmbed.addFields({ name: 'Changes', value: changes.join('\n') });
          }
          
          await interaction.reply({ embeds: [successEmbed] });
          break;
        }
        
        case 'info': {
          const role = interaction.options.getRole('role', true) as Role;
          
          const createdAt = Math.floor(role.createdTimestamp / 1000);
          const memberCount = role.members.size;
          
          const roleInfoEmbed = new EmbedBuilder()
            .setTitle(`Role Information: ${role.name}`)
            .setColor(role.color || 0x3498DB)
            .addFields(
              { name: 'Name', value: role.name, inline: true },
              { name: 'ID', value: role.id, inline: true },
              { name: 'Color', value: role.hexColor, inline: true },
              { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
              { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
              { name: 'Position', value: `${role.position}`, inline: true },
              { name: 'Members', value: `${memberCount}`, inline: true },
              { name: 'Created At', value: `<t:${createdAt}:F> (<t:${createdAt}:R>)`, inline: true }
            );
          
          // Add managed information (bot role, integration, etc.)
          if (role.managed) {
            roleInfoEmbed.addFields({ name: 'Managed By', value: 'Discord (Integration or Bot Role)', inline: true });
          }
          
          await interaction.reply({ embeds: [roleInfoEmbed] });
          break;
        }
        
        case 'list': {
          await interaction.deferReply();
          
          const roles = await interaction.guild.roles.fetch();
          
          // Sort roles by position (highest first)
          const sortedRoles = roles.sort((a, b) => b.position - a.position);
          
          // Create a list of roles
          const roleList = sortedRoles.map(role => {
            if (role.name === '@everyone') {
              return `@everyone (${role.members.size} members)`;
            }
            return `<@&${role.id}> - ${role.members.size} members`;
          });
          
          // Create embeds with the role list (splitting if necessary due to embed limitations)
          const embedFields = [];
          let currentField = '';
          
          for (const roleEntry of roleList) {
            // Discord has a 1024 character limit per field
            if (currentField.length + roleEntry.length + 1 > 1024) {
              embedFields.push(currentField);
              currentField = roleEntry;
            } else {
              currentField += (currentField ? '\n' : '') + roleEntry;
            }
          }
          
          if (currentField) {
            embedFields.push(currentField);
          }
          
          // Create the embed
          const roleListEmbed = new EmbedBuilder()
            .setTitle(`Roles in ${interaction.guild.name}`)
            .setColor(0x3498DB)
            .setDescription(`Total roles: ${roles.size - 1}`) // -1 to exclude @everyone
            .setTimestamp();
          
          // Add fields
          embedFields.forEach((field, index) => {
            roleListEmbed.addFields({ name: `Roles ${index + 1}`, value: field });
          });
          
          await interaction.editReply({ embeds: [roleListEmbed] });
          break;
        }
        
        default:
          const invalidSubcommand = EmbedBuilderService.error('Invalid subcommand');
          await interaction.reply({ embeds: [invalidSubcommand], ephemeral: true });
      }
    } catch (error) {
      console.error('Error in role command:', error);
      const errorEmbed = EmbedBuilderService.error('An error occurred while executing the role command.');
      
      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] }).catch(() => {});
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
      }
    }
  }
} as Command; 