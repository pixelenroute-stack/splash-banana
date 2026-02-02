
import { supabase } from '../lib/supabaseClient';
import { db } from './mockDatabase';
import { NotionClient, Invoice, Contract, MediaAsset, Project, SystemSettings, AuditLog } from '../types';

export class SupabaseService {
  
  private checkConnection() {
      // Priorité absolue à Supabase si le client existe
      if (supabase) return true;
      console.warn("[SupabaseService] Client non initialisé. Passage en mode Mock (Non persistant).");
      return false;
  }

  // --- SETTINGS (GLOBAL) ---
  async getSystemSettings(): Promise<SystemSettings | null> {
      if (!this.checkConnection()) return db.getSystemSettings();

      const { data, error } = await supabase!
          .from('system_settings')
          .select('config')
          .limit(1)
          .single();
      
      if (error || !data) return db.getSystemSettings(); // Fallback initial
      return data.config as SystemSettings;
  }

  async saveSystemSettings(settings: SystemSettings) {
      if (!this.checkConnection()) return db.updateSystemSettings(settings);

      // On récupère l'ID existant ou on insère
      const { data: existing } = await supabase!.from('system_settings').select('id').limit(1).single();
      
      if (existing) {
          await supabase!.from('system_settings').update({
              config: settings,
              updated_at: new Date().toISOString()
          }).eq('id', existing.id);
      } else {
          await supabase!.from('system_settings').insert({ config: settings });
      }
      return settings;
  }

  // --- AUDIT LOGS ---
  async addAuditLog(log: AuditLog) {
      if (!this.checkConnection()) return db.addAuditLog(log);

      // On nettoie l'objet log pour correspondre aux colonnes SQL
      await supabase!.from('audit_logs').insert({
          actor_id: log.actorId !== 'SYSTEM' ? log.actorId : null, // SYSTEM n'est pas un UUID valide
          actor_name: log.actorName,
          action: log.action,
          target_id: log.targetId,
          metadata: log.metadata,
          level: log.level,
          created_at: log.timestamp
      });
  }

  async getRecentLogs(limit: number = 20) {
      if (!this.checkConnection()) return db.getRecentActivity(limit);
      const { data } = await supabase!.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
      return data?.map(row => ({
          id: row.id,
          actorId: row.actor_id || 'SYSTEM',
          actorName: row.actor_name,
          action: row.action,
          targetId: row.target_id,
          metadata: row.metadata,
          level: row.level,
          timestamp: row.created_at
      })) || [];
  }

  // --- CLIENTS ---
  async getClients() {
    if (!this.checkConnection()) return db.getClients();
    const { data } = await supabase!.from('clients').select('*').eq('is_archived', false).order('created_at', { ascending: false });
    
    // Mapping snake_case -> camelCase
    return (data || []).map(c => ({
        id: c.id,
        notionPageId: c.notion_page_id,
        spreadsheetRow: c.spreadsheet_row,
        name: c.name,
        companyName: c.company_name,
        email: c.email,
        leadStatus: c.lead_status,
        serviceType: c.service_type,
        contactDate: c.contact_date,
        comments: c.comments,
        isContacted: c.is_contacted,
        lastSyncedAt: c.last_synced_at,
        postalAddress: c.postal_address,
        youtubeChannel: c.youtube_channel,
        instagramAccount: c.instagram_account
    }));
  }

  async saveClient(client: Partial<NotionClient>) {
    if (!this.checkConnection()) return db.createClient(client);

    const payload = {
        notion_page_id: client.notionPageId,
        spreadsheet_row: client.spreadsheetRow,
        name: client.name,
        company_name: client.companyName,
        email: client.email,
        lead_status: client.leadStatus,
        service_type: client.serviceType,
        contact_date: client.contactDate,
        comments: client.comments,
        is_contacted: client.isContacted,
        postal_address: client.postalAddress,
        youtube_channel: client.youtubeChannel,
        instagram_account: client.instagramAccount,
        last_synced_at: new Date().toISOString()
    };

    if (client.id && client.id.length > 10) { // Si ID valide (UUID)
        const { data } = await supabase!.from('clients').update(payload).eq('id', client.id).select().single();
        return { ...client, ...data };
    } else {
        const { data } = await supabase!.from('clients').insert(payload).select().single();
        return { ...client, id: data.id };
    }
  }

  async archiveClient(clientId: string) {
    if (!this.checkConnection()) {
        db.softDeleteClient(clientId);
        return true;
    }

    const { error } = await supabase!
        .from('clients')
        .update({ is_archived: true })
        .eq('id', clientId);

    if (error) throw new Error(error.message);
    return true;
  }

  // --- PROJECTS ---
  async saveProject(project: Partial<Project>) {
    if (!this.checkConnection()) return db.createProject(project);

    const payload = {
        client_id: project.clientId,
        title: project.title,
        status: project.status,
        type: project.type,
        price: project.price,
        delivery_url: project.deliveryUrl,
        raw_files_url: project.rawFilesUrl,
        comments: project.comments,
        notion_page_id: project.notionPageId,
        updated_at: new Date().toISOString()
    };

    if (project.id && project.id.startsWith('proj_')) { // Mock ID handling, remove for pure prod
       // Insert new
       const { data } = await supabase!.from('projects').insert(payload).select().single();
       return { ...project, id: data.id };
    } else if (project.id) {
       const { data } = await supabase!.from('projects').upsert({ id: project.id, ...payload }).select().single();
       return { ...project, ...data };
    }
    const { data } = await supabase!.from('projects').insert(payload).select().single();
    return { ...project, id: data.id };
  }

  // --- MEDIA ---
  async saveMediaAsset(asset: Partial<MediaAsset>) {
    if (!this.checkConnection()) return db.addAsset(asset as any);

    const { data } = await supabase!.from('media_generations').insert({
        type: asset.type,
        prompt: asset.prompt,
        public_url: asset.publicUrl,
        width: asset.width,
        height: asset.height,
        duration: asset.duration,
        job_id: asset.jobId
    }).select().single();
    
    return { ...asset, id: data.id };
  }

  // --- INVOICES & CONTRACTS ---
  async getInvoices() {
      if (!this.checkConnection()) return db.getInvoices();
      const { data } = await supabase!.from('invoices').select('*, clients(name)').order('created_at', {ascending: false});
      return (data || []).map(i => ({
          id: i.id,
          number: i.number,
          clientId: i.client_id,
          amountHT: i.amount_ht,
          status: i.status,
          items: i.items,
          created_at: i.created_at,
          clients: i.clients
      }));
  }

  async updateInvoice(id: string, patch: Partial<Invoice>) {
      if (!this.checkConnection()) return db.updateInvoice(id, patch);
      
      const payload: any = {};
      if (patch.status !== undefined) payload.status = patch.status;
      if (patch.amountHT !== undefined) payload.amount_ht = patch.amountHT;

      const { error } = await supabase!
          .from('invoices')
          .update(payload)
          .eq('id', id);

      if (error) throw new Error(error.message);
      return true;
  }

  async getContracts() {
      if (!this.checkConnection()) return db.getContracts();
      const { data } = await supabase!.from('contracts').select('*, clients(name)').order('created_at', {ascending: false});
      return (data || []).map(c => ({
          id: c.id,
          clientId: c.client_id,
          templateId: c.template_id,
          contentSnapshot: c.content_snapshot,
          status: c.status,
          created_at: c.created_at,
          clients: c.clients
      }));
  }

  async updateContract(id: string, patch: Partial<Contract>) {
      if (!this.checkConnection()) return db.updateContract(id, patch);

      const payload: any = {};
      if (patch.status !== undefined) payload.status = patch.status;
      
      const { error } = await supabase!
          .from('contracts')
          .update(payload)
          .eq('id', id);

      if (error) throw new Error(error.message);
      return true;
  }
}

export const supabaseService = new SupabaseService();
