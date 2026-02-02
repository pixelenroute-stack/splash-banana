
import { db } from './mockDatabase';
import { autoSyncService } from './autoSyncService';
import { backupService } from './backupService';
import { diagnosticsService } from './diagnosticsService';
import { sheetsService } from './sheetsRepository';
import { googleService } from './googleService';

// Définition des signatures d'outils
export interface ToolDefinition {
    name: string;
    description: string;
    execute: (args: any, context: { notify: (msg: string, type: any) => void }) => Promise<any>;
}

// Helper pour le téléchargement
const downloadTextFile = (filename: string, content: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
};

// Helper pour formater le rapport JSON en TXT lisible
const formatReportToTxt = (report: any): string => {
    const lines = [];
    lines.push("================================================");
    lines.push("   RAPPORT DE DIAGNOSTIC - SPLASH BANANA");
    lines.push(`   Généré le : ${new Date(report.timestamp).toLocaleString()}`);
    lines.push("================================================");
    lines.push("");
    
    lines.push("[1] ARCHITECTURE & ENVIRONNEMENT");
    lines.push("------------------------------------------------");
    lines.push(`Frontend: ${report.architecture.frontend}`);
    lines.push(`Backend: ${report.architecture.backend_simulation}`);
    lines.push(`Stockage: ${report.architecture.integrations.supabase}`);
    lines.push(`Google Auth: ${report.architecture.integrations.google}`);
    lines.push(`IA Provider: ${report.architecture.integrations.ai_provider}`);
    lines.push("");

    lines.push("[2] MÉTRIQUES DE LA BASE DE DONNÉES");
    lines.push("------------------------------------------------");
    lines.push(`Clients enregistrés: ${report.database_metrics.clients_count}`);
    lines.push(`Factures en attente: ${report.database_metrics.invoices_pending}`);
    lines.push(`Utilisation Tokens IA: ${report.database_metrics.ai_usage}`);
    lines.push("");

    lines.push("[3] VÉRIFICATION DE LA CONNECTIVITÉ");
    lines.push("------------------------------------------------");
    report.connectivity_check.forEach((check: any) => {
        const statusIcon = check.status === 'success' ? '[OK]' : check.status === 'error' ? '[ERREUR]' : '[WARN]';
        lines.push(`${statusIcon} Service: ${check.service}`);
        lines.push(`     Message: ${check.message}`);
        if(check.details) lines.push(`     Détails: ${check.details}`);
        lines.push("");
    });

    if (report.critical_alerts && report.critical_alerts.length > 0) {
        lines.push("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        lines.push("   ALERTES CRITIQUES DÉTECTÉES");
        lines.push("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        report.critical_alerts.forEach((alert: string) => lines.push(`- ${alert}`));
    } else {
        lines.push(">> Aucune alerte critique détectée.");
    }

    lines.push("");
    lines.push("================================================");
    lines.push("   FIN DU RAPPORT");
    lines.push("================================================");

    return lines.join("\n");
};

export const toolRegistry: Record<string, ToolDefinition> = {
    // 1. NAVIGATION
    navigate: {
        name: 'navigate',
        description: 'Naviguer vers une vue spécifique de l\'application (dashboard, chat, workspace, clients, projects, invoices, settings, library, images, videos)',
        execute: async ({ view }, { notify }) => {
            window.location.hash = `#${view}`;
            return `Navigation vers ${view} effectuée.`;
        }
    },

    // 2. NOTIFICATION
    notify: {
        name: 'notify',
        description: 'Afficher une notification visuelle à l\'utilisateur',
        execute: async ({ message, type }, { notify }) => {
            notify(message, type || 'info');
            return 'Notification affichée.';
        }
    },

    // 3. DIAGNOSTIC SYSTEME (Modifié pour export TXT)
    run_diagnostics: {
        name: 'run_diagnostics',
        description: 'Lancer un diagnostic complet du système et télécharger le rapport en .txt',
        execute: async (_, { notify }) => {
            notify('Analyse du système en cours...', 'loading');
            
            // 1. Génération des données
            const reportJson = await diagnosticsService.generateFullSystemReport();
            
            // 2. Formatage en texte
            const reportText = formatReportToTxt(reportJson);
            
            // 3. Téléchargement automatique
            const filename = `Diagnostic_Systeme_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
            downloadTextFile(filename, reportText);

            notify('Rapport téléchargé avec succès.', 'success');
            
            // On retourne un résumé à l'IA, pas tout le JSON, car l'utilisateur a le fichier
            return {
                status: 'completed',
                file_downloaded: filename,
                summary: `Diagnostic terminé. ${reportJson.connectivity_check.length} services vérifiés. ${reportJson.critical_alerts.length} alertes critiques.`
            };
        }
    },

    // 4. SYNC & BACKUP
    trigger_sync: {
        name: 'trigger_sync',
        description: 'Forcer la synchronisation des données (Gmail, Calendar, Sheets)',
        execute: async (_, { notify }) => {
            notify('Synchronisation en cours...', 'loading');
            await autoSyncService.syncAll();
            notify('Synchronisation terminée.', 'success');
            return { status: 'success', timestamp: new Date().toISOString() };
        }
    },
    trigger_backup: {
        name: 'trigger_backup',
        description: 'Créer une sauvegarde immédiate sur Google Drive',
        execute: async (_, { notify }) => {
            notify('Création du backup...', 'loading');
            const res = await backupService.performBackup();
            if (res.success) notify(res.message, 'success');
            else notify(res.message, 'error');
            return res;
        }
    },

    // 5. CRM ACTIONS
    create_client: {
        name: 'create_client',
        description: 'Créer un nouveau client dans la base de données et Google Sheets',
        execute: async (clientData, { notify }) => {
            notify(`Création du client ${clientData.name}...`, 'loading');
            
            // 1. Local DB
            const newClient = db.createClient({
                ...clientData,
                leadStatus: 'Lead',
                contactDate: new Date().toISOString()
            });

            // 2. Sheets Sync (Best effort)
            try {
                await sheetsService.addClient(newClient);
            } catch (e) {
                console.warn("Sheet sync fail during AI create", e);
            }

            notify(`Client ${clientData.name} créé avec succès.`, 'success');
            return newClient;
        }
    },

    // 6. WORKSPACE
    send_email: {
        name: 'send_email',
        description: 'Envoyer un email via Gmail (API)',
        execute: async ({ to, subject, body }, { notify }) => {
            notify(`Envoi de l'email à ${to}...`, 'loading');
            try {
                await googleService.sendDraft('user_1', { to, subject, body });
                notify('Email envoyé !', 'success');
                return { success: true };
            } catch (e) {
                notify("Erreur lors de l'envoi de l'email", 'error');
                throw e;
            }
        }
    }
};

/**
 * Helper pour exécuter un outil par son nom
 */
export const executeToolByName = async (toolName: string, args: any, notifyFn: any) => {
    const tool = toolRegistry[toolName];
    if (!tool) {
        throw new Error(`Outil inconnu : ${toolName}`);
    }
    try {
        console.log(`[AI Tool] Executing ${toolName}`, args);
        const result = await tool.execute(args, { notify: notifyFn });
        return { tool: toolName, status: 'success', result };
    } catch (e) {
        console.error(`[AI Tool] Error ${toolName}`, e);
        return { tool: toolName, status: 'error', error: (e as Error).message };
    }
};
