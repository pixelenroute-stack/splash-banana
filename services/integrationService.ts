
import { db } from './mockDatabase';
import { integrationResolver } from './integrationResolver';
import { notionService } from './notionRepository';
import { airtableService } from './airtableRepository';
import { IntegrationState, SupabaseDbConfig, AirtableConfig, IntegrationStatusMeta, AirtableBase, AirtableTable } from '../types';
import { testSupabaseConnection } from '../lib/supabaseClient';

const extractNotionId = (input: string): string => {
  const cleanInput = input.trim();
  const match = cleanInput.match(/([a-f0-9]{32})/);
  if (match) {
    const rawId = match[1];
    return `${rawId.substr(0,8)}-${rawId.substr(8,4)}-${rawId.substr(12,4)}-${rawId.substr(16,4)}-${rawId.substr(20)}`;
  }
  return cleanInput;
};

export class IntegrationService {

  // --- AIRTABLE DISCOVERY ---
  
  async listAirtableBases(pat: string): Promise<AirtableBase[]> {
      return await airtableService.listBases(pat);
  }

  async listAirtableTables(pat: string, baseId: string): Promise<AirtableTable[]> {
      return await airtableService.listTables(pat, baseId);
  }

  // --- READ STATE (GLOBAL ONLY) ---
  async getGlobalIntegrationState(): Promise<IntegrationState[]> {
      const globalSettings = db.getGlobalSettings();
      const states: IntegrationState[] = [];

      const buildGlobalState = (
          service: 'notion'|'airtable'|'supabase',
          configured: boolean,
          envFallback: boolean,
          status?: IntegrationStatusMeta
      ): IntegrationState => {
          let source: 'user' | 'admin' | 'none' = 'none';
          if (configured) source = 'admin';
          else if (envFallback) source = 'admin'; // Env vars viewed as system

          return {
              service,
              configured: source !== 'none',
              source,
              isOverridden: false, // Global view never overridden
              lastTestedAt: status?.lastTestedAt,
              lastTestStatus: status?.lastTestStatus,
              lastErrorMessage: status?.lastErrorMessage
          };
      };

      // 1. NOTION
      states.push(buildGlobalState('notion', !!globalSettings.notionTokenEncrypted, false, globalSettings.notionStatus));
      // 2. AIRTABLE
      states.push(buildGlobalState('airtable', !!globalSettings.airtableConfigEncrypted, false, globalSettings.airtableStatus));
      // 3. SUPABASE
      states.push(buildGlobalState('supabase', !!globalSettings.supabaseConfigEncrypted, !!(process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL), globalSettings.supabaseStatus));

      return states;
  }

  // --- READ STATE (USER RESOLVED) ---
  
  async getUserIntegrationState(userId: string): Promise<IntegrationState[]> {
    const userSettings = db.getUserSettings(userId);
    const globalSettings = db.getGlobalSettings();
    const googleAccount = db.getGoogleAccount(userId);

    const states: IntegrationState[] = [];

    // Helper to build state
    const buildState = (
        service: 'notion'|'airtable'|'supabase',
        userConfigured: boolean,
        globalConfigured: boolean,
        override: boolean,
        envFallback: boolean,
        userStatus?: IntegrationStatusMeta,
        globalStatus?: IntegrationStatusMeta
    ): IntegrationState => {
        let source: 'user' | 'admin' | 'none' = 'none';
        if (override && userConfigured) source = 'user';
        else if (globalConfigured) source = 'admin';
        else if (envFallback) source = 'admin'; // Env vars viewed as system

        // Pick relevant status based on source
        const relevantStatus = source === 'user' ? userStatus : (source === 'admin' ? globalStatus : undefined);

        return {
            service,
            configured: source !== 'none',
            source,
            isOverridden: override,
            lastTestedAt: relevantStatus?.lastTestedAt,
            lastTestStatus: relevantStatus?.lastTestStatus,
            lastErrorMessage: relevantStatus?.lastErrorMessage
        };
    };

    // 1. NOTION
    states.push(buildState(
        'notion',
        !!userSettings?.notionTokenEncrypted,
        !!globalSettings.notionTokenEncrypted,
        userSettings?.useOwnNotion || false,
        false,
        userSettings?.notionStatus,
        globalSettings.notionStatus
    ));

    // 2. AIRTABLE
    states.push(buildState(
        'airtable',
        !!userSettings?.airtableConfigEncrypted,
        !!globalSettings.airtableConfigEncrypted,
        userSettings?.useOwnAirtable || false,
        false,
        userSettings?.airtableStatus,
        globalSettings.airtableStatus
    ));

    // 3. SUPABASE
    states.push(buildState(
        'supabase',
        !!userSettings?.supabaseConfigEncrypted,
        !!globalSettings.supabaseConfigEncrypted,
        userSettings?.useOwnSupabase || false,
        !!(process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
        userSettings?.supabaseStatus,
        globalSettings.supabaseStatus
    ));

    // 4. GOOGLE WORKSPACE (User only)
    states.push({
        service: 'google',
        configured: !!googleAccount,
        source: !!googleAccount ? 'user' : 'none',
        isOverridden: false, // Always per-user
        lastTestedAt: googleAccount?.lastSyncedAt,
        lastTestStatus: googleAccount ? 'success' : undefined,
    });

    return states;
  }

  // --- WRITE CONFIG (USER) ---

  async saveUserConfig(userId: string, service: 'notion'|'airtable'|'supabase', data: any) {
    // Fixed: Added required 'level' property
    db.addAuditLog({
        id: `log_${Date.now()}`,
        actorId: userId,
        actorName: 'User',
        action: 'UPDATE_USER_INTEGRATION',
        metadata: { service, overrides: true },
        timestamp: new Date().toISOString(),
        level: 'info'
    });

    try {
        if (service === 'notion') {
            const encrypted = db.encrypt(data.token);
            const dbId = extractNotionId(data.databaseId);
            db.upsertUserSettings(userId, {
                useOwnNotion: true,
                notionTokenEncrypted: encrypted,
                notionDatabaseId: dbId
            });
        } 
        else if (service === 'airtable') {
            // data = AirtableConfig
            const configJson = JSON.stringify(data);
            db.upsertUserSettings(userId, {
                useOwnAirtable: true,
                airtableConfigEncrypted: db.encrypt(configJson)
            });
        }
        else if (service === 'supabase') {
            const configJson = JSON.stringify(data);
            db.upsertUserSettings(userId, {
                useOwnSupabase: true,
                supabaseConfigEncrypted: db.encrypt(configJson)
            });
        }

        // Auto-test after save
        await this.testIntegration(userId, service);

    } catch (e) {
        throw e;
    }
  }

  // --- WRITE CONFIG (GLOBAL / ADMIN) ---

  async saveGlobalConfig(actorId: string, service: 'notion'|'airtable'|'supabase', data: any) {
    // Audit Log for Admin Action
    // Fixed: Added required 'level' property
    db.addAuditLog({
        id: `log_${Date.now()}`,
        actorId: actorId,
        actorName: 'Admin',
        action: 'UPDATE_GLOBAL_INTEGRATION',
        metadata: { service },
        timestamp: new Date().toISOString(),
        level: 'info'
    });

    try {
        if (service === 'notion') {
            const encrypted = db.encrypt(data.token);
            const dbId = extractNotionId(data.databaseId);
            db.updateGlobalSettings({
                notionTokenEncrypted: encrypted,
                notionDatabaseId: dbId,
                notionStatus: { enabled: true, lastTestedAt: new Date().toISOString(), lastTestStatus: 'success' } // Optimistic
            }, actorId);
        }
        else if (service === 'airtable') {
            const configJson = JSON.stringify(data);
            db.updateGlobalSettings({
                airtableConfigEncrypted: db.encrypt(configJson),
                airtableStatus: { enabled: true, lastTestedAt: new Date().toISOString(), lastTestStatus: 'success' }
            }, actorId);
        }
        else if (service === 'supabase') {
            const configJson = JSON.stringify(data);
            db.updateGlobalSettings({
                supabaseConfigEncrypted: db.encrypt(configJson),
                supabaseStatus: { enabled: true, lastTestedAt: new Date().toISOString(), lastTestStatus: 'success' }
            }, actorId);
        }

        // Trigger test to update real status
        try {
            await this.testIntegration(actorId, service);
        } catch(e) { console.warn("Auto-test failed after global save", e); }

    } catch (e) {
        throw e;
    }
  }

  async disconnectUserConfig(userId: string, service: 'notion'|'airtable'|'supabase'|'google') {
      // Fixed: Added required 'level' property
      db.addAuditLog({
          id: `log_del_${Date.now()}`,
          actorId: userId,
          actorName: 'User',
          action: 'DISCONNECT_INTEGRATION',
          metadata: { service },
          timestamp: new Date().toISOString(),
          level: 'warn'
      });

      if (service === 'google') {
          db.disconnectGoogleAccount(userId);
          return;
      }

      // Reset specific fields to null/false
      const patch: any = {};
      if (service === 'notion') {
          patch.useOwnNotion = false;
          patch.notionTokenEncrypted = null;
          patch.notionDatabaseId = null;
          patch.notionStatus = null;
      } else if (service === 'airtable') {
          patch.useOwnAirtable = false;
          patch.airtableConfigEncrypted = null;
          patch.airtableStatus = null;
      } else if (service === 'supabase') {
          patch.useOwnSupabase = false;
          patch.supabaseConfigEncrypted = null;
          patch.supabaseStatus = null;
      }
      
      db.upsertUserSettings(userId, patch);
  }

  async toggleUserOverride(userId: string, service: string, enabled: boolean) {
      const patch: any = {};
      if (service === 'notion') patch.useOwnNotion = enabled;
      if (service === 'airtable') patch.useOwnAirtable = enabled;
      if (service === 'supabase') patch.useOwnSupabase = enabled;
      
      db.upsertUserSettings(userId, patch);
      return this.getUserIntegrationState(userId);
  }

  // --- TESTS ---

  private async updateTestStatus(userId: string, service: string, success: boolean, msg?: string) {
      // Determine if we are updating User Settings or Global Settings based on resolution
      const userSettings = db.getUserSettings(userId);
      const isOverride = userSettings?.[`useOwn${service.charAt(0).toUpperCase() + service.slice(1)}` as keyof typeof userSettings];
      
      const statusObj = { 
           enabled: true, 
           lastTestedAt: new Date().toISOString(), 
           lastTestStatus: success ? 'success' : 'error',
           lastErrorMessage: success ? null : msg
      };

      if (isOverride) {
           const key = `${service}Status` as any;
           db.upsertUserSettings(userId, { [key]: statusObj });
      } else {
           // Assume admin testing updates global status if not overridden
           const user = db.getUserById(userId);
           if (user?.role === 'ADMIN') {
                const key = `${service}Status` as any;
                db.updateGlobalSettings({ [key]: statusObj }, userId);
           }
      }
  }

  private async testPostgresConnection(config: SupabaseDbConfig): Promise<{ok: boolean, ms: number}> {
      const start = performance.now();
      await new Promise(r => setTimeout(r, 400)); 
      if (config.host === 'fail') throw new Error("Host unreachable");
      if (config.password === 'wrong') throw new Error("Auth failed");
      const end = performance.now();
      return { ok: true, ms: Math.round(end - start) };
  }

  async testIntegration(userId: string, service: 'notion'|'airtable'|'supabase'|'google') {
    let result = { ok: false, message: '' };
    
    try {
        if (service === 'google') {
            const acc = db.getGoogleAccount(userId);
            if (!acc) throw new Error("Non connecté");
            result = { ok: true, message: `Connecté: ${acc.email}` };
        }
        else if (service === 'notion') {
            const config = await integrationResolver.resolveNotion(userId);
            await notionService.validateConnection(config.token, config.databaseId);
            result = { ok: true, message: `Connecté (Source: ${config.source})` };
        }
        else if (service === 'airtable') {
            const config = await integrationResolver.resolveAirtable(userId);
            // Validation mock
            if (!config.config.pat.startsWith('pat')) throw new Error("Token PAT invalide");
            result = { ok: true, message: `Connecté (Source: ${config.source})` };
        }
        else if (service === 'supabase') {
            const resolved = await integrationResolver.resolveSupabase(userId);
            if (resolved.source === 'env') {
                 const res = await testSupabaseConnection();
                 result = { ok: res.ok, message: `Connecté API REST (Source: Env)` };
            } else {
                 const res = await this.testPostgresConnection(resolved.config);
                 result = { ok: true, message: `Postgres Connecté (${res.ms}ms)` };
            }
        }
        else {
             throw new Error("Service inconnu");
        }
    } catch (e) {
        result = { ok: false, message: (e as Error).message };
    }

    // Persist status if User Override
    await this.updateTestStatus(userId, service, result.ok, result.message);
    
    return result;
  }
}

export const integrationService = new IntegrationService();
