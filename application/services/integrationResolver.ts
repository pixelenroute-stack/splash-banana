
import { db } from './mockDatabase';
import { ResolvedNotionConfig, ResolvedAirtableConfig, ResolvedSupabaseConfig, SupabaseDbConfig, AirtableConfig, ResolvedPerplexityConfig } from '../types';

export class IntegrationResolver {

  private buildPostgresString(config: SupabaseDbConfig): string {
      const { user, password, host, port, database } = config;
      const encodedUser = encodeURIComponent(user);
      const encodedPassword = encodeURIComponent(password || '');
      return `postgres://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;
  }

  async resolveNotion(userId: string): Promise<ResolvedNotionConfig> {
    const userSettings = db.getUserSettings(userId);
    
    if (userSettings?.useOwnNotion && userSettings.notionTokenEncrypted && userSettings.notionDatabaseId) {
      return {
        source: 'user',
        token: db.decrypt(userSettings.notionTokenEncrypted),
        databaseId: userSettings.notionDatabaseId
      };
    }

    const globalSettings = db.getGlobalSettings();
    if (globalSettings.notionTokenEncrypted && globalSettings.notionDatabaseId) {
      return {
        source: 'admin',
        token: db.decrypt(globalSettings.notionTokenEncrypted),
        databaseId: globalSettings.notionDatabaseId
      };
    }

    throw new Error("Intégration Notion non configurée.");
  }

  async resolveAirtable(userId: string): Promise<ResolvedAirtableConfig> {
    const userSettings = db.getUserSettings(userId);

    // 1. User Override (JSON Config)
    if (userSettings?.useOwnAirtable && userSettings.airtableConfigEncrypted) {
        try {
            const json = db.decrypt(userSettings.airtableConfigEncrypted);
            const config = JSON.parse(json) as AirtableConfig;
            return { source: 'user', config };
        } catch (e) {
            console.error("User Airtable config corrupted", e);
        }
    }
    
    // 2. Global
    const globalSettings = db.getGlobalSettings();
    if (globalSettings.airtableConfigEncrypted) {
         try {
            const json = db.decrypt(globalSettings.airtableConfigEncrypted);
            const config = JSON.parse(json) as AirtableConfig;
            return { source: 'admin', config };
        } catch (e) {
            console.error("Global Airtable config corrupted", e);
        }
    }

    throw new Error("Intégration Airtable non configurée.");
  }

  async resolveSupabase(userId: string): Promise<ResolvedSupabaseConfig> {
    const userSettings = db.getUserSettings(userId);

    if (userSettings?.useOwnSupabase && userSettings.supabaseConfigEncrypted) {
        const json = db.decrypt(userSettings.supabaseConfigEncrypted);
        try {
            const config = JSON.parse(json) as SupabaseDbConfig;
            return {
                source: 'user',
                config,
                connectionString: this.buildPostgresString(config)
            };
        } catch (e) { console.error("Invalid Supabase User Config", e); }
    }

    const globalSettings = db.getGlobalSettings();
    if (globalSettings.supabaseConfigEncrypted) {
        const json = db.decrypt(globalSettings.supabaseConfigEncrypted);
        try {
            const config = JSON.parse(json) as SupabaseDbConfig;
            return {
                source: 'admin',
                config,
                connectionString: this.buildPostgresString(config)
            };
        } catch (e) { console.error("Invalid Supabase Global Config", e); }
    }

    if (process.env.DATABASE_URL) {
        const match = process.env.DATABASE_URL.match(/@([^:]+):(\d+)/);
        const fallbackConfig: SupabaseDbConfig = {
            host: match ? match[1] : 'env-host',
            port: match ? parseInt(match[2]) : 5432,
            database: 'postgres',
            user: 'env-user',
            password: 'env-password',
            mode: 'direct'
        };

        return {
            source: 'env',
            config: fallbackConfig,
            connectionString: process.env.DATABASE_URL
        };
    }

    throw new Error("Supabase DB non configurée.");
  }

  async resolveGoogle(userId: string) {
    const account = db.getGoogleAccount(userId);
    if (!account) throw new Error("Compte Google non connecté.");
    
    return {
      accessToken: db.decrypt(account.accessTokenEncrypted),
    };
  }

  async resolvePerplexity(userId: string): Promise<ResolvedPerplexityConfig> {
    if (process.env.PERPLEXITY_API_KEY) {
      return { apiKey: process.env.PERPLEXITY_API_KEY };
    }
    throw new Error("Perplexity API Key non configurée (PERPLEXITY_API_KEY manquante).");
  }
}

export const integrationResolver = new IntegrationResolver();
