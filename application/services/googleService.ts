
import { db } from './mockDatabase';
import { GoogleAccount, EmailMessage, CalendarEvent, DriveFile } from '../types';
import { n8nAgentService } from '../lib/n8nAgentService'; // Import pour logging

export class GoogleIntegrationService {
  
  // --- CACHE & RETRY SYSTEM ---
  private cache = new Map<string, {
    data: any;
    timestamp: number;
    expiresIn: number; // en secondes
  }>();
  
  private checkCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > cached.expiresIn * 1000) {
      this.cache.delete(key);
      return null;
    }
    return cached.data;
  }
  
  private setCache(key: string, data: any, expiresIn: number = 300) {
    this.cache.set(key, { data, timestamp: Date.now(), expiresIn });
  }

  public clearCache() {
      this.cache.clear();
  }

  public invalidateCache(keyPrefix?: string) {
      if (keyPrefix) {
          for (const key of this.cache.keys()) {
              if (key.includes(keyPrefix)) this.cache.delete(key);
          }
      } else {
          this.cache.clear();
      }
  }

  // --- HELPER N8N ---
  
  /**
   * Tente d'appeler le webhook N8N configuré.
   * Retourne null si non configuré ou échec.
   */
  private async callN8nGoogleWebhook(action: string, payload: any = {}): Promise<any> {
      const settings = db.getSystemSettings();
      // On cherche spécifiquement le webhook Google Workspace
      const webhook = settings.webhooks?.google_workspace;

      if (!webhook || !webhook.enabled || !webhook.url) {
          console.debug(`[GoogleService] Webhook not configured for action: ${action}`);
          return null; // Pas de webhook configuré
      }

      console.log(`[GoogleService] Calling N8N Webhook: ${action} - Waiting for response...`);
      const startTime = Date.now();
      const logPayload = { action, ...payload };

      try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

          const response = await fetch(webhook.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              // Structure claire pour le nœud Switch de n8n
              body: JSON.stringify({
                  action: action, // Utiliser cette clé dans le Switch n8n
                  payload: payload,
                  userId: 'user_1', // Mock ID
                  timestamp: new Date().toISOString()
              })
          });

          clearTimeout(timeoutId);

          const responseText = await response.text();
          let json: any = {};
          try {
              json = JSON.parse(responseText);
          } catch(e) {
              json = { raw: responseText };
          }

          if (!response.ok) {
              // Log failure to monitor
              n8nAgentService.logExecution('google_workspace', logPayload, json, 'error', Date.now() - startTime);
              throw new Error(`N8N Webhook Error: ${response.status}`);
          }
          
          console.log(`[GoogleService] N8N Response received for ${action}:`, json);
          
          // Log success to monitor
          n8nAgentService.logExecution('google_workspace', logPayload, json, 'success', Date.now() - startTime);

          // On suppose que n8n renvoie directement les données ou encapsulées dans 'data'
          return json.data || json; 
      } catch (e: any) {
          console.warn(`[GoogleService] Webhook '${action}' failed, falling back to mock/api.`, e);
          // Log error if not already logged (network failure)
          n8nAgentService.logExecution('google_workspace', logPayload, { error: e.message }, 'error', Date.now() - startTime);
          return null;
      }
  }

  // --- TOKEN MANAGEMENT (Legacy / Direct API) ---

  private async getAccessToken(userId: string): Promise<string> {
      try {
          const response = await fetch(`/api/auth/google/refresh?userId=${userId}`);
          
          if (!response.ok) {
              if (response.status === 401 || response.status === 403) {
                  db.disconnectGoogleAccount(userId); 
                  throw new Error("AUTH_REQUIRED");
              }
              throw new Error("Erreur serveur lors de la récupération du token");
          }

          const data = await response.json();
          return data.accessToken;
      } catch (error: any) {
          if (error.message === "AUTH_REQUIRED") throw error;
          const acc = db.getGoogleAccount(userId);
          if (acc && acc.status === 'connected') {
              return 'mock_token';
          }
          throw error;
      }
  }

  public async fetchGoogle(endpoint: string, userId: string, options: RequestInit = {}) {
        let accessToken;
        try {
            accessToken = await this.getAccessToken(userId);
        } catch (e: any) {
            if (e.message === "AUTH_REQUIRED") throw new Error("Session Google expirée.");
            throw e;
        }
        
        if (accessToken === 'mock_token') throw new Error("MOCK_MODE");

        const headers: Record<string, string> = {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          ...(options.headers as Record<string, string> || {})
        };

        const response = await fetch(endpoint, { ...options, headers });

        if (response.status === 401) {
            await this.disconnectAccount(userId);
            throw new Error("Session Google révoquée.");
        }

        if (response.status === 429) throw new Error("Google API Rate Limit.");

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `Erreur API Google ${response.status}`);
        }

        return response.json();
  }

  async getAccountStatus(userId: string): Promise<{ connected: boolean; email?: string; status: 'live' | 'mock' | 'error' | 'disconnected'; lastSyncedAt?: string }> {
    // 1. Priorité au Webhook N8N pour le statut "Live"
    // Si le webhook est actif et contient une URL, on considère que le service est connecté (mode délégué)
    const settings = db.getSystemSettings();
    if (settings.webhooks?.google_workspace?.enabled && settings.webhooks?.google_workspace?.url && settings.webhooks.google_workspace.url.startsWith('http')) {
        return { 
            connected: true, 
            status: 'live', // On force 'live' pour que les composants (MailClient, CalendarClient) tentent de fetcher
            email: 'n8n-managed@workspace.com', 
            lastSyncedAt: new Date().toISOString() 
        };
    }

    // 2. Legacy / Direct Auth
    const acc = db.getGoogleAccount(userId);
    if (acc) {
        return { 
            connected: true, 
            status: acc.accessTokenEncrypted.includes('fake') ? 'mock' : 'live',
            email: acc.email,
            lastSyncedAt: acc.lastSyncedAt
        };
    }

    return { connected: false, status: 'disconnected' };
  }

  getAuthUrl(userId: string) {
      return `/api/auth/google/start?userId=${userId}`;
  }

  // --- SERVICES IMPLEMENTATION (WEBHOOK FIRST -> API -> MOCK) ---

  async listMessages(userId: string, label: string = 'INBOX'): Promise<EmailMessage[]> {
    // 1. Try N8N Webhook with action 'list_messages'
    // IMPORTANT: Le callN8nGoogleWebhook vérifie si l'URL est configurée dans settings.webhooks.google_workspace
    const n8nData = await this.callN8nGoogleWebhook('list_messages', { label, userId });

    // Le workflow n8n retourne un objet combiné {success, emails: [...], events: [...]}
    // On extrait le champ 'emails', ou on accepte un tableau direct
    const emailsArray = n8nData?.emails || (Array.isArray(n8nData) ? n8nData : null);

    if (emailsArray && Array.isArray(emailsArray)) {
        return emailsArray.map((m: any) => ({
            ...m,
            // Fallback fields si n8n renvoie un objet partiel
            id: m.id || `msg_${Date.now()}_${Math.random()}`,
            threadId: m.threadId || m.id,
            snippet: m.snippet || "",
            isRead: m.isRead !== undefined ? m.isRead : true
        }));
    }

    // 2. Fallback Direct Google API (Seulement si OAuth classique configuré)
    try {
        const data = await this.fetchGoogle(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=label:${label}&maxResults=20`, userId);
        if (data.messages) {
            const details = await Promise.all(
                data.messages.map((m: any) => this.fetchGoogle(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}`, userId).catch(() => null))
            );
            return details.filter(Boolean).map((m: any) => ({
                id: m.id, threadId: m.threadId, labelIds: m.labelIds,
                from: m.payload.headers.find((h: any) => h.name === 'From')?.value || '',
                to: m.payload.headers.find((h: any) => h.name === 'To')?.value || '',
                subject: m.payload.headers.find((h: any) => h.name === 'Subject')?.value || '(Sans objet)',
                snippet: m.snippet, body: m.payload.body?.data || "Contenu email...",
                date: new Date(parseInt(m.internalDate)).toISOString(),
                isRead: !m.labelIds.includes('UNREAD'), hasAttachments: false
            }));
        }
        return [];
    } catch (e) {
        // 3. Fallback Mock (Activé si N8N échoue ou API échoue)
        console.warn("N8N/Google API failed, falling back to Mock Data.", e);

        return [
            { id: '1', threadId: '1', labelIds: ['INBOX'], from: 'Client A', to: 'Me', subject: 'Nouveau projet vidéo', snippet: 'Bonjour, je voudrais discuter...', body: 'Bonjour, je voudrais discuter du projet X.', date: new Date().toISOString(), isRead: false, hasAttachments: false },
            { id: '2', threadId: '2', labelIds: ['INBOX', 'STARRED'], from: 'Partenaire B', to: 'Me', subject: 'Facture #402', snippet: 'Veuillez trouver ci-joint...', body: 'Merci pour votre paiement.', date: new Date(Date.now() - 86400000).toISOString(), isRead: true, hasAttachments: true },
            { id: '3', threadId: '3', labelIds: ['INBOX'], from: 'Google', to: 'Me', subject: 'Alerte sécurité', snippet: 'Connexion détectée...', body: 'Nouvelle connexion.', date: new Date(Date.now() - 100000000).toISOString(), isRead: true, hasAttachments: false },
        ];
    }
  }

  async modifyMessage(userId: string, msgId: string, addLabelIds: string[], removeLabelIds: string[]): Promise<any> {
    await this.callN8nGoogleWebhook('modify_message', { msgId, addLabelIds, removeLabelIds, userId });
    try {
        await this.fetchGoogle(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}/modify`, userId, {
            method: 'POST', body: JSON.stringify({ addLabelIds, removeLabelIds })
        });
    } catch (e) { console.log("Mock modify message"); }
    return true;
  }

  async sendDraft(userId: string, data: { to: string, subject: string, body: string }): Promise<boolean> {
    const n8nRes = await this.callN8nGoogleWebhook('send_email', { ...data, userId });
    if (n8nRes) return true;

    try {
        const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(data.subject)))}?=`;
        const email = [`To: ${data.to}`, `Subject: ${utf8Subject}`, 'Content-Type: text/html; charset=utf-8', 'MIME-Version: 1.0', '', data.body].join('\r\n');
        const raw = btoa(unescape(encodeURIComponent(email))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        await this.fetchGoogle('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', userId, {
            method: 'POST', body: JSON.stringify({ raw })
        });
    } catch (e) { console.log("Mock send draft"); }
    return true;
  }

  async listEvents(userId: string, timeMin: Date, timeMax: Date): Promise<CalendarEvent[]> {
    // 1. Try N8N Webhook with action 'list_events'
    const n8nData = await this.callN8nGoogleWebhook('list_events', { timeMin, timeMax, userId });

    // Le workflow n8n retourne un objet combiné {success, emails: [...], events: [...]}
    // On extrait le champ 'events', ou on accepte un tableau direct
    const eventsArray = n8nData?.events || (Array.isArray(n8nData) ? n8nData : null);
    if (eventsArray && Array.isArray(eventsArray)) {
        return eventsArray.map((e: any) => ({
            id: e.id || `evt_${Date.now()}`,
            title: e.title || e.summary || '',
            start: typeof e.start === 'object' ? (e.start?.dateTime || e.start?.date || '') : (e.start || ''),
            end: typeof e.end === 'object' ? (e.end?.dateTime || e.end?.date || '') : (e.end || ''),
            description: e.description || '',
            location: e.location || ''
        }));
    }

    try {
        const data = await this.fetchGoogle(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime`, userId);
        return (data.items || []).map((item: any) => ({
            id: item.id, title: item.summary, start: item.start.dateTime || item.start.date,
            end: item.end.dateTime || item.end.date, description: item.description, location: item.location
        }));
    } catch (e) {
        // MOCK EVENTS Fallback
        return [
            { id: '1', title: 'Point Client: Studio Lumière', start: new Date(new Date().setHours(10,0)).toISOString(), end: new Date(new Date().setHours(11,0)).toISOString(), location: 'Google Meet' },
            { id: '2', title: 'Montage Rushs Projet A', start: new Date(new Date().setHours(14,0)).toISOString(), end: new Date(new Date().setHours(16,0)).toISOString(), description: 'Urgent' },
            { id: '3', title: 'Livraison Finale', start: new Date(Date.now() + 86400000).toISOString(), end: new Date(Date.now() + 90000000).toISOString() },
        ];
    }
  }

  async createEvent(userId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const n8nRes = await this.callN8nGoogleWebhook('create_event', { event, userId });
    if (n8nRes) return n8nRes;

    try {
        const data = await this.fetchGoogle(`https://www.googleapis.com/calendar/v3/calendars/primary/events`, userId, {
            method: 'POST',
            body: JSON.stringify({
                summary: event.title, start: { dateTime: event.start }, end: { dateTime: event.end },
                description: event.description, location: event.location
            })
        });
        return { id: data.id, title: data.summary, start: data.start.dateTime, end: data.end.dateTime };
    } catch (e) {
        return { id: `mock_${Date.now()}`, title: event.title || 'Event', start: event.start || '', end: event.end || '' };
    }
  }

  async listDriveFiles(userId: string, folderId: string = 'root'): Promise<DriveFile[]> {
    // 1. Try N8N Webhook with action 'list_files'
    const n8nData = await this.callN8nGoogleWebhook('list_files', { folderId, userId });
    if (n8nData && Array.isArray(n8nData)) return n8nData;

    try {
        const query = `'${folderId}' in parents and trashed = false`;
        const data = await this.fetchGoogle(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name, mimeType, webViewLink, webContentLink, parents, createdTime, modifiedTime, size, owners)`, userId);
        return data.files || [];
    } catch (e) {
        // MOCK FILES Fallback
        if (folderId === 'root') {
            return [
                { id: 'f1', name: 'Projets Clients', mimeType: 'application/vnd.google-apps.folder', createdTime: new Date().toISOString(), modifiedTime: new Date().toISOString() },
                { id: 'f2', name: 'Assets Marketing', mimeType: 'application/vnd.google-apps.folder', createdTime: new Date().toISOString(), modifiedTime: new Date().toISOString() },
                { id: 'f3', name: 'Contrat_Modele.pdf', mimeType: 'application/pdf', size: 102400, createdTime: new Date().toISOString(), modifiedTime: new Date().toISOString() },
                { id: 'f4', name: 'Logo_Anim.mp4', mimeType: 'video/mp4', size: 5000000, createdTime: new Date().toISOString(), modifiedTime: new Date().toISOString() },
            ];
        }
        return [];
    }
  }

  async getFileContent(userId: string, fileId: string): Promise<any> {
      try {
          return await this.fetchGoogle(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, userId);
      } catch (e) { return null; }
  }

  async createDriveFolder(userId: string, name: string, parentId: string = 'root'): Promise<DriveFile> {
      await this.callN8nGoogleWebhook('create_folder', { name, parentId, userId });
      try {
          return await this.fetchGoogle(`https://www.googleapis.com/drive/v3/files`, userId, {
              method: 'POST', body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] })
          });
      } catch (e) {
          return { id: `folder_${Date.now()}`, name, mimeType: 'application/vnd.google-apps.folder', createdTime: new Date().toISOString(), modifiedTime: new Date().toISOString() };
      }
  }

  async uploadFile(userId: string, file: File, parentId: string = 'root'): Promise<DriveFile> {
      // NOTE: Upload binaire est souvent plus simple via API direct ou lien présigné
      try {
          const metadata = { name: file.name, parents: [parentId] };
          const formData = new FormData();
          formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
          formData.append('file', file);
          
          const accessToken = await this.getAccessToken(userId); 
          const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
              method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}` }, body: formData
          });
          if (!response.ok) throw new Error("Upload failed");
          return await response.json();
      } catch (e) {
          return { id: `file_${Date.now()}`, name: file.name, mimeType: file.type, size: file.size, createdTime: new Date().toISOString(), modifiedTime: new Date().toISOString() };
      }
  }

  async triggerN8NSync(userId: string, email: string): Promise<boolean> {
      return !!(await this.callN8nGoogleWebhook('sync_all', { userId, email }));
  }
  
  async disconnectAccount(userId: string): Promise<void> {
    await fetch(`/api/auth/google/disconnect?userId=${userId}`, { method: 'POST' });
    db.disconnectGoogleAccount(userId);
    if (typeof window !== 'undefined') {
        localStorage.removeItem('google_sync_config');
    }
  }
}

export const googleService = new GoogleIntegrationService();
