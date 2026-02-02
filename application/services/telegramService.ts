
import { db } from './mockDatabase';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      first_name: string;
      username?: string;
      type: string;
    };
    date: number;
    text?: string;
  };
}

export class TelegramService {
  
  private getConfig() {
    const settings = db.getSystemSettings();
    return settings.telegram;
  }

  /**
   * Vérifie la connexion et récupère les infos du bot
   */
  async getBotInfo(): Promise<{ ok: boolean; result?: any; error?: string }> {
    const { botToken } = this.getConfig();
    if (!botToken) return { ok: false, error: "Token manquant" };

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const data = await response.json();
      return data;
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  /**
   * Polling des nouveaux messages (Long Polling simulé via un short timeout pour le client)
   */
  async pollMessages(): Promise<TelegramUpdate[]> {
    const config = this.getConfig();
    if (!config.enabled || !config.botToken) return [];

    try {
      // On demande les updates depuis le dernier ID connu + 1
      const offset = config.lastUpdateId ? config.lastUpdateId + 1 : 0;
      
      const response = await fetch(`https://api.telegram.org/bot${config.botToken}/getUpdates?offset=${offset}&timeout=0`);
      const data = await response.json();

      if (data.ok && data.result.length > 0) {
        // Filtrage de sécurité (Allowed Usernames)
        const updates: TelegramUpdate[] = data.result;
        
        const lastId = updates[updates.length - 1].update_id;
        db.updateSystemSettings({ 
            telegram: { ...config, lastUpdateId: lastId } 
        });

        // Filtrer les messages valides
        const validUpdates = updates.filter(u => {
            if (!u.message?.text) return false; // Ignore non-text for now
            const username = u.message.from.username;
            
            // Si une liste blanche est définie, on filtre
            if (config.allowedUsernames && config.allowedUsernames.length > 0) {
                const allowed = config.allowedUsernames.split(',').map(s => s.trim().replace('@', ''));
                return username && allowed.includes(username);
            }
            return true;
        });

        return validUpdates;
      }
      return [];

    } catch (e) {
      console.warn("[Telegram] Polling error", e);
      return [];
    }
  }

  /**
   * Envoi d'un message texte
   */
  async sendMessage(chatId: string | number, text: string): Promise<boolean> {
    const { botToken } = this.getConfig();
    if (!botToken) return false;

    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text })
      });
      return true;
    } catch (e) {
      console.error("[Telegram] Send Message Error", e);
      return false;
    }
  }

  /**
   * Envoi d'une photo (via URL ou Blob)
   */
  async sendPhoto(chatId: string | number, photoUrl: string, caption?: string): Promise<boolean> {
    const { botToken } = this.getConfig();
    if (!botToken) return false;

    try {
      // Si c'est du base64, il faut convertir en blob et envoyer en multipart
      if (photoUrl.startsWith('data:image')) {
          const blob = await (await fetch(photoUrl)).blob();
          const formData = new FormData();
          formData.append('chat_id', chatId.toString());
          formData.append('photo', blob, 'image.png');
          if (caption) formData.append('caption', caption);

          await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
              method: 'POST',
              body: formData
          });
      } else {
          // URL publique standard
          await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption })
          });
      }
      return true;
    } catch (e) {
      console.error("[Telegram] Send Photo Error", e);
      return false;
    }
  }
}

export const telegramService = new TelegramService();
