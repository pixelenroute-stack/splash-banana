
import { db } from './mockDatabase';
import { testSupabaseConnection } from '../lib/supabaseClient';
import { SystemSettings, DiagnosticResult } from '../types';
import { googleService } from './googleService'; // To test sheet connectivity

class DiagnosticsService {
    private maskSecret(secret?: string, visibleChars = 4): string {
        if (!secret) return 'Non configuré';
        if (secret.length <= 8) return '********';
        return `${secret.substring(0, visibleChars)}...${secret.substring(secret.length - visibleChars)}`;
    }

    private async testWebhook(url?: string): Promise<{ status: 'success' | 'error' | 'unconfigured', message: string }> {
        if (!url) {
            return { status: 'unconfigured', message: 'URL non fournie.' };
        }
        try {
            // Utilise 'no-cors' pour tester la joignabilité cross-origin sans erreur CORS.
            // Une réponse opaque (status 0) est un succès, une erreur réseau est un échec.
            const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
            return { status: 'success', message: 'Endpoint joignable.' };
        } catch (e) {
            return { status: 'error', message: 'Endpoint injoignable (Erreur réseau ou CORS restrictif).' };
        }
    }

    async runDiagnostics(): Promise<DiagnosticResult[]> {
        const settings = db.getSystemSettings();
        const results: DiagnosticResult[] = [];

        // 1. Supabase
        if (settings.storage.mode === 'supabase') {
            const sup_res = await testSupabaseConnection();
            results.push({
                serviceName: 'Supabase Database',
                status: sup_res.ok ? 'success' : 'error',
                message: sup_res.ok ? `Connecté (${sup_res.latency}ms)` : sup_res.error || "Erreur inconnue",
                details: settings.library.supabaseUrl
            });
        } else {
            results.push({
                serviceName: 'Supabase Database',
                status: 'unconfigured',
                message: 'Le mode de persistance local est activé.',
                details: 'N/A'
            });
        }

        // 2. Google OAuth
        const { clientId, clientSecret, redirectUri } = settings.google;
        if (clientId && clientSecret && redirectUri) {
             results.push({
                serviceName: 'Google OAuth API',
                status: 'success',
                message: 'Tous les identifiants sont configurés.',
                details: `Client ID: ${this.maskSecret(clientId, 8)}`
            });
        } else {
            const missing = [!clientId && 'Client ID', !clientSecret && 'Client Secret', !redirectUri && 'Redirect URI'].filter(Boolean).join(', ');
            results.push({
                serviceName: 'Google OAuth API',
                status: 'error',
                message: `Configuration incomplète. Manquant: ${missing}`,
                details: 'Non configuré'
            });
        }
        
        // 3. CRM Connection (Sheets or Notion)
        if (settings.clients.mode === 'sheets') {
             const { spreadsheetId } = settings.clients;
             if (spreadsheetId) {
                // Test simple call
                const authStatus = await googleService.getAccountStatus("user_1");
                if (authStatus.status === 'live' || authStatus.status === 'mock') {
                    results.push({
                        serviceName: 'Google Sheets CRM',
                        status: 'success',
                        message: 'ID Sheet configuré et compte connecté.',
                        details: `ID: ${spreadsheetId.substring(0,8)}...`
                    });
                } else {
                    results.push({
                        serviceName: 'Google Sheets CRM',
                        status: 'warning',
                        message: 'Sheet ID configuré mais compte Google non connecté.',
                        details: 'Connexion requise'
                    });
                }
             } else {
                 results.push({
                    serviceName: 'Google Sheets CRM',
                    status: 'error',
                    message: 'ID Spreadsheet manquant.',
                    details: 'Non configuré'
                });
             }
        } else if (settings.clients.mode === 'notion') {
             const { notionApiKey, notionDbUrl } = settings.clients;
             if (notionApiKey && notionDbUrl) {
                results.push({
                    serviceName: 'Notion API (Legacy)',
                    status: 'success',
                    message: 'Clé API configurée (Mode déprécié).',
                    details: `API Key: ${this.maskSecret(notionApiKey)}`
                });
             }
        }
        
        // 4. n8n Webhooks
        const n8nEndpoints = [
            { name: 'n8n Chat Agent', url: settings.chat.value },
            { name: 'n8n CRM Sync', url: settings.clients.n8nUrl },
            { name: 'n8n Image Gen (Banana)', url: settings.images.endpoint },
            { name: 'n8n Video Gen (Veo)', url: settings.videos.endpoint },
            { name: 'n8n Billing', url: settings.invoices.n8nUrl },
        ];
        
        for (const endpoint of n8nEndpoints) {
            const { status, message } = await this.testWebhook(endpoint.url);
            results.push({
                serviceName: endpoint.name,
                status,
                message,
                details: endpoint.url || 'Non configuré'
            });
        }

        return results;
    }

    /**
     * Génère un rapport d'inspection complet pour l'IA (Simulation d'audit de code + runtime)
     */
    async generateFullSystemReport() {
        const diagnostics = await this.runDiagnostics();
        const settings = db.getSystemSettings();
        const stats = db.getStats();
        
        const report = {
            timestamp: new Date().toISOString(),
            environment: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                screen: `${window.innerWidth}x${window.innerHeight}`
            },
            architecture: {
                frontend: "React 19, TailwindCSS, Lucide Icons",
                backend_simulation: "MockDatabase (LocalStorage persistence)",
                services: ["GoogleService", "SupabaseService", "N8NAgentService", "GeminiService"],
                integrations: {
                    google: settings.google.clientId ? "Configured (OAuth)" : "Mock Mode",
                    supabase: settings.storage.mode === 'supabase' ? "Active" : "Disabled (Local only)",
                    crm: settings.clients.mode,
                    ai_provider: settings.contentCreation.provider
                }
            },
            database_metrics: {
                clients_count: stats.totalClients,
                invoices_pending: stats.pendingInvoices,
                ai_usage: `${stats.aiTokensUsed}/${stats.aiTokenLimit}`
            },
            connectivity_check: diagnostics.map(d => ({
                service: d.serviceName,
                status: d.status,
                details: d.message
            })),
            critical_alerts: diagnostics.filter(d => d.status === 'error').map(d => `${d.serviceName}: ${d.message}`)
        };

        return report;
    }
}
export const diagnosticsService = new DiagnosticsService();
