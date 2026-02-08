
import { db } from './mockDatabase';
import { NotionClient, Project, ProjectStatus, ProjectType } from '../types';

// --- TYPES ---

export interface NotionPage {
  id: string;
  created_time: string;
  last_edited_time: string;
  url: string;
  properties: Record<string, any>;
}

export interface NotionQueryResponse {
  results: NotionPage[];
  has_more: boolean;
  next_cursor?: string;
}

export interface ValidationResult {
  isValid: boolean;
  missingProperties: string[];
  errors: string[];
}

export class NotionRepository {
  private apiKey: string = '';
  private crmDatabaseId: string = '';
  private projectsDatabaseId: string = '';
  private isConfigured: boolean = false;

  // --- CACHE SYSTEM ---
  private cache = new Map<string, {
    data: any;
    timestamp: number;
    expiresIn: number;
  }>();

  private getCacheKey(method: string, ...args: any[]): string {
    return `${method}_${JSON.stringify(args)}`;
  }

  private checkCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    const now = Date.now();
    if (now - cached.timestamp > cached.expiresIn * 1000) {
      this.cache.delete(key);
      return null;
    }
    return cached.data;
  }

  private setCache(key: string, data: any, expiresIn: number = 300) {
    this.cache.set(key, { data, timestamp: Date.now(), expiresIn });
  }

  public clearCache() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`[NotionRepository] Cache cleared (${size} entries removed).`);
  }

  // --- RETRY LOGIC ---
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (lastError.message.includes('Failed to fetch')) throw lastError;
        const waitTime = delayMs * Math.pow(2, i);
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    throw lastError;
  }

  constructor() {
    this.loadConfig();
  }

  public loadConfig() {
    const settings = db.getSystemSettings();

    // New config structure: settings.notion
    if (settings.notion?.apiKey) {
      this.apiKey = settings.notion.apiKey;
      this.crmDatabaseId = this.extractDatabaseId(settings.notion.crmDatabaseId || settings.notion.crmDatabaseUrl);
      this.projectsDatabaseId = this.extractDatabaseId(settings.notion.projectsDatabaseId || settings.notion.projectsDatabaseUrl);
    }
    // Legacy fallback
    else if (settings.notionTokenEncrypted) {
      this.apiKey = db.decrypt(settings.notionTokenEncrypted);
      this.projectsDatabaseId = settings.notionDatabaseId || '';
    } else if (settings.clients?.notionApiKey) {
      this.apiKey = settings.clients.notionApiKey;
      this.projectsDatabaseId = this.extractDatabaseId(settings.clients?.notionProjectsUrl) || '';
    }

    this.isConfigured = !!(this.apiKey && (this.crmDatabaseId || this.projectsDatabaseId));
  }

  private extractDatabaseId(url?: string): string {
    if (!url) return '';
    // Handle full URLs: extract 32-char hex ID
    const match = url.match(/([a-f0-9]{32})/);
    if (match) return match[1];
    // Handle UUID format with dashes
    const uuidMatch = url.match(/([a-f0-9-]{36})/);
    if (uuidMatch) return uuidMatch[1].replace(/-/g, '');
    return url;
  }

  public getStatus() {
    return {
      configured: this.isConfigured,
      hasCrmDb: !!this.crmDatabaseId,
      hasProjectsDb: !!this.projectsDatabaseId,
    };
  }

  // --- API CALL ---

  private async callNotion(endpoint: string, method: 'GET'|'POST'|'PATCH' = 'GET', body?: any): Promise<any> {
    if (!this.isConfigured) return this.mockResponse(endpoint);

    try {
      return await this.executeWithRetry(async () => {
        const response = await fetch('/api/proxy/notion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint,
            method,
            body,
            headers: { 'Authorization': `Bearer ${this.apiKey}` }
          })
        });

        if (!response.ok) {
          if (response.status === 404) throw new Error("Proxy unavailable");
          const err = await response.json();
          throw new Error(err.error || `Notion API Error ${response.status}`);
        }

        return response.json();
      });
    } catch (e) {
      console.warn(`[NotionRepository] API call failed (${(e as Error).message}), using mock.`);
      return this.mockResponse(endpoint);
    }
  }

  private mockResponse(endpoint: string): any {
    if (endpoint.includes('query')) {
      return { results: [], has_more: false };
    }
    if (endpoint.includes('pages')) {
      return { id: `mock_page_${Date.now()}`, properties: {} };
    }
    if (endpoint.includes('databases')) {
      return { properties: {} };
    }
    return {};
  }

  // ================================================================
  //  CRM CLIENTS (Notion Database)
  // ================================================================

  /**
   * Query all clients from the CRM Notion database
   */
  async syncClients(): Promise<{ updated: number; added: number; data: NotionClient[] }> {
    if (!this.crmDatabaseId) {
      console.warn('[NotionRepository] CRM Database ID not configured');
      return { updated: 0, added: 0, data: [] };
    }

    const cacheKey = this.getCacheKey('syncClients');
    const cached = this.checkCache(cacheKey);
    if (cached) return cached;

    const allPages: NotionPage[] = [];
    let hasMore = true;
    let startCursor: string | undefined;

    while (hasMore) {
      const response: NotionQueryResponse = await this.callNotion(
        `/databases/${this.crmDatabaseId}/query`,
        'POST',
        {
          start_cursor: startCursor,
          page_size: 100,
        }
      );
      allPages.push(...response.results);
      hasMore = response.has_more;
      startCursor = response.next_cursor;
    }

    const clients = allPages.map(page => this.mapPageToClient(page));
    const result = { updated: clients.length, added: 0, data: clients };
    this.setCache(cacheKey, result, 120);
    return result;
  }

  /**
   * Map a Notion page to a NotionClient
   * Adapts to common Notion CRM property names (French)
   */
  private mapPageToClient(page: NotionPage): NotionClient {
    const props = page.properties;
    return {
      id: `nc_${page.id.replace(/-/g, '')}`,
      notionPageId: page.id,
      name: this.extractTitle(props['Nom'] || props['Name'] || props['Titre'] || props['name']),
      companyName: this.extractRichText(props['Entreprise'] || props['Company'] || props['Société']),
      email: this.extractEmail(props['Email'] || props['email'] || props['E-mail']),
      isArchived: false,
      lastSyncedAt: page.last_edited_time,
      notionUrl: page.url,
      leadStatus: this.extractSelect(props['Statut'] || props['Status'] || props['Lead Status']),
      emailOrSite: this.extractRichText(props['Site web'] || props['Website'] || props['URL']) || this.extractUrl(props['Site web'] || props['Website']),
      postalAddress: this.extractRichText(props['Adresse'] || props['Address']),
      youtubeChannel: this.extractRichText(props['YouTube'] || props['Chaîne YouTube']),
      instagramAccount: this.extractRichText(props['Instagram']),
      serviceType: this.extractSelect(props['Service'] || props['Type de service'] || props['Type']),
      contactDate: this.extractDate(props['Date de contact'] || props['Date'] || props['Created']),
      isContacted: this.extractCheckbox(props['Contacté'] || props['Contacted']),
      giftSent: this.extractCheckbox(props['Cadeau envoyé'] || props['Gift sent']),
      comments: this.extractRichText(props['Notes'] || props['Commentaires'] || props['Comments']),
    };
  }

  /**
   * Create or update a client in the CRM Notion database
   */
  async upsertClientToNotion(client: Partial<NotionClient>): Promise<{ success: boolean; notionPageId?: string }> {
    if (!this.crmDatabaseId) return { success: false };

    const properties: Record<string, any> = {};

    if (client.name) {
      properties['Nom'] = { title: [{ text: { content: client.name } }] };
    }
    if (client.companyName) {
      properties['Entreprise'] = { rich_text: [{ text: { content: client.companyName } }] };
    }
    if (client.email) {
      properties['Email'] = { email: client.email };
    }
    if (client.leadStatus) {
      properties['Statut'] = { select: { name: client.leadStatus } };
    }
    if (client.serviceType) {
      properties['Service'] = { select: { name: client.serviceType } };
    }
    if (client.youtubeChannel) {
      properties['YouTube'] = { rich_text: [{ text: { content: client.youtubeChannel } }] };
    }
    if (client.instagramAccount) {
      properties['Instagram'] = { rich_text: [{ text: { content: client.instagramAccount } }] };
    }
    if (client.comments) {
      properties['Notes'] = { rich_text: [{ text: { content: client.comments } }] };
    }
    if (client.contactDate) {
      properties['Date de contact'] = { date: { start: client.contactDate } };
    }
    if (client.isContacted !== undefined) {
      properties['Contacté'] = { checkbox: client.isContacted };
    }
    if (client.giftSent !== undefined) {
      properties['Cadeau envoyé'] = { checkbox: client.giftSent };
    }

    try {
      if (client.notionPageId) {
        // UPDATE existing page
        await this.callNotion(`/pages/${client.notionPageId}`, 'PATCH', { properties });
        this.clearCache();
        return { success: true, notionPageId: client.notionPageId };
      } else {
        // CREATE new page
        const result = await this.callNotion('/pages', 'POST', {
          parent: { database_id: this.crmDatabaseId },
          properties
        });
        this.clearCache();
        return { success: true, notionPageId: result.id };
      }
    } catch (e) {
      console.error('[NotionRepository] upsertClient failed:', e);
      return { success: false };
    }
  }

  /**
   * Archive (soft-delete) a client in Notion
   */
  async archiveClient(notionPageId: string): Promise<boolean> {
    try {
      await this.callNotion(`/pages/${notionPageId}`, 'PATCH', { archived: true });
      this.clearCache();
      return true;
    } catch { return false; }
  }

  // ================================================================
  //  PROJECTS (Notion Database)
  // ================================================================

  /**
   * Query all projects from the Projects Notion database
   */
  async syncProjects(): Promise<{ updated: number; added: number; data: Project[] }> {
    if (!this.projectsDatabaseId) {
      console.warn('[NotionRepository] Projects Database ID not configured');
      return { updated: 0, added: 0, data: [] };
    }

    const cacheKey = this.getCacheKey('syncProjects');
    const cached = this.checkCache(cacheKey);
    if (cached) return cached;

    const allPages: NotionPage[] = [];
    let hasMore = true;
    let startCursor: string | undefined;

    while (hasMore) {
      const response: NotionQueryResponse = await this.callNotion(
        `/databases/${this.projectsDatabaseId}/query`,
        'POST',
        {
          start_cursor: startCursor,
          page_size: 100,
        }
      );
      allPages.push(...response.results);
      hasMore = response.has_more;
      startCursor = response.next_cursor;
    }

    const projects = allPages.map(page => this.mapPageToProject(page));
    const result = { updated: projects.length, added: 0, data: projects };
    this.setCache(cacheKey, result, 120);
    return result;
  }

  /**
   * Map a Notion page to a Project
   */
  private mapPageToProject(page: NotionPage): Project {
    const props = page.properties;
    const statusRaw = this.extractSelect(props['Statut'] || props['Status']) || 'À faire';
    const typeRaw = this.extractSelect(props['Type'] || props['Type de projet']) || 'Autre';

    return {
      id: `proj_${page.id.replace(/-/g, '')}`,
      notionPageId: page.id,
      clientId: this.extractRichText(props['Client ID'] || props['ClientId']) || 'unknown',
      clientName: this.extractRichText(props['Client'] || props['client']),
      title: this.extractTitle(props['Titre'] || props['Name'] || props['Nom'] || props['Title']),
      status: this.normalizeProjectStatus(statusRaw),
      type: this.normalizeProjectType(typeRaw),
      rawFilesUrl: this.extractUrl(props['Fichiers bruts'] || props['Raw Files']),
      deliveryUrl: this.extractUrl(props['Livraison'] || props['Delivery URL']),
      price: this.extractNumber(props['Prix'] || props['Price'] || props['Tarif']),
      startDate: this.extractDate(props['Date début'] || props['Start date'] || props['Date']),
      endDate: this.extractDate(props['Date fin'] || props['End date'] || props['Deadline']),
      comments: this.extractRichText(props['Notes'] || props['Commentaires']),
      createdAt: page.created_time,
    };
  }

  private normalizeProjectStatus(raw: string): ProjectStatus {
    const map: Record<string, ProjectStatus> = {
      'à faire': 'À faire', 'a faire': 'À faire', 'todo': 'À faire', 'backlog': 'À faire',
      'en cours': 'En cours', 'in progress': 'En cours', 'doing': 'En cours',
      'montage': 'Montage', 'editing': 'Montage',
      'validation': 'Validation', 'review': 'Validation',
      'terminé': 'Terminé', 'done': 'Terminé', 'fini': 'Terminé', 'completed': 'Terminé',
      'archivé': 'Archivé', 'archived': 'Archivé',
    };
    return map[raw.toLowerCase()] || 'À faire';
  }

  private normalizeProjectType(raw: string): ProjectType {
    const map: Record<string, ProjectType> = {
      'shorts': 'Shorts', 'short': 'Shorts',
      'long-form': 'Long-form', 'longform': 'Long-form', 'long form': 'Long-form', 'video': 'Long-form',
      'publicité': 'Publicité', 'pub': 'Publicité', 'ad': 'Publicité', 'ads': 'Publicité',
      'tiktok': 'TikTok',
      'instagram': 'Instagram', 'reel': 'Instagram', 'reels': 'Instagram',
    };
    return map[raw.toLowerCase()] || 'Autre';
  }

  /**
   * Create a project in Notion for a given client
   */
  async createProjectForClient(client: NotionClient): Promise<Project> {
    const projectTitle = `${client.name || client.companyName} - Nouveau Projet`;

    const result = await this.callNotion('/pages', 'POST', {
      parent: { database_id: this.projectsDatabaseId },
      properties: {
        'Titre': { title: [{ text: { content: projectTitle } }] },
        'Client': { rich_text: [{ text: { content: client.name } }] },
        'Statut': { select: { name: 'À faire' } },
      }
    });

    this.clearCache();

    return {
      id: `proj_${(result.id || Date.now()).toString().replace(/-/g, '')}`,
      notionPageId: result.id,
      clientId: client.id,
      clientName: client.name || client.companyName,
      title: projectTitle,
      status: 'À faire',
      type: 'Autre',
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Create or update a project in Notion
   */
  async upsertProjectToNotion(project: Partial<Project>): Promise<{ success: boolean; notionPageId?: string }> {
    if (!this.projectsDatabaseId) return { success: false };

    const properties: Record<string, any> = {};

    if (project.title) {
      properties['Titre'] = { title: [{ text: { content: project.title } }] };
    }
    if (project.clientName) {
      properties['Client'] = { rich_text: [{ text: { content: project.clientName } }] };
    }
    if (project.status) {
      properties['Statut'] = { select: { name: project.status } };
    }
    if (project.type) {
      properties['Type'] = { select: { name: project.type } };
    }
    if (project.price !== undefined) {
      properties['Prix'] = { number: project.price };
    }
    if (project.startDate) {
      properties['Date début'] = { date: { start: project.startDate } };
    }
    if (project.endDate) {
      properties['Date fin'] = { date: { start: project.endDate } };
    }
    if (project.comments) {
      properties['Notes'] = { rich_text: [{ text: { content: project.comments } }] };
    }

    try {
      if (project.notionPageId) {
        await this.callNotion(`/pages/${project.notionPageId}`, 'PATCH', { properties });
        this.clearCache();
        return { success: true, notionPageId: project.notionPageId };
      } else {
        const result = await this.callNotion('/pages', 'POST', {
          parent: { database_id: this.projectsDatabaseId },
          properties
        });
        this.clearCache();
        return { success: true, notionPageId: result.id };
      }
    } catch (e) {
      console.error('[NotionRepository] upsertProject failed:', e);
      return { success: false };
    }
  }

  /**
   * Sync a single project back to Notion
   */
  async syncProjectToNotion(project: Project): Promise<boolean> {
    if (!project.notionPageId) return false;
    try {
      await this.callNotion(`/pages/${project.notionPageId}`, 'PATCH', {
        properties: {
          'Titre': { title: [{ text: { content: project.title } }] },
          'Statut': { select: { name: project.status } },
          ...(project.type && { 'Type': { select: { name: project.type } } }),
        }
      });
      this.clearCache();
      return true;
    } catch { return false; }
  }

  // ================================================================
  //  VALIDATION & CONNECTION TEST
  // ================================================================

  async validateConnection(token?: string, dbId?: string): Promise<boolean> {
    if (token) this.apiKey = token;
    if (dbId) {
      this.crmDatabaseId = this.extractDatabaseId(dbId);
      this.isConfigured = true;
    }
    if (!this.apiKey) return false;

    this.isConfigured = true;
    try {
      const user = await this.callNotion('/users/me', 'GET');
      return !!user?.id || !!user?.type;
    } catch { return false; }
  }

  async validateNotionDatabase(dbType: 'crm' | 'projects' = 'projects'): Promise<ValidationResult> {
    const dbId = dbType === 'crm' ? this.crmDatabaseId : this.projectsDatabaseId;
    if (!dbId) return { isValid: false, missingProperties: [], errors: ['Database ID not configured'] };

    try {
      const dbInfo = await this.callNotion(`/databases/${dbId}`, 'GET');
      const propNames = Object.keys(dbInfo.properties || {});
      return { isValid: !!dbInfo.id, missingProperties: [], errors: [] };
    } catch (e: any) {
      return { isValid: false, missingProperties: [], errors: [e.message] };
    }
  }

  // ================================================================
  //  PROPERTY EXTRACTORS
  // ================================================================

  private extractTitle(prop: any): string {
    return prop?.title?.[0]?.text?.content || prop?.title?.[0]?.plain_text || 'Sans titre';
  }
  private extractRichText(prop: any): string {
    return prop?.rich_text?.map((t: any) => t.text?.content || t.plain_text || '').join('') || '';
  }
  private extractSelect(prop: any): string | undefined {
    return prop?.select?.name;
  }
  private extractMultiSelect(prop: any): string[] {
    return prop?.multi_select?.map((s: any) => s.name) || [];
  }
  private extractUrl(prop: any): string | undefined {
    return prop?.url || undefined;
  }
  private extractNumber(prop: any): number | undefined {
    return typeof prop?.number === 'number' ? prop.number : undefined;
  }
  private extractDate(prop: any): string | undefined {
    return prop?.date?.start || undefined;
  }
  private extractEmail(prop: any): string | undefined {
    return prop?.email || undefined;
  }
  private extractCheckbox(prop: any): boolean {
    return prop?.checkbox === true;
  }
}

export const notionService = new NotionRepository();
