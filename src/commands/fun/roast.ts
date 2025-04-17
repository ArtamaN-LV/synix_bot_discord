import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import { config } from '../../config';
import { Logger } from '../../utils/logger';
import { COLORS, BOT_NAME } from '../../utils/constants';

// List of light-hearted roasts
const roasts = [
    "You're not the dumbest person on the planet, but you better hope they don't die.",
    "If I wanted to kill myself, I'd climb your ego and jump to your IQ.",
    "You bring everyone so much joy... when you leave the room.",
    "I'd agree with you but then we'd both be wrong.",
    "You're the human equivalent of a participation award.",
    "I don't have the time or the crayons to explain this to you.",
    "You're not completely useless, you can always serve as a bad example.",
    "I'm jealous of people who don't know you.",
    "You're like a cloud. When you disappear, it's a beautiful day.",
    "Some people just need a high-five. In the face. With a chair.",
    "I'd tell you to go outside and play hide-and-seek, but nobody would look for you.",
    "You're the reason the gene pool needs a lifeguard.",
    "If you were any less intelligent, we'd have to water you twice a week.",
    "It's impossible to underestimate you.",
    "You're not stupid; you just have bad luck when thinking.",
    "If you were a spice, you'd be flour.",
    "Light travels faster than sound, which is why you seemed bright until you spoke.",
    "You have an entire life to be an idiot. Why not take today off?",
    "Your face makes onions cry.",
    "I'm not insulting you; I'm describing you.",
    "Earth is full. Go home.",
    "If your brain was dynamite, there wouldn't be enough to blow your hat off.",
    "You're so dense, light bends around you.",
    "You have a face for radio and a voice for silent film.",
    "I was going to give you a nasty look, but I see you already have one."
];

export const data = new SlashCommandBuilder()
    .setName('roast')
    .setDescription('Deliver a light-hearted roast to someone')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user to roast')
            .setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const targetUser = interaction.options.getUser('user');
        
        if (!targetUser) {
            return interaction.reply({
                content: 'You need to specify a user to roast!',
                ephemeral: true
            });
        }
        
        // Don't allow roasting the bot itself
        if (targetUser.id === interaction.client.user.id) {
            return interaction.reply({
                content: "Nice try, but I'm not roasting myself!",
                ephemeral: false
            });
        }
        
        // Get a random roast
        const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];
        
        // Create the embed
        const embed = new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setTitle('🔥 Roast Incoming!')
            .setDescription(`<@${targetUser.id}>, ${randomRoast}`)
            .setThumbnail('https://i.imgur.com/8XWI1fL.png') // Fire emoji thumbnail
            .setFooter({ 
                text: `Requested by ${interaction.user.tag} • Keep it friendly!`, 
                iconURL: interaction.user.displayAvatarURL() 
            })
            .setTimestamp();
            
        await interaction.reply({
            embeds: [embed]
        });
    } catch (error) {
        Logger.error(`Error in roast command: ${error}`);
        
        const errorEmbed = new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setTitle('Error')
            .setDescription('An error occurred while processing the command.')
            .setTimestamp();
            
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
} 