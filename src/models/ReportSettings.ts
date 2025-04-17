import mongoose from 'mongoose';

const reportSettingsSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true
  },
  reportChannelId: {
    type: String,
    required: true
  }
});

export const ReportSettings = mongoose.model('ReportSettings', reportSettingsSchema); 