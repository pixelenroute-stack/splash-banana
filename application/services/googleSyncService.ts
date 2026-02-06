
import { googleService } from './googleService';
import { db } from './mockDatabase';

type ServiceType = 'gmail' | 'calendar' | 'drive';
type SyncCallback = (service: ServiceType, data: any) => void;

export interface SyncConfig {
    enabled: boolean;
    intervals: {
        gmail: number;   // secondes
        calendar: number;
        drive: number;
    };
    credentials?: {
        email: string;
        password: string;
    };
}

export class GoogleSyncService {
    private intervals: Map<ServiceType, any> = new Map();
    private callbacks: Set<SyncCallback> = new Set();
    private config: SyncConfig;
    private userId: string = 'user_1';
    
    private isDocumentHidden: boolean = false;

    constructor() {
        this.config = this.loadConfig();
        
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', () => {
                this.isDocumentHidden = document.hidden;
            });
        }
    }

    private loadConfig(): SyncConfig {
        try {
            const saved = localStorage.getItem('google_sync_config');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (!parsed.credentials) {
                    parsed.credentials = { email: '', password: '' };
                }
                // Migration : Si les intervalles sont trop courts (< 60s), on force à 1h pour éviter le spam API
                if (parsed.intervals && parsed.intervals.gmail < 60) {
                    parsed.intervals.gmail = 3600;
                    parsed.intervals.calendar = 3600;
                    parsed.intervals.drive = 3600;
                }
                return parsed;
            }
        } catch (e) {}
        
        // Configuration par défaut : 1 HEURE (3600 secondes)
        return {
            enabled: true,
            intervals: {
                gmail: 3600,
                calendar: 3600,
                drive: 3600
            },
            credentials: {
                email: '',
                password: ''
            }
        };
    }

    public updateConfig(newConfig: Partial<SyncConfig>) {
        this.config = { ...this.config, ...newConfig };
        
        if (newConfig.intervals) {
            this.config.intervals = { ...this.config.intervals, ...newConfig.intervals };
        }
        if (newConfig.credentials) {
            this.config.credentials = { ...this.config.credentials, ...newConfig.credentials };
        }

        localStorage.setItem('google_sync_config', JSON.stringify(this.config));
        
        // Redémarrage propre
        this.stopPolling();
        if (this.config.enabled) {
            this.startPolling(this.userId);
        }
    }

    public async verifyCredentials(email: string, password: string): Promise<boolean> {
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (!email.includes('@') || password.length < 6) {
            throw new Error("Format d'email ou de mot de passe invalide.");
        }
        return true;
    }

    public getConfig() {
        return this.config;
    }

    public subscribe(callback: SyncCallback) {
        this.callbacks.add(callback);
        return () => this.callbacks.delete(callback);
    }

    private notify(service: ServiceType, data: any) {
        this.callbacks.forEach(cb => cb(service, data));
    }

    public async startPolling(userId: string) {
        // IMPORTANT : Toujours nettoyer les intervalles existants avant d'en créer de nouveaux
        // Cela empêche l'accumulation de boucles (le bug "requêtes en boucle")
        this.stopPolling();

        this.userId = userId;
        if (!this.config.enabled) return;

        const status = await googleService.getAccountStatus(userId);
        const hasCredentials = this.config.credentials?.email && this.config.credentials?.password;

        // Si on n'est pas connecté en live et qu'on n'a pas de credentials pour la simulation, on ne poll pas
        if (status.status !== 'live' && !hasCredentials) {
            return;
        }

        console.log(`[GoogleSync] Démarrage du polling (Gmail: ${this.config.intervals.gmail}s, Calendar: ${this.config.intervals.calendar}s, Drive: ${this.config.intervals.drive}s)`);

        this.intervals.set('gmail', setInterval(() => this.checkGmail(), this.config.intervals.gmail * 1000));
        this.intervals.set('calendar', setInterval(() => this.checkCalendar(), this.config.intervals.calendar * 1000));
        this.intervals.set('drive', setInterval(() => this.checkDrive(), this.config.intervals.drive * 1000));
    }

    public stopPolling() {
        // Nettoyage complet
        this.intervals.forEach((intervalId) => clearInterval(intervalId));
        this.intervals.clear();
        console.log("[GoogleSync] Polling arrêté.");
    }

    /**
     * Déclenche une synchronisation immédiate et réinitialise les timers
     * (Appelé par le bouton "Actualiser")
     */
    public async triggerManualSync() {
        console.log("[GoogleSync] Synchronisation manuelle déclenchée.");
        
        // 1. Arrêter les timers automatiques
        this.stopPolling();

        // 2. Exécuter les vérifications immédiatement
        await Promise.allSettled([
            this.checkGmail(),
            this.checkCalendar(),
            this.checkDrive()
        ]);

        // 3. Redémarrer les timers (repartir pour 1h)
        if (this.config.enabled) {
            this.startPolling(this.userId);
        }
    }

    private async checkGmail() {
        if (this.isDocumentHidden && Math.random() > 0.5) return;

        try {
            googleService.invalidateCache('listMessages');
            const messages = await googleService.listMessages(this.userId, 'INBOX');
            
            if (messages.length > 0) {
                const latestId = messages[0].id;
                const lastKnownId = localStorage.getItem(`sync_gmail_last_${this.userId}`);

                if (lastKnownId && latestId !== lastKnownId) {
                    const newMessages = messages.filter(m => m.id > lastKnownId);
                    if (newMessages.length > 0 || messages[0].id !== lastKnownId) {
                        this.notify('gmail', newMessages.length > 0 ? newMessages : [messages[0]]);
                    }
                }
                localStorage.setItem(`sync_gmail_last_${this.userId}`, latestId);
            }
        } catch (e: any) {
            if (e.message?.includes('429')) this.handleRateLimit('gmail');
        }
    }

    private async checkCalendar() {
        if (this.isDocumentHidden) return;

        try {
            const now = new Date();
            const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            
            googleService.invalidateCache('listEvents');
            const events = await googleService.listEvents(this.userId, now, nextWeek);
            
            const count = events.length;
            const lastCountStr = localStorage.getItem(`sync_cal_count_${this.userId}`);
            const lastCount = lastCountStr ? parseInt(lastCountStr) : 0;

            if (count !== lastCount) {
                this.notify('calendar', events);
            }
            localStorage.setItem(`sync_cal_count_${this.userId}`, count.toString());

        } catch (e) {}
    }

    private async checkDrive() {
        if (this.isDocumentHidden) return;

        try {
            googleService.invalidateCache('listDriveFiles');
            const files = await googleService.listDriveFiles(this.userId, 'root');
            
            const currentHash = files.map(f => f.id).join(',');
            const lastHash = localStorage.getItem(`sync_drive_hash_${this.userId}`);

            if (currentHash !== lastHash) {
                this.notify('drive', files);
            }
            localStorage.setItem(`sync_drive_hash_${this.userId}`, currentHash);

        } catch (e) {}
    }

    private handleRateLimit(service: ServiceType) {
        const interval = this.intervals.get(service);
        if (interval) clearInterval(interval);
        
        console.warn(`[GoogleSync] Rate limit atteint pour ${service}, pause de 5min.`);
        setTimeout(() => {
            if (this.config.enabled) {
                // Redémarrage prudent
                if (service === 'gmail') this.intervals.set('gmail', setInterval(() => this.checkGmail(), 3600 * 1000));
            }
        }, 300000);
    }
}

export const googleSyncService = new GoogleSyncService();
