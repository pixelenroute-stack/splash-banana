
import { db } from './mockDatabase';
import { GoogleAccount, EmailMessage, CalendarEvent, DriveFile } from '../types';

export class GoogleIntegrationService {
  
  private cache = new Map<string, { data: any; timestamp: number; expiresIn: number }>();
  
  public clearCache() { this.cache.clear(); }
  public invalidateCache(keyPrefix?: string) { this.cache.clear(); }

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

  // --- SERVICES IMPLEMENTATION (DIRECT API -> MOCK) ---

  async listMessages(userId: string, label: string = 'INBOX'): Promise<EmailMessage[]> {
    // Direct Google API 
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
        // Fallback Mock
        return [
            { id: '1', threadId: '1', labelIds: ['INBOX'], from: 'Client A', to: 'Me', subject: 'Nouveau projet vidéo', snippet: 'Bonjour, je voudrais discuter...', body: 'Bonjour, je voudrais discuter du projet X.', date: new Date().toISOString(), isRead: false, hasAttachments: false },
            { id: '2', threadId: '2', labelIds: ['INBOX', 'STARRED'], from: 'Partenaire B', to: 'Me', subject: 'Facture #402', snippet: 'Veuillez trouver ci-joint...', body: 'Merci pour votre paiement.', date: new Date(Date.now() - 86400000).toISOString(), isRead: true, hasAttachments: true },
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
        return [
            { id: '1', title: 'Point Client: Studio Lumière', start: new Date(new Date().setHours(10,0)).toISOString(), end: new Date(new Date().setHours(11,0)).toISOString(), location: 'Google Meet' },
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
        if (folderId === 'root') {
            return [
                { id: 'f1', name: 'Projets Clients', mimeType: 'application/vnd.google-apps.folder', createdTime: new Date().toISOString(), modifiedTime: new Date().toISOString() },
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
      return true; // No-op, sync is direct or manual via API calls
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
