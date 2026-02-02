
import { supabaseService } from './supabaseService';
import { sheetsService } from './sheetsRepository';
import { notionService } from './notionRepository';
import { NotionClient, SyncResult, SyncOperation } from '../types';
import { db } from './mockDatabase';

export class SyncOrchestrator {
  
  /**
   * Orchestrates client creation across all platforms
   * Implements transaction-like behavior with rollback on failure
   */
  async createClientWorkflow(clientData: Partial<NotionClient>): Promise<SyncResult> {
    const operations: SyncOperation[] = [];
    
    try {
      // STEP 1: Validate
      const validationErrors = this.validateClient(clientData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.map(e => e.reason).join(', ')}`);
      }
      
      // STEP 2: Save to Supabase (primary)
      console.log('[Sync] Creating client in Supabase...');
      const savedClient = await supabaseService.saveClient(clientData as NotionClient);
      operations.push({
        platform: 'supabase',
        action: 'create',
        data: savedClient,
        rollback: async () => {
          await supabaseService.archiveClient(savedClient.id);
        }
      });
      
      // STEP 3: Add to Google Sheet
      console.log('[Sync] Adding client to Google Sheet...');
      const sheetResult = await sheetsService.addClient(savedClient);
      if (!sheetResult.success) {
        throw new Error('Failed to add client to Google Sheet: ' + sheetResult.message);
      }
      
      const rowNumber = sheetResult.rowNumber;
      if (!rowNumber) {
          throw new Error('Failed to retrieve Row Number from Google Sheets');
      }

      // Update Supabase with Row Number
      savedClient.spreadsheetRow = rowNumber;
      await supabaseService.saveClient(savedClient);
      
      operations.push({
        platform: 'sheets',
        action: 'create',
        data: { client: savedClient, rowNumber },
        rollback: async () => {
          await sheetsService.deleteClient(rowNumber);
        }
      });
      
      // STEP 4: Create Notion project
      console.log('[Sync] Creating Notion project...');
      const project = await notionService.createProjectForClient(savedClient);
      
      operations.push({
        platform: 'notion',
        action: 'create',
        data: project,
        rollback: async () => {
          // Notion API doesn't allow easy permanent delete via public API easily, 
          // usually archive (trash). We'll assume archive capability or manual cleanup.
          console.warn(`[Sync Rollback] Please delete Notion page ${project.notionPageId} manually.`);
        }
      });
      
      // STEP 5: Link Notion project back to Sheet
      console.log('[Sync] Linking Notion project to Google Sheet...');
      const notionUrl = `https://notion.so/${project.notionPageId?.replace(/-/g, '')}`;
      await sheetsService.updateClient(rowNumber, {
        ...savedClient,
        notionProjectUrl: notionUrl
      });
      
      // SUCCESS
      console.log('[Sync] ✅ Client creation workflow completed successfully');
      
      // Log Success
      db.addAuditLog({
          id: `sync_${Date.now()}`,
          actorId: 'SYSTEM',
          actorName: 'Sync Orchestrator',
          action: 'CLIENT_CREATION_SYNC',
          metadata: { clientId: savedClient.id, row: rowNumber },
          timestamp: new Date().toISOString(),
          level: 'info'
      });

      return {
        success: true,
        completedOperations: operations
      };
      
    } catch (error) {
      // ROLLBACK
      console.error('[Sync] ❌ Workflow failed, rolling back...', error);
      await this.rollback(operations);
      
      return {
        success: false,
        completedOperations: [],
        failedOperation: operations[operations.length - 1],
        error: error as Error
      };
    }
  }
  
  /**
   * Orchestrates client update across all platforms
   */
  async updateClientWorkflow(
    oldClient: NotionClient, 
    newClient: NotionClient
  ): Promise<SyncResult> {
    const operations: SyncOperation[] = [];
    
    try {
      // Detect changes
      const changes = this.detectChanges(oldClient, newClient);
      if (Object.keys(changes).length === 0) {
        console.log('[Sync] No changes detected, skipping sync');
        return { success: true, completedOperations: [] };
      }
      
      console.log('[Sync] Changes detected:', changes);
      
      // STEP 1: Update Supabase
      await supabaseService.saveClient(newClient);
      operations.push({
        platform: 'supabase',
        action: 'update',
        data: newClient,
        rollback: async () => {
          await supabaseService.saveClient(oldClient);
        }
      });
      
      // STEP 2: Update Google Sheet (if row number exists)
      if (newClient.spreadsheetRow) {
        await sheetsService.updateClient(newClient.spreadsheetRow, newClient);
        operations.push({
          platform: 'sheets',
          action: 'update',
          data: newClient,
          rollback: async () => {
            await sheetsService.updateClient(newClient.spreadsheetRow!, oldClient);
          }
        });
      }
      
      // STEP 3: Update Notion project if client name changed
      if (changes.name || changes.companyName) {
        // Fetch projects related to client
        const allProjects = db.getProjectsByClientId(newClient.id); // Using mock/local cache for speed or fetch from Supabase
        
        for (const project of allProjects) {
          project.clientName = newClient.name || newClient.companyName;
          await notionService.syncProjectToNotion(project);
        }
        
        operations.push({
          platform: 'notion',
          action: 'update',
          data: { projects: allProjects },
          rollback: async () => {
            // Revert project names
            for (const project of allProjects) {
              project.clientName = oldClient.name || oldClient.companyName;
              await notionService.syncProjectToNotion(project);
            }
          }
        });
      }
      
      console.log('[Sync] ✅ Client update workflow completed');
      return { success: true, completedOperations: operations };
      
    } catch (error) {
      console.error('[Sync] ❌ Update workflow failed, rolling back...', error);
      await this.rollback(operations);
      return {
        success: false,
        completedOperations: [],
        failedOperation: operations[operations.length - 1],
        error: error as Error
      };
    }
  }
  
  /**
   * Handles external changes from Google Sheet
   */
  async syncFromSheet(rowNumber: number): Promise<SyncResult> {
    try {
      console.log(`[Sync] Processing Sheet change for row ${rowNumber}`);
      
      // Fetch the row from Sheet
      const clients = await sheetsService.fetchClients();
      if (!clients.success) {
        throw new Error('Failed to fetch Sheet data');
      }
      
      const sheetClient = clients.data.find(c => c.spreadsheetRow === rowNumber);
      if (!sheetClient) {
        throw new Error(`Client not found at row ${rowNumber}`);
      }
      
      // Find corresponding client in Supabase
      const appClients = await supabaseService.getClients();
      // Match primarily by Spreadsheet Row, then by Email as fallback
      const appClient = appClients.find(c => 
        c.spreadsheetRow === rowNumber || (c.email && c.email === sheetClient.email)
      );
      
      if (!appClient) {
        // New client in Sheet → Import to app
        console.log('[Sync] New client detected in Sheet, importing...');
        await supabaseService.saveClient(sheetClient);
        return { success: true, completedOperations: [] };
      }
      
      // Existing client → Conflict resolution
      const appModified = new Date(appClient.lastSyncedAt || 0).getTime();
      const sheetModified = new Date(sheetClient.lastSyncedAt || 0).getTime();
      
      // If Sheet is significantly newer (allowing for 1min drift)
      if (sheetModified > appModified + 60000) {
        // Sheet is newer → Update app
        console.log('[Sync] Sheet version is newer, updating app...');
        await supabaseService.saveClient({
          ...sheetClient,
          id: appClient.id, // Preserve app ID
          notionPageId: appClient.notionPageId // Preserve Notion link if sheet lost it
        });
      } else if (appModified > sheetModified + 60000) {
        // App is newer → Update Sheet
        console.log('[Sync] App version is newer, updating Sheet...');
        await sheetsService.updateClient(rowNumber, appClient);
      } else {
          console.log('[Sync] Versions synchronized or conflict ambiguous. No action.');
      }
      
      return { success: true, completedOperations: [] };
      
    } catch (error) {
      console.error('[Sync] ❌ Sheet sync failed:', error);
      return {
        success: false,
        completedOperations: [],
        error: error as Error
      };
    }
  }
  
  /**
   * Rollback all completed operations in reverse order
   */
  private async rollback(operations: SyncOperation[]): Promise<void> {
    console.log(`[Sync] Rolling back ${operations.length} operations...`);
    
    // Reverse order (undo last operation first)
    for (const op of [...operations].reverse()) {
      try {
        if (op.rollback) {
          console.log(`[Sync] Reverting ${op.platform} ${op.action}...`);
          await op.rollback();
        }
      } catch (rollbackError) {
        console.error(`[Sync] Rollback failed for ${op.platform}:`, rollbackError);
        // Log to error tracking service (Sentry, etc.)
        db.addAuditLog({
            id: `err_rb_${Date.now()}`,
            actorId: 'SYSTEM',
            actorName: 'SyncOrchestrator',
            action: 'ROLLBACK_FAILED',
            metadata: { error: (rollbackError as Error).message },
            timestamp: new Date().toISOString(),
            level: 'error'
        });
      }
    }
  }
  
  /**
   * Validate client data before creating/updating
   */
  private validateClient(client: Partial<NotionClient>): Array<{field: string, reason: string}> {
    const errors: Array<{field: string, reason: string}> = [];
    
    if (!client.name || client.name.trim() === '') {
      errors.push({ field: 'name', reason: 'Name is required' });
    }
    
    if (client.email && !this.isValidEmail(client.email)) {
      errors.push({ field: 'email', reason: 'Invalid email format' });
    }
    
    return errors;
  }
  
  /**
   * Detect changes between old and new client data
   */
  private detectChanges(oldClient: NotionClient, newClient: NotionClient): Partial<NotionClient> {
    const changes: Partial<NotionClient> = {};
    
    const fields: (keyof NotionClient)[] = [
      'name', 'companyName', 'email', 'leadStatus', 'serviceType',
      'contactDate', 'comments', 'youtubeChannel', 'instagramAccount', 'postalAddress'
    ];
    
    for (const field of fields) {
      if (oldClient[field] !== newClient[field]) {
        // @ts-ignore
        changes[field] = newClient[field];
      }
    }
    
    return changes;
  }
  
  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

export const syncOrchestrator = new SyncOrchestrator();
