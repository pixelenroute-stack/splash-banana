
import { db } from './mockDatabase';
import { SystemSettings, ConfigVersion } from '../types';
import { encrypt, decrypt } from '../lib/encryption';

class ConfigService {
  /**
   * Récupère la config active avec les champs sensibles déchiffrés.
   */
  async getActiveConfig(): Promise<SystemSettings> {
    const config = db.getSystemSettings();
    return this.decryptConfig(config);
  }
  
  /**
   * Sauvegarde une nouvelle version de config avec versioning et chiffrement.
   */
  async saveConfig(
    newConfig: Partial<SystemSettings>,
    userId: string,
    reason?: string
  ): Promise<SystemSettings> {
    const current = await this.getActiveConfig();
    
    // Créer diff
    const changes = this.computeDiff(current, newConfig);
    
    // Incrémenter version
    const nextVersion = (current.version || 1) + 1;
    
    // Préparation de la nouvelle config fusionnée
    const mergedConfig = {
      ...current,
      ...newConfig,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    };

    // Encrypt sensitive fields avant save
    const encryptedConfig = this.encryptConfig(mergedConfig);
    
    // Transaction simulée
    db.updateSystemSettings(encryptedConfig);
    
    // Archive
    const versionEntry: ConfigVersion = {
      id: `ver_${Date.now()}`,
      settingsId: current.id || 'sys_1',
      version: current.version || 1,
      snapshot: current,
      changedBy: userId,
      changedByName: db.getUserById(userId)?.name || 'Unknown',
      changedAt: new Date().toISOString(),
      changeReason: reason || 'Mise à jour configuration',
      status: 'archived',
      changes
    };
    db.addConfigVersion(versionEntry);
    
    return mergedConfig;
  }
  
  /**
   * Test de connectivité webhook
   */
  async testWebhook(
    module: keyof SystemSettings['webhooks'],
    userId: string
  ): Promise<{ success: boolean; latency?: number; error?: string }> {
    const config = await this.getActiveConfig();
    const webhook = config.webhooks[module];
    
    if (!webhook || !webhook.enabled) {
      return { success: false, error: 'Webhook disabled or missing' };
    }
    
    if (!webhook.url) {
        return { success: false, error: 'URL manquante' };
    }

    const startTime = Date.now();
    
    try {
      const testPayload = {
        action: 'HEALTH_CHECK',
        payload: { test: true },
        userId,
        timestamp: Date.now()
      };
      
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Request': 'true'
        },
        body: JSON.stringify(testPayload),
        signal: controller.signal
      });
      
      clearTimeout(id);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const latency = Date.now() - startTime;
      
      // Mise à jour du statut
      const newWebhooks = { ...config.webhooks };
      newWebhooks[module] = {
          ...webhook,
          lastTestedAt: new Date().toISOString(),
          lastTestStatus: 'success',
          lastTestError: undefined
      };
      
      const tempConfig = { ...config, webhooks: newWebhooks };
      db.updateSystemSettings(this.encryptConfig(tempConfig));
      
      return { success: true, latency };
      
    } catch (error: any) {
      const newWebhooks = { ...config.webhooks };
      newWebhooks[module] = {
          ...webhook,
          lastTestedAt: new Date().toISOString(),
          lastTestStatus: 'error',
          lastTestError: error.message
      };
      const tempConfig = { ...config, webhooks: newWebhooks };
      db.updateSystemSettings(this.encryptConfig(tempConfig));

      return { success: false, error: error.message };
    }
  }
  
  async rollbackToVersion(
    versionId: string,
    userId: string,
    reason: string
  ): Promise<SystemSettings> {
    const targetVersion = db.getConfigVersionById(versionId);
    if (!targetVersion) throw new Error('Version not found');
    
    db.updateConfigVersion(versionId, { status: 'rolled_back' });
    
    return await this.saveConfig(
      targetVersion.snapshot,
      userId,
      `Rollback to v${targetVersion.version}: ${reason}`
    );
  }
  
  // --- ENCRYPTION HELPERS ---

  private encryptConfig(config: SystemSettings): SystemSettings {
    const encrypted = JSON.parse(JSON.stringify(config));
    if (config.aiConfig) {
      encrypted.aiConfig.geminiKey = encrypt(config.aiConfig.geminiKey);
      encrypted.aiConfig.anthropicKey = encrypt(config.aiConfig.anthropicKey);
      encrypted.aiConfig.openaiKey = encrypt(config.aiConfig.openaiKey);
      encrypted.aiConfig.perplexityKey = encrypt(config.aiConfig.perplexityKey);
      encrypted.aiConfig.deepseekKey = encrypt(config.aiConfig.deepseekKey);
    }
    if (config.google) {
        encrypted.google.clientSecret = encrypt(config.google.clientSecret);
    }
    return encrypted;
  }
  
  private decryptConfig(config: SystemSettings): SystemSettings {
    const decrypted = JSON.parse(JSON.stringify(config));
    if (config.aiConfig) {
      decrypted.aiConfig.geminiKey = decrypt(config.aiConfig.geminiKey);
      decrypted.aiConfig.anthropicKey = decrypt(config.aiConfig.anthropicKey);
      decrypted.aiConfig.openaiKey = decrypt(config.aiConfig.openaiKey);
      decrypted.aiConfig.perplexityKey = decrypt(config.aiConfig.perplexityKey);
      decrypted.aiConfig.deepseekKey = decrypt(config.aiConfig.deepseekKey);
    }
    if (config.google) {
        decrypted.google.clientSecret = decrypt(config.google.clientSecret);
    }
    return decrypted;
  }
  
  private computeDiff(
    oldConfig: SystemSettings,
    newConfig: Partial<SystemSettings>
  ): Array<{ field: string; oldValue: any; newValue: any }> {
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
    if (newConfig.appMode && newConfig.appMode !== oldConfig.appMode) {
        changes.push({ field: 'appMode', oldValue: oldConfig.appMode, newValue: newConfig.appMode });
    }
    return changes;
  }
}

export const configService = new ConfigService();
