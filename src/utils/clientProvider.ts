import { Client } from 'discord.js';
import { Logger } from './logger';

// Singleton class to hold the client instance
class ClientProvider {
  private static instance: ClientProvider;
  private _client: Client | null = null;

  private constructor() {}

  public static getInstance(): ClientProvider {
    if (!ClientProvider.instance) {
      ClientProvider.instance = new ClientProvider();
    }
    return ClientProvider.instance;
  }

  public setClient(client: Client): void {
    this._client = client;
    Logger.info('Discord client has been registered with ClientProvider');
  }

  public getClient(): Client | null {
    return this._client;
  }
}

// Export a singleton instance
export const clientProvider = ClientProvider.getInstance();

// Helper function to get the client
export function getClient(): Client | null {
  return clientProvider.getClient();
} 