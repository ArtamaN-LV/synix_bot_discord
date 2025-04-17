import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';
import fetch from 'node-fetch';

// Import type extensions
import '../../types/discord';

// Define OpenWeatherMap API response type
interface WeatherResponse {
  name: string;
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  weather: {
    id: number;
    main: string;
    description: string;
    icon: string;
  }[];
  wind: {
    speed: number;
    deg: number;
  };
  sys: {
    country: string;
  };
  cod: number;
}

export = {
  data: new SlashCommandBuilder()
    .setName('weather')
    .setDescription('Get weather information for a city')
    .addStringOption(option => 
      option.setName('city')
        .setDescription('The city to get weather for')
        .setRequired(true)),
  
  async execute(interaction: ChatInputCommandInteraction) {
    const city = interaction.options.getString('city', true);
    
    await interaction.deferReply();
    
    try {
      // Note: In a real implementation, you'd need to get an API key from OpenWeatherMap
      // and store it securely in your environment variables
      const apiKey = process.env.OPENWEATHER_API_KEY;
      
      if (!apiKey) {
        return interaction.editReply({
          embeds: [EmbedBuilderService.error('Weather API key not configured. Please contact the bot owner.')]
        });
      }
      
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          return interaction.editReply({
            embeds: [EmbedBuilderService.error(`Could not find weather data for "${city}". Please check the spelling and try again.`)]
          });
        }
        
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json() as WeatherResponse;
      
      // Emojis for weather conditions
      const weatherEmojis: Record<string, string> = {
        'Clear': '☀️',
        'Clouds': '☁️',
        'Rain': '🌧️',
        'Drizzle': '🌦️',
        'Thunderstorm': '⛈️',
        'Snow': '❄️',
        'Mist': '🌫️',
        'Fog': '🌫️',
        'Haze': '🌫️',
        'Dust': '💨',
        'Smoke': '💨',
        'Tornado': '🌪️'
      };
      
      const emoji = weatherEmojis[data.weather[0].main] || '🌡️';
      
      // Create the weather embed
      const weatherEmbed = EmbedBuilderService.createEmbed()
        .setColor(COLORS.INFO)
        .setTitle(`${emoji} Weather for ${data.name}, ${data.sys.country}`)
        .setThumbnail(`http://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`)
        .addFields(
          { name: 'Condition', value: data.weather[0].description.charAt(0).toUpperCase() + data.weather[0].description.slice(1), inline: true },
          { name: 'Temperature', value: `${Math.round(data.main.temp)}°C`, inline: true },
          { name: 'Feels Like', value: `${Math.round(data.main.feels_like)}°C`, inline: true },
          { name: 'Humidity', value: `${data.main.humidity}%`, inline: true },
          { name: 'Wind Speed', value: `${data.wind.speed} m/s`, inline: true },
          { name: 'Pressure', value: `${data.main.pressure} hPa`, inline: true }
        );
      
      await interaction.editReply({ embeds: [weatherEmbed] });
    } catch (error) {
      console.error('Error fetching weather:', error);
      await interaction.editReply({
        embeds: [EmbedBuilderService.error('An error occurred while fetching weather data. Please try again later.')]
      });
    }
  },
  
  category: 'misc',
  cooldown: 10,
} as Command; 