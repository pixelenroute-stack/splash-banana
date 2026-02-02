
import { db } from './mockDatabase';
import { googleService } from './googleService';

const BACKUP_FOLDER_NAME = 'Splash_Backups';

export class BackupService {
    private isRunning = false;
    private intervalId: any = null;
    private currentUserId: string = 'user_1';

    /**
     * Initialise la sauvegarde automatique
     * @param intervalMinutes Fréquence en minutes (défaut 60)
     */
    startAutoBackup(intervalMinutes: number = 60) {
        if (this.isRunning) return;
        console.log(`[BackupService] Démarrage... (Toutes les ${intervalMinutes} min)`);
        
        this.isRunning = true;
        this.intervalId = setInterval(() => {
            this.performBackup();
        }, intervalMinutes * 60 * 1000);
    }

    stopAutoBackup() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log("[BackupService] Arrêté.");
    }

    /**
     * Exécute une sauvegarde immédiate
     */
    async performBackup(): Promise<{ success: boolean; message: string }> {
        const settings = db.getSystemSettings();
        
        // Vérifier si un compte Google est connecté
        const status = await googleService.getAccountStatus(this.currentUserId);
        const account = db.getGoogleAccount(this.currentUserId);

        // Fix: Ensure we have actual credentials for Drive API usage
        // getAccountStatus might return 'live' if N8N is used for Gmail, 
        // but Drive operations in googleService rely on stored OAuth tokens.
        const canUseDrive = (status.status === 'live' && !!account) || status.status === 'mock';

        if (!canUseDrive) {
            // Silent return to avoid log spam if just not configured
            return { success: false, message: "Compte Google non connecté" };
        }

        try {
            // 1. Préparer les données
            const fullState = db.exportFullState();
            const fileName = `Backup_${settings.branding.initials}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            const fileContent = new Blob([JSON.stringify(fullState, null, 2)], { type: 'application/json' });
            const file = new File([fileContent], fileName, { type: 'application/json' });

            // 2. Trouver ou créer le dossier de backup
            let folderId = await this.ensureBackupFolder();

            // 3. Upload
            await googleService.uploadFile(this.currentUserId, file, folderId);
            
            console.log(`[BackupService] Sauvegarde réussie : ${fileName}`);
            
            db.addAuditLog({
                id: `log_bak_${Date.now()}`,
                actorId: 'SYSTEM',
                actorName: 'Backup Service',
                action: 'AUTO_BACKUP_SUCCESS',
                metadata: { file: fileName },
                timestamp: new Date().toISOString(),
                level: 'info'
            });

            return { success: true, message: `Sauvegarde ${fileName} créée` };

        } catch (e) {
            console.error("[BackupService] Erreur:", e);
            db.addAuditLog({
                id: `log_bak_err_${Date.now()}`,
                actorId: 'SYSTEM',
                actorName: 'Backup Service',
                action: 'AUTO_BACKUP_FAILED',
                metadata: { error: (e as Error).message },
                timestamp: new Date().toISOString(),
                level: 'error'
            });
            return { success: false, message: (e as Error).message };
        }
    }

    private async ensureBackupFolder(): Promise<string> {
        try {
            // Chercher le dossier à la racine
            const files = await googleService.listDriveFiles(this.currentUserId, 'root');
            const existing = files.find(f => f.name === BACKUP_FOLDER_NAME && f.mimeType === 'application/vnd.google-apps.folder');
            
            if (existing) return existing.id;

            // Créer si inexistant
            const newFolder = await googleService.createDriveFolder(this.currentUserId, BACKUP_FOLDER_NAME, 'root');
            return newFolder.id;
        } catch (e) {
            console.error("Erreur dossier backup, utilisation racine", e);
            return 'root';
        }
    }
}

export const backupService = new BackupService();
