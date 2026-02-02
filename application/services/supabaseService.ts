
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { db } from './mockDatabase';
import type { NotionClient, Invoice, Contract, MediaAsset, Project, SystemSettings, AuditLog, GoogleAccount, ChatMessage, UserSession } from '../types';

/**
 * Service Supabase unifié pour la persistance des données
 * Fallback automatique sur mockDatabase si Supabase non configuré
 */
export class SupabaseService {

  private checkConnection(): boolean {
    if (isSupabaseConfigured() && supabase) return true;
    console.warn("[SupabaseService] Client non initialisé. Passage en mode Mock (Non persistant).");
    return false;
  }

  // ==========================================
  // SYSTEM SETTINGS
  // ==========================================
  async getSystemSettings(): Promise<SystemSettings | null> {
    if (!this.checkConnection()) return db.getSystemSettings();

    try {
      const { data, error } = await supabase!
        .from('system_settings')
        .select('config')
        .eq('key', 'app_settings')
        .single();

      if (error || !data) return db.getSystemSettings();
      return data.config as SystemSettings;
    } catch (e) {
      return db.getSystemSettings();
    }
  }

  async saveSystemSettings(settings: SystemSettings) {
    if (!this.checkConnection()) return db.updateSystemSettings(settings);

    try {
      const { data: existing } = await supabase!
        .from('system_settings')
        .select('id')
        .eq('key', 'app_settings')
        .single();

      if (existing) {
        await supabase!.from('system_settings').update({
          config: settings,
          value: settings,
          updated_at: new Date().toISOString()
        }).eq('id', existing.id);
      } else {
        await supabase!.from('system_settings').insert({
          key: 'app_settings',
          config: settings,
          value: settings,
          description: 'Configuration principale de l\'application'
        });
      }

      // Sync avec localStorage pour fallback
      db.updateSystemSettings(settings);
      return settings;
    } catch (e) {
      console.error('[Supabase] saveSystemSettings error:', e);
      return db.updateSystemSettings(settings);
    }
  }

  // ==========================================
  // API CREDENTIALS (Mode développeur)
  // ==========================================
  async getApiCredentials(): Promise<Record<string, string>> {
    if (!this.checkConnection()) {
      const settings = db.getSystemSettings();
      return settings.aiConfig as any || {};
    }

    try {
      const { data } = await supabase!
        .from('api_credentials')
        .select('api_name, api_key, api_value')
        .eq('status', 'active');

      const credentials: Record<string, string> = {};
      (data || []).forEach(row => {
        credentials[row.api_name] = row.api_key || row.api_value;
      });
      return credentials;
    } catch (e) {
      console.error('[Supabase] getApiCredentials error:', e);
      return {};
    }
  }

  async saveApiCredential(name: string, key: string, description?: string) {
    if (!this.checkConnection()) return;

    try {
      await supabase!.from('api_credentials').upsert({
        api_name: name,
        api_key: key,
        description: description || `API key for ${name}`,
        status: 'active',
        updated_at: new Date().toISOString()
      }, { onConflict: 'api_name' });
    } catch (e) {
      console.error('[Supabase] saveApiCredential error:', e);
    }
  }

  // ==========================================
  // AUDIT LOGS
  // ==========================================
  async addAuditLog(log: AuditLog) {
    if (!this.checkConnection()) return db.addAuditLog(log);

    try {
      await supabase!.from('audit_logs').insert({
        actor_id: log.actorId !== 'SYSTEM' ? log.actorId : null,
        actor_name: log.actorName,
        action: log.action,
        target_id: log.targetId,
        entity_type: log.entityType || 'system',
        metadata: log.metadata,
        level: log.level || 'info',
        created_at: log.timestamp || new Date().toISOString()
      });
    } catch (e) {
      console.error('[Supabase] addAuditLog error:', e);
      db.addAuditLog(log);
    }
  }

  async getRecentLogs(limit: number = 20): Promise<AuditLog[]> {
    if (!this.checkConnection()) return db.getRecentActivity(limit);

    try {
      const { data } = await supabase!
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      return (data || []).map(row => ({
        id: row.id,
        actorId: row.actor_id || 'SYSTEM',
        actorName: row.actor_name,
        action: row.action,
        targetId: row.target_id,
        entityType: row.entity_type,
        metadata: row.metadata,
        level: row.level,
        timestamp: row.created_at
      }));
    } catch (e) {
      return db.getRecentActivity(limit);
    }
  }

  // ==========================================
  // USERS & SESSIONS
  // ==========================================
  async getOrCreateUser(email: string, fullName?: string): Promise<any> {
    if (!this.checkConnection()) return { id: 'user_1', email, fullName };

    try {
      // Check existing user
      const { data: existing } = await supabase!
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (existing) {
        // Update last login
        await supabase!.from('users').update({
          last_login_at: new Date().toISOString()
        }).eq('id', existing.id);
        return existing;
      }

      // Create new user
      const { data: newUser } = await supabase!.from('users').insert({
        email,
        full_name: fullName,
        role: 'user',
        is_active: true,
        last_login_at: new Date().toISOString()
      }).select().single();

      return newUser;
    } catch (e) {
      console.error('[Supabase] getOrCreateUser error:', e);
      return { id: 'user_1', email, fullName };
    }
  }

  async createSession(userId: string, source: string = 'web'): Promise<string | null> {
    if (!this.checkConnection()) return null;

    try {
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await supabase!.from('sessions').insert({
        user_id: userId,
        session_token: token,
        source,
        expires_at: expiresAt.toISOString()
      });

      return token;
    } catch (e) {
      console.error('[Supabase] createSession error:', e);
      return null;
    }
  }

  // ==========================================
  // GOOGLE ACCOUNTS
  // ==========================================
  async saveGoogleAccount(userId: string, account: GoogleAccount) {
    // Always save to local first for immediate access
    db.saveGoogleAccount(userId, account);

    if (!this.checkConnection()) return;

    try {
      // Sauvegarder comme paramètre système chiffré
      await supabase!.from('system_settings').upsert({
        key: `google_account_${userId}`,
        value: {
          email: account.email,
          googleUserId: account.googleUserId,
          status: account.status,
          scopes: account.scopes,
          lastSyncedAt: account.lastSyncedAt
        },
        config: {
          accessTokenEncrypted: account.accessTokenEncrypted,
          refreshTokenEncrypted: account.refreshTokenEncrypted,
          tokenExpiryDate: account.tokenExpiryDate
        },
        is_encrypted: true,
        description: `Google account for user ${userId}`,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    } catch (e) {
      console.error('[Supabase] saveGoogleAccount error:', e);
    }
  }

  async getGoogleAccount(userId: string): Promise<GoogleAccount | null> {
    // Try local first
    const local = db.getGoogleAccount(userId);
    if (local) return local;

    if (!this.checkConnection()) return null;

    try {
      const { data } = await supabase!
        .from('system_settings')
        .select('value, config')
        .eq('key', `google_account_${userId}`)
        .single();

      if (!data) return null;

      return {
        userId,
        email: data.value.email,
        googleUserId: data.value.googleUserId,
        status: data.value.status,
        scopes: data.value.scopes,
        lastSyncedAt: data.value.lastSyncedAt,
        accessTokenEncrypted: data.config.accessTokenEncrypted,
        refreshTokenEncrypted: data.config.refreshTokenEncrypted,
        tokenExpiryDate: data.config.tokenExpiryDate
      };
    } catch (e) {
      return null;
    }
  }

  // ==========================================
  // CHAT HISTORY
  // ==========================================
  async saveChatMessage(message: ChatMessage) {
    db.addChatMessage(message); // Local backup

    if (!this.checkConnection()) return;

    try {
      await supabase!.from('chat_history').insert({
        session_id: message.sessionId,
        user_id: message.userId,
        role: message.role,
        content: message.content,
        metadata: message.metadata || {},
        source: message.source || 'web',
        created_at: message.timestamp || new Date().toISOString()
      });
    } catch (e) {
      console.error('[Supabase] saveChatMessage error:', e);
    }
  }

  async getChatHistory(sessionId: string, limit: number = 50): Promise<ChatMessage[]> {
    if (!this.checkConnection()) return db.getChatHistory(sessionId) || [];

    try {
      const { data } = await supabase!
        .from('chat_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(limit);

      return (data || []).map(row => ({
        id: row.id,
        sessionId: row.session_id,
        userId: row.user_id,
        role: row.role,
        content: row.content,
        metadata: row.metadata,
        source: row.source,
        timestamp: row.created_at
      }));
    } catch (e) {
      return db.getChatHistory(sessionId) || [];
    }
  }

  // ==========================================
  // NOTIFICATIONS
  // ==========================================
  async addNotification(notification: {
    userId?: string;
    type: string;
    title: string;
    message?: string;
    data?: any;
    sourceWorkflow?: string;
  }) {
    if (!this.checkConnection()) return;

    try {
      await supabase!.from('notifications').insert({
        user_id: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data || {},
        source_workflow: notification.sourceWorkflow,
        is_read: false
      });
    } catch (e) {
      console.error('[Supabase] addNotification error:', e);
    }
  }

  async getNotifications(userId?: string, unreadOnly: boolean = false): Promise<any[]> {
    if (!this.checkConnection()) return [];

    try {
      let query = supabase!
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (userId) query = query.eq('user_id', userId);
      if (unreadOnly) query = query.eq('is_read', false);

      const { data } = await query;
      return data || [];
    } catch (e) {
      return [];
    }
  }

  async markNotificationRead(notificationId: string) {
    if (!this.checkConnection()) return;

    try {
      await supabase!.from('notifications').update({
        is_read: true,
        read_at: new Date().toISOString()
      }).eq('id', notificationId);
    } catch (e) {
      console.error('[Supabase] markNotificationRead error:', e);
    }
  }

  // ==========================================
  // CLIENTS
  // ==========================================
  async getClients() {
    if (!this.checkConnection()) return db.getClients();

    try {
      const { data } = await supabase!
        .from('clients')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      return (data || []).map(c => ({
        id: c.id,
        notionPageId: c.notion_page_id,
        spreadsheetRow: c.spreadsheet_row,
        name: c.client_name,
        companyName: c.company_name,
        email: c.contact_email || c.email_or_site,
        phone: c.contact_phone,
        address: c.address,
        city: c.city,
        postalCode: c.postal_code,
        leadStatus: c.lead_status,
        serviceType: c.service_type,
        contactDate: c.contact_date,
        comments: c.comments,
        isContacted: c.is_contacted,
        giftSent: c.gift_sent,
        lastSyncedAt: c.last_synced_at,
        postalAddress: c.postal_address,
        youtubeChannel: c.youtube_channel,
        instagramAccount: c.instagram_account
      }));
    } catch (e) {
      return db.getClients();
    }
  }

  async saveClient(client: Partial<NotionClient>) {
    if (!this.checkConnection()) return db.createClient(client);

    try {
      const payload = {
        notion_page_id: client.notionPageId,
        spreadsheet_row: client.spreadsheetRow,
        client_name: client.name,
        company_name: client.companyName,
        contact_email: client.email,
        contact_phone: client.phone,
        address: client.address,
        city: client.city,
        postal_code: client.postalCode,
        lead_status: client.leadStatus,
        service_type: client.serviceType,
        contact_date: client.contactDate,
        comments: client.comments,
        is_contacted: client.isContacted,
        gift_sent: client.giftSent,
        postal_address: client.postalAddress,
        youtube_channel: client.youtubeChannel,
        instagram_account: client.instagramAccount,
        last_synced_at: new Date().toISOString()
      };

      if (client.id && typeof client.id === 'number') {
        const { data } = await supabase!
          .from('clients')
          .update(payload)
          .eq('id', client.id)
          .select()
          .single();
        return { ...client, ...data };
      } else {
        const { data } = await supabase!
          .from('clients')
          .insert(payload)
          .select()
          .single();
        return { ...client, id: data.id };
      }
    } catch (e) {
      console.error('[Supabase] saveClient error:', e);
      return db.createClient(client);
    }
  }

  async archiveClient(clientId: string | number) {
    if (!this.checkConnection()) {
      db.softDeleteClient(String(clientId));
      return true;
    }

    try {
      await supabase!
        .from('clients')
        .update({ is_archived: true })
        .eq('id', clientId);
      return true;
    } catch (e) {
      console.error('[Supabase] archiveClient error:', e);
      return false;
    }
  }

  // ==========================================
  // PROJECTS
  // ==========================================
  async getProjects() {
    if (!this.checkConnection()) return db.getProjects();

    try {
      const { data } = await supabase!
        .from('projects')
        .select('*, clients(client_name)')
        .order('created_at', { ascending: false });

      return (data || []).map(p => ({
        id: p.id,
        clientId: p.client_id,
        clientName: p.clients?.client_name,
        projectName: p.project_name,
        title: p.title || p.project_name,
        type: p.type || p.project_type,
        description: p.description,
        status: p.status,
        price: p.price || p.budget,
        startDate: p.start_date,
        endDate: p.end_date,
        deliveryUrl: p.delivery_url,
        rawFilesUrl: p.raw_files_url,
        comments: p.comments,
        notionPageId: p.notion_page_id
      }));
    } catch (e) {
      return db.getProjects();
    }
  }

  async saveProject(project: Partial<Project>) {
    if (!this.checkConnection()) return db.createProject(project);

    try {
      const payload = {
        client_id: project.clientId,
        project_name: project.title || project.projectName,
        title: project.title,
        project_type: project.type,
        type: project.type,
        description: project.description,
        status: project.status,
        budget: project.price,
        price: project.price,
        start_date: project.startDate,
        end_date: project.endDate,
        delivery_url: project.deliveryUrl,
        raw_files_url: project.rawFilesUrl,
        comments: project.comments,
        notion_page_id: project.notionPageId,
        updated_at: new Date().toISOString()
      };

      if (project.id && typeof project.id === 'number') {
        const { data } = await supabase!
          .from('projects')
          .update(payload)
          .eq('id', project.id)
          .select()
          .single();
        return { ...project, ...data };
      } else {
        const { data } = await supabase!
          .from('projects')
          .insert(payload)
          .select()
          .single();
        return { ...project, id: data.id };
      }
    } catch (e) {
      console.error('[Supabase] saveProject error:', e);
      return db.createProject(project);
    }
  }

  // ==========================================
  // MEDIA GENERATIONS
  // ==========================================
  async saveMediaGeneration(asset: {
    userId?: string;
    type: 'image' | 'video';
    provider?: string;
    modelId?: string;
    prompt: string;
    publicUrl?: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
    duration?: number;
    jobId?: string;
    status?: string;
    tags?: string[];
    metadata?: any;
  }) {
    db.addAsset(asset as any); // Local backup

    if (!this.checkConnection()) return asset;

    try {
      const { data } = await supabase!.from('media_generations').insert({
        user_id: asset.userId,
        type: asset.type,
        provider: asset.provider || 'pollinations',
        model_id: asset.modelId,
        prompt: asset.prompt,
        public_url: asset.publicUrl,
        thumbnail_url: asset.thumbnailUrl,
        width: asset.width,
        height: asset.height,
        duration: asset.duration,
        job_id: asset.jobId,
        status: asset.status || 'completed',
        tags: asset.tags || [],
        metadata: asset.metadata || {},
        is_favorite: false,
        is_archived: false
      }).select().single();

      return { ...asset, id: data?.id };
    } catch (e) {
      console.error('[Supabase] saveMediaGeneration error:', e);
      return asset;
    }
  }

  async getMediaGenerations(type?: 'image' | 'video', limit: number = 50): Promise<any[]> {
    if (!this.checkConnection()) {
      const assets = db.getAssets();
      return type ? assets.filter(a => a.type === type) : assets;
    }

    try {
      let query = supabase!
        .from('media_generations')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (type) query = query.eq('type', type);

      const { data } = await query;

      return (data || []).map(m => ({
        id: m.id,
        type: m.type,
        provider: m.provider,
        modelId: m.model_id,
        prompt: m.prompt,
        publicUrl: m.public_url,
        thumbnailUrl: m.thumbnail_url,
        width: m.width,
        height: m.height,
        duration: m.duration,
        jobId: m.job_id,
        status: m.status,
        tags: m.tags,
        metadata: m.metadata,
        isFavorite: m.is_favorite,
        createdAt: m.created_at
      }));
    } catch (e) {
      return db.getAssets();
    }
  }

  async toggleMediaFavorite(mediaId: string, isFavorite: boolean) {
    if (!this.checkConnection()) return;

    try {
      await supabase!
        .from('media_generations')
        .update({ is_favorite: isFavorite })
        .eq('id', mediaId);
    } catch (e) {
      console.error('[Supabase] toggleMediaFavorite error:', e);
    }
  }

  // ==========================================
  // INVOICES & CONTRACTS
  // ==========================================
  async getInvoices() {
    if (!this.checkConnection()) return db.getInvoices();

    try {
      const { data } = await supabase!
        .from('invoices')
        .select('*, clients(client_name)')
        .order('created_at', { ascending: false });

      return (data || []).map(i => ({
        id: i.id,
        number: i.invoice_number || i.number,
        clientId: i.client_id,
        projectId: i.project_id,
        issueDate: i.issue_date,
        dueDate: i.due_date,
        totalAmount: i.total_amount,
        taxAmount: i.tax_amount,
        subtotal: i.subtotal,
        amountHT: i.amount_ht || i.subtotal,
        status: i.status,
        paymentStatus: i.payment_status,
        items: i.items,
        createdAt: i.created_at,
        clientName: i.clients?.client_name
      }));
    } catch (e) {
      return db.getInvoices();
    }
  }

  async saveInvoice(invoice: Partial<Invoice>) {
    if (!this.checkConnection()) return db.createInvoice(invoice);

    try {
      const payload = {
        invoice_number: invoice.number,
        client_id: invoice.clientId,
        project_id: invoice.projectId,
        issue_date: invoice.issueDate || new Date().toISOString(),
        due_date: invoice.dueDate,
        total_amount: invoice.totalAmount,
        tax_amount: invoice.taxAmount,
        subtotal: invoice.amountHT,
        amount_ht: invoice.amountHT,
        status: invoice.status || 'draft',
        payment_status: invoice.paymentStatus || 'unpaid',
        items: invoice.items || []
      };

      if (invoice.id) {
        const { data } = await supabase!
          .from('invoices')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', invoice.id)
          .select()
          .single();
        return { ...invoice, ...data };
      } else {
        const { data } = await supabase!
          .from('invoices')
          .insert(payload)
          .select()
          .single();
        return { ...invoice, id: data.id };
      }
    } catch (e) {
      console.error('[Supabase] saveInvoice error:', e);
      return db.createInvoice(invoice);
    }
  }

  async updateInvoice(id: string | number, patch: Partial<Invoice>) {
    if (!this.checkConnection()) return db.updateInvoice(String(id), patch);

    try {
      const payload: any = { updated_at: new Date().toISOString() };
      if (patch.status !== undefined) payload.status = patch.status;
      if (patch.paymentStatus !== undefined) payload.payment_status = patch.paymentStatus;
      if (patch.amountHT !== undefined) {
        payload.amount_ht = patch.amountHT;
        payload.subtotal = patch.amountHT;
      }
      if (patch.items !== undefined) payload.items = patch.items;

      await supabase!.from('invoices').update(payload).eq('id', id);
      return true;
    } catch (e) {
      console.error('[Supabase] updateInvoice error:', e);
      return false;
    }
  }

  async getContracts() {
    if (!this.checkConnection()) return db.getContracts();

    try {
      const { data } = await supabase!
        .from('contracts')
        .select('*, clients(client_name)')
        .order('created_at', { ascending: false });

      return (data || []).map(c => ({
        id: c.id,
        clientId: c.client_id,
        templateId: c.template_id,
        contentSnapshot: c.content_snapshot,
        status: c.status,
        signedAt: c.signed_at,
        signedBy: c.signed_by,
        metadata: c.metadata,
        createdAt: c.created_at,
        clientName: c.clients?.client_name
      }));
    } catch (e) {
      return db.getContracts();
    }
  }

  async updateContract(id: string, patch: Partial<Contract>) {
    if (!this.checkConnection()) return db.updateContract(id, patch);

    try {
      const payload: any = { updated_at: new Date().toISOString() };
      if (patch.status !== undefined) payload.status = patch.status;
      if (patch.signedAt !== undefined) payload.signed_at = patch.signedAt;
      if (patch.signedBy !== undefined) payload.signed_by = patch.signedBy;

      await supabase!.from('contracts').update(payload).eq('id', id);
      return true;
    } catch (e) {
      console.error('[Supabase] updateContract error:', e);
      return false;
    }
  }

  // ==========================================
  // COMPANY INFO
  // ==========================================
  async getCompanyInfo() {
    if (!this.checkConnection()) {
      const settings = db.getSystemSettings();
      return settings.company || null;
    }

    try {
      const { data } = await supabase!
        .from('company_info')
        .select('*')
        .limit(1)
        .single();

      if (!data) return null;

      return {
        id: data.id,
        companyName: data.company_name,
        contactPerson: data.contact_person,
        address: data.address,
        email: data.email,
        website: data.website,
        siren: data.siren,
        siret: data.siret,
        tva: data.tva
      };
    } catch (e) {
      return null;
    }
  }

  async saveCompanyInfo(info: any) {
    if (!this.checkConnection()) {
      const settings = db.getSystemSettings();
      settings.company = info;
      db.updateSystemSettings(settings);
      return info;
    }

    try {
      const payload = {
        company_name: info.companyName,
        contact_person: info.contactPerson,
        address: info.address,
        email: info.email,
        website: info.website,
        siren: info.siren,
        siret: info.siret,
        tva: info.tva,
        updated_at: new Date().toISOString()
      };

      const { data: existing } = await supabase!
        .from('company_info')
        .select('id')
        .limit(1)
        .single();

      if (existing) {
        await supabase!.from('company_info').update(payload).eq('id', existing.id);
        return { ...info, id: existing.id };
      } else {
        const { data } = await supabase!.from('company_info').insert(payload).select().single();
        return { ...info, id: data?.id };
      }
    } catch (e) {
      console.error('[Supabase] saveCompanyInfo error:', e);
      return info;
    }
  }

  // ==========================================
  // VIDEO PROJECTS
  // ==========================================
  async getVideoProjects() {
    if (!this.checkConnection()) return [];

    try {
      const { data } = await supabase!
        .from('video_projects')
        .select('*, projects(project_name)')
        .order('created_at', { ascending: false });

      return (data || []).map(v => ({
        id: v.id,
        projectId: v.project_id,
        name: v.name,
        description: v.description,
        type: v.type,
        status: v.status,
        clientName: v.client_name,
        specs: v.specs,
        durationSeconds: v.duration_seconds,
        deadline: v.deadline,
        deliveryFormats: v.delivery_formats,
        notes: v.notes,
        createdAt: v.created_at
      }));
    } catch (e) {
      return [];
    }
  }

  async saveVideoProject(project: any) {
    if (!this.checkConnection()) return project;

    try {
      const payload = {
        project_id: project.projectId,
        name: project.name,
        description: project.description,
        type: project.type,
        status: project.status || 'planning',
        client_name: project.clientName,
        specs: project.specs || { resolution: '1920x1080', fps: 30, format: 'mp4' },
        duration_seconds: project.durationSeconds,
        deadline: project.deadline,
        delivery_formats: project.deliveryFormats,
        notes: project.notes,
        updated_at: new Date().toISOString()
      };

      if (project.id) {
        const { data } = await supabase!
          .from('video_projects')
          .update(payload)
          .eq('id', project.id)
          .select()
          .single();
        return { ...project, ...data };
      } else {
        const { data } = await supabase!
          .from('video_projects')
          .insert(payload)
          .select()
          .single();
        return { ...project, id: data?.id };
      }
    } catch (e) {
      console.error('[Supabase] saveVideoProject error:', e);
      return project;
    }
  }

  // ==========================================
  // WORKFLOW LOGS (N8N Integration)
  // ==========================================
  async logWorkflowExecution(log: {
    workflowName: string;
    workflowId?: string;
    executionId?: string;
    status: 'started' | 'success' | 'error' | 'warning';
    message?: string;
    data?: any;
    errorDetails?: any;
    durationMs?: number;
  }) {
    if (!this.checkConnection()) return;

    try {
      await supabase!.from('workflow_logs').insert({
        workflow_name: log.workflowName,
        workflow_id: log.workflowId,
        execution_id: log.executionId,
        status: log.status,
        message: log.message,
        data: log.data || {},
        error_details: log.errorDetails,
        duration_ms: log.durationMs
      });
    } catch (e) {
      console.error('[Supabase] logWorkflowExecution error:', e);
    }
  }

  async getWorkflowLogs(workflowName?: string, limit: number = 50): Promise<any[]> {
    if (!this.checkConnection()) return [];

    try {
      let query = supabase!
        .from('workflow_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (workflowName) query = query.eq('workflow_name', workflowName);

      const { data } = await query;
      return data || [];
    } catch (e) {
      return [];
    }
  }
}

export const supabaseService = new SupabaseService();
