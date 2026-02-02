
import { db } from './mockDatabase';
import { GoogleAccount, EmailMessage, CalendarEvent, DriveFile } from '../types';

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

  // --- TOKEN MANAGEMENT (VIA API BACKEND) ---

  /**
   * Obtient un token d'accès valide via l'API sécurisée.
   * L'API gère le déchiffrement et le rafraîchissement.
   */
  private async getAccessToken(userId: string): Promise<string> {
      try {
          const response = await fetch(`/api/auth/google/refresh?userId=${userId}`);
          
          if (!response.ok) {
              if (response.status === 401 || response.status === 403) {
                  // Token invalide ou expiré non renouvelable
                  db.disconnectGoogleAccount(userId); 
                  throw new Error("AUTH_REQUIRED");
              }
              throw new Error("Erreur serveur lors de la récupération du token");
          }

          const data = await response.json();
          return data.accessToken; // Token en clair temporaire pour le client
      } catch (error: any) {
          if (error.message === "AUTH_REQUIRED") throw error;
          
          // FALLBACK DEV/MOCK UNIQUEMENT SI API INACCESSIBLE
          const acc = db.getGoogleAccount(userId);
          if (acc && acc.status === 'connected') {
              // On suppose que c'est un mock local si l'API route échoue (ex: environnement sans backend Node)
              return 'mock_token';
          }
          throw error;
      }
  }

  // --- CORE FETCH ---

  public async fetchGoogle(endpoint: string, userId: string, options: RequestInit = {}) {
        let accessToken;
        try {
            accessToken = await this.getAccessToken(userId);
        } catch (e: any) {
            if (e.message === "AUTH_REQUIRED") {
                throw new Error("Session Google expirée. Veuillez vous reconnecter.");
            }
            throw e;
        }
        
        if (accessToken === 'mock_token') {
            throw new Error("MOCK_MODE"); // Signal pour déclencher le fallback
        }

        const headers: Record<string, string> = {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          ...(options.headers as Record<string, string> || {})
        };

        const response = await fetch(endpoint, { ...options, headers });

        if (response.status === 401) {
            // Token révoqué ou expiré malgré le refresh
            await this.disconnectAccount(userId);
            throw new Error("Session Google révoquée. Reconnexion requise.");
        }

        if (response.status === 429) throw new Error("Google API Rate Limit. Réessayez plus tard.");

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `Erreur API Google ${response.status}`);
        }

        return response.json();
  }

  async getAccountStatus(userId: string): Promise<{ connected: boolean; email?: string; status: 'live' | 'mock' | 'error' | 'disconnected'; lastSyncedAt?: string }> {
    try {
        // Vérification via API Backend pour état réel (validité refresh token)
        const res = await fetch(`/api/google/status?userId=${userId}`);
        if (res.ok) {
            const data = await res.json();
            return { 
                connected: data.connected, 
                status: data.status, // 'live' | 'error' | 'disconnected'
                email: data.email,
                lastSyncedAt: data.lastSyncedAt
            };
        }
    } catch(e) {}

    // Fallback Local Check (si API down ou latence)
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

  /**
   * Génère l'URL d'auth OAuth.
   */
  getAuthUrl(userId: string) {
      return `/api/auth/google/start?userId=${userId}`;
  }

  // --- SAFE WRAPPERS FOR SERVICES (With MOCK Data Fallback) ---

  async listMessages(userId: string, label: string = 'INBOX'): Promise<EmailMessage[]> {
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
        // MOCK DATA FALLBACK
        return [
            { id: '1', threadId: '1', labelIds: ['INBOX'], from: 'Client A', to: 'Me', subject: 'Nouveau projet vidéo', snippet: 'Bonjour, je voudrais discuter...', body: 'Bonjour, je voudrais discuter du projet X.', date: new Date().toISOString(), isRead: false, hasAttachments: false },
            { id: '2', threadId: '2', labelIds: ['INBOX', 'STARRED'], from: 'Partenaire B', to: 'Me', subject: 'Facture #402', snippet: 'Veuillez trouver ci-joint...', body: 'Merci pour votre paiement.', date: new Date(Date.now() - 86400000).toISOString(), isRead: true, hasAttachments: true },
            { id: '3', threadId: '3', labelIds: ['INBOX'], from: 'Google', to: 'Me', subject: 'Alerte sécurité', snippet: 'Connexion détectée...', body: 'Nouvelle connexion.', date: new Date(Date.now() - 100000000).toISOString(), isRead: true, hasAttachments: false },
        ];
    }
  }

  async modifyMessage(userId: string, msgId: string, addLabelIds: string[], removeLabelIds: string[]): Promise<any> {
    try {
        await this.fetchGoogle(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}/modify`, userId, {
            method: 'POST', body: JSON.stringify({ addLabelIds, removeLabelIds })
        });
    } catch (e) { console.log("Mock modify message"); }
    return true;
  }

  async sendDraft(userId: string, data: { to: string, subject: string, body: string }): Promise<boolean> {
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
    try {
        const data = await this.fetchGoogle(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime`, userId);
        return (data.items || []).map((item: any) => ({
            id: item.id, title: item.summary, start: item.start.dateTime || item.start.date,
            end: item.end.dateTime || item.end.date, description: item.description, location: item.location
        }));
    } catch (e) {
        // MOCK EVENTS
        return [
            { id: '1', title: 'Point Client: Studio Lumière', start: new Date(new Date().setHours(10,0)).toISOString(), end: new Date(new Date().setHours(11,0)).toISOString(), location: 'Google Meet' },
            { id: '2', title: 'Montage Rushs Projet A', start: new Date(new Date().setHours(14,0)).toISOString(), end: new Date(new Date().setHours(16,0)).toISOString(), description: 'Urgent' },
            { id: '3', title: 'Livraison Finale', start: new Date(Date.now() + 86400000).toISOString(), end: new Date(Date.now() + 90000000).toISOString() },
        ];
    }
  }

  async createEvent(userId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
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
    try {
        const query = `'${folderId}' in parents and trashed = false`;
        const data = await this.fetchGoogle(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name, mimeType, webViewLink, webContentLink, parents, createdTime, modifiedTime, size, owners)`, userId);
        return data.files || [];
    } catch (e) {
        // MOCK FILES
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
      try {
          return await this.fetchGoogle(`https://www.googleapis.com/drive/v3/files`, userId, {
              method: 'POST', body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] })
          });
      } catch (e) {
          return { id: `folder_${Date.now()}`, name, mimeType: 'application/vnd.google-apps.folder', createdTime: new Date().toISOString(), modifiedTime: new Date().toISOString() };
      }
  }

  async uploadFile(userId: string, file: File, parentId: string = 'root'): Promise<DriveFile> {
      try {
          const metadata = { name: file.name, parents: [parentId] };
          const formData = new FormData();
          formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
          formData.append('file', file);
          
          const accessToken = await this.getAccessToken(userId); // Access token raw required for upload fetch
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
      const settings = db.getSystemSettings();
      // Si N8N n'est pas configuré, on retourne juste true (succès simulé)
      if (!settings.google.gmailValue || settings.google.gmailProvider !== 'n8n') return true;
      
      try {
          await fetch(settings.google.gmailValue, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'sync_all', userId, email })
          });
      } catch(e) {} // On ignore les erreurs N8N pour l'instant
      return true;
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
