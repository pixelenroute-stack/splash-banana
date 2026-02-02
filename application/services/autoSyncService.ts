
import { googleService } from './googleService';
import { sheetsService } from './sheetsRepository';
import { db } from './mockDatabase';

export class AutoSyncService {
    private isRunning = false;
    private intervalId: any = null;
    private currentUserId: string = 'user_1';

    /**
     * Lance la boucle de synchronisation (toutes les 5 minutes)
     */
    start(intervalMs: number = 300000) {
        if (this.isRunning) return;
        console.log("[AutoSync] Service démarré.");
        this.isRunning = true;
        
        // Première synchro immédiate (léger délai pour laisser l'app charger)
        setTimeout(() => this.syncAll(), 5000);

        this.intervalId = setInterval(() => {
            this.syncAll();
        }, intervalMs);
    }

    stop() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.isRunning = false;
        console.log("[AutoSync] Service arrêté.");
    }

    async syncAll() {
        console.log("[AutoSync] Début de la synchronisation globale...");
        const settings = db.getSystemSettings();

        // 1. Google Workspace (Gmail, Calendar) via N8N ou API
        try {
            const status = await googleService.getAccountStatus(this.currentUserId);
            if (status.connected && status.email) {
                // Si N8N configuré, déclenche le workflow de lecture
                if (settings.google.gmailProvider === 'n8n') {
                    await googleService.triggerN8NSync(this.currentUserId, status.email);
                } 
                // Mise à jour cache local (même si N8N, on suppose qu'il met à jour une source qu'on peut relire ou qu'on simule la lecture)
                // Note: Dans une vraie implém N8N, le webhook pourrait pousser les données vers l'app.
                // Ici, on refait un listMessages pour rafraîchir le cache local depuis l'API si dispo
                if (status.status === 'live') {
                    const emails = await googleService.listMessages(this.currentUserId);
                    db.setEmails(this.currentUserId, emails);
                    
                    const events = await googleService.listEvents(this.currentUserId, new Date(), new Date(Date.now() + 7 * 86400000));
                    db.setEvents(this.currentUserId, events);
                }
            }
        } catch (e) {
            console.warn("[AutoSync] Erreur Workspace:", e);
        }

        // 2. CRM (Google Sheets)
        if (settings.clients.mode === 'sheets') {
            try {
                const sheetResult = await sheetsService.fetchClients();
                if (sheetResult.success) {
                    db.setClients(sheetResult.data);
                    console.log(`[AutoSync] ${sheetResult.data.length} clients mis à jour depuis Sheets.`);
                }
            } catch (e) {
                console.warn("[AutoSync] Erreur CRM:", e);
            }
        }

        console.log("[AutoSync] Terminé.");
    }
}

export const autoSyncService = new AutoSyncService();
