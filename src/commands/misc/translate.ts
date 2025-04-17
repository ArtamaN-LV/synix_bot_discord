import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { EmbedBuilderService } from '../../utils/embedBuilder';
import { Command } from '../../interfaces/command';
import { COLORS } from '../../utils/constants';
import fetch from 'node-fetch';

// Common language codes
const LANGUAGES = [
  { name: 'Arabic', value: 'ar' },
  { name: 'Chinese', value: 'zh' },
  { name: 'Czech', value: 'cs' },
  { name: 'Danish', value: 'da' },
  { name: 'Dutch', value: 'nl' },
  { name: 'English', value: 'en' },
  { name: 'Finnish', value: 'fi' },
  { name: 'French', value: 'fr' },
  { name: 'German', value: 'de' },
  { name: 'Greek', value: 'el' },
  { name: 'Hindi', value: 'hi' },
  { name: 'Hungarian', value: 'hu' },
  { name: 'Italian', value: 'it' },
  { name: 'Japanese', value: 'ja' },
  { name: 'Korean', value: 'ko' },
  { name: 'Norwegian', value: 'no' },
  { name: 'Polish', value: 'pl' },
  { name: 'Portuguese', value: 'pt' },
  { name: 'Russian', value: 'ru' },
  { name: 'Spanish', value: 'es' },
  { name: 'Swedish', value: 'sv' },
  { name: 'Turkish', value: 'tr' },
  { name: 'Ukrainian', value: 'uk' },
];

// Response interface
interface TranslateResponse {
  success?: boolean;
  data?: {
    translatedText: string;
    detectedSourceLanguage?: {
      code: string;
      language: string;
    };
  };
  error?: {
    message: string;
  };
}

export = {
  data: new SlashCommandBuilder()
    .setName('translate')
    .setDescription('Translate text to another language')
    .addStringOption(option => 
      option
        .setName('text')
        .setDescription('The text to translate')
        .setRequired(true)
    )
    .addStringOption(option => {
      const languageOption = option
        .setName('language')
        .setDescription('The target language to translate to')
        .setRequired(true);
      
      // Add language choices
      LANGUAGES.forEach(lang => {
        languageOption.addChoices({ name: lang.name, value: lang.value });
      });
      
      return languageOption;
    }),
  
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    
    try {
      const text = interaction.options.getString('text', true);
      const targetLang = interaction.options.getString('language', true);
      const apiKey = process.env.TRANSLATION_API_KEY;
      
      if (!apiKey) {
        return interaction.editReply({
          embeds: [EmbedBuilderService.error('Translation API key is not configured. Please contact the bot administrator.')]
        });
      }
      
      // The LibreTranslate API is free and open source, but requires an API key from their hosted service
      // Alternative: use a self-hosted instance or another translation API
      const response = await fetch('https://libretranslate.com/translate', {
        method: 'POST',
        body: JSON.stringify({
          q: text,
          source: 'auto',
          target: targetLang,
          api_key: apiKey
        }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`Translation API responded with status ${response.status}`);
      }
      
      const result = await response.json() as TranslateResponse;
      
      if (!result || result.error) {
        throw new Error(result.error?.message || 'Translation failed');
      }
      
      // Get language display name
      const language = LANGUAGES.find(lang => lang.value === targetLang)?.name || targetLang;
      
      // Create translation embed
      const translationEmbed = EmbedBuilderService.createEmbed()
        .setColor(COLORS.INFO)
        .setTitle(`Translation to ${language}`)
        .addFields(
          { name: 'Original Text', value: text.length > 1024 ? text.substring(0, 1021) + '...' : text },
          { name: `Translated Text (${language})`, value: result.data?.translatedText || 'Translation unavailable' }
        )
        .setFooter({ text: result.data?.detectedSourceLanguage 
          ? `Detected source language: ${result.data.detectedSourceLanguage.language || result.data.detectedSourceLanguage.code}` 
          : 'Powered by LibreTranslate' 
        })
        .setTimestamp();
      
      return interaction.editReply({ embeds: [translationEmbed] });
    } catch (error) {
      console.error('Error translating text:', error);
      return interaction.editReply({ 
        embeds: [EmbedBuilderService.error('An error occurred during translation. Please try again later.')]
      });
    }
  },
  
  category: 'misc',
  cooldown: 5, // 5 seconds cooldown
} as Command; 