import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import fetch from 'node-fetch';
import { COLORS } from '../../utils/constants';

interface RedditPost {
  data: {
    title: string;
    url: string;
    permalink: string;
    author: string;
    subreddit: string;
    ups: number;
  };
}

export = {
  data: new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Get a random meme from Reddit'),
  
  async execute(interaction: ChatInputCommandInteraction) {
    // Defer the reply to have time to fetch data
    await interaction.deferReply();
    
    try {
      // Fetch memes from Reddit (r/memes)
      const response = await fetch('https://www.reddit.com/r/memes/hot.json?limit=100');
      
      if (!response.ok) {
        return interaction.editReply({
          embeds: [EmbedBuilderService.error('Failed to fetch memes from Reddit')]
        });
      }
      
      const data = await response.json();
      const posts = data.data.children as RedditPost[];
      
      // Filter posts to get only image/gif memes (no videos, links, etc.)
      const memes = posts.filter(post => {
        const url = post.data.url;
        return (
          url.endsWith('.jpg') || 
          url.endsWith('.jpeg') || 
          url.endsWith('.png') || 
          url.endsWith('.gif')
        );
      });
      
      if (memes.length === 0) {
        return interaction.editReply({
          embeds: [EmbedBuilderService.error('No memes found')]
        });
      }
      
      // Get a random meme
      const randomMeme = memes[Math.floor(Math.random() * memes.length)].data;
      
      // Create embed
      const memeEmbed = EmbedBuilderService.createEmbed()
        .setTitle(randomMeme.title)
        .setURL(`https://reddit.com${randomMeme.permalink}`)
        .setImage(randomMeme.url)
        .setColor(COLORS.PRIMARY)
        .setFooter({ text: `👍 ${randomMeme.ups} | From r/${randomMeme.subreddit} | Posted by u/${randomMeme.author}` });
      
      return interaction.editReply({ embeds: [memeEmbed] });
    } catch (error) {
      return interaction.editReply({
        embeds: [EmbedBuilderService.error(`Error fetching meme: ${error}`)]
      });
    }
  },
  
  category: 'fun',
  cooldown: 10, // 10 seconds cooldown
} as Command; 