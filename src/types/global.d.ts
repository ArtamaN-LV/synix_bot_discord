import { Client } from 'discord.js';

declare global {
  var client: Client;
  var verificationSettings: Record<string, {
    enabled: boolean;
    roleId: string;
    channelId: string;
    captcha: boolean;
    timeout: number;
    message: string | null;
  }>;
  var verificationLogs: Record<string, Array<{
    userId: string;
    username: string;
    action: string;
    timestamp: string;
  }>>;
  
  namespace NodeJS {
    interface Global {
      client: Client;
      verificationSettings: Record<string, {
        enabled: boolean;
        roleId: string;
        channelId: string;
        captcha: boolean;
        timeout: number;
        message: string | null;
      }>;
      verificationLogs: Record<string, Array<{
        userId: string;
        username: string;
        action: string;
        timestamp: string;
      }>>;
    }
  }
} 