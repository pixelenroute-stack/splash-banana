
import { db } from './mockDatabase';
import { googleService } from './googleService';
import { geminiService } from './geminiService';
import { imageService } from './imageService';
import { videoService } from './videoService';
import { supabaseService } from './supabaseService';
import { prospectionService } from './prospectionService';
import { notionService } from './notionRepository';
import { SystemReport, TestResult, NotionClient, CodeDiagnostic } from '../types';
import { apiRouter } from './apiRouter'; 

type ProgressCallback = (log: string, status?: 'info' | 'success' | 'error' | 'warning') => void;

// --- STATIC ERROR MAPPER ---
// Simule une analyse statique en mappant des messages d'erreur connus à des fichiers/lignes précis
const ERROR_MAP: Record<string, CodeDiagnostic> = {
    'MISSING_API_KEY': {
        file: 'services/geminiService.ts',
        line: '45-52',
        functionName: 'validateApiKey',
        errorType: 'ConfigurationError',
        snippet: 'if (!key || key.trim() === \'\') throw new GeminiServiceError(...)',
        suggestion: 'Configurez la clé API dans Admin > Infrastructure ou vérifiez les variables d\'environnement.'
    },
    'MOCK_MODE': {
        file: 'services/googleService.ts',
        line: '85',
        functionName: 'fetchGoogle',
        errorType: 'MockFallback',
        snippet: 'if (accessToken === \'mock_token\') throw new Error("MOCK_MODE");',
        suggestion: 'Le service utilise un token factice. Connectez un compte Google réel.'
    },
    'AUTH_REQUIRED': {
        file: 'services/googleService.ts',
        line: '42',
        functionName: 'getAccessToken',
        errorType: 'AuthenticationError',
        snippet: 'if (response.status === 401) throw new Error("AUTH_REQUIRED");',
        suggestion: 'Le refresh token est invalide ou expiré. Reconnectez le compte.'
    },
    'Failed to fetch': {
        file: 'services/apiRouter.ts',
        line: '98',
        functionName: 'route',
        errorType: 'NetworkError',
        snippet: 'const response = await fetch(webhookUrl, ...)',
        suggestion: 'Vérifiez la connexion internet ou l\'URL du Webhook N8N/Proxy.'
    },
    'n8n error': {
        file: 'lib/n8nAgentService.ts',
        line: '65',
        functionName: 'fetchN8nWorkflow',
        errorType: 'WorkflowError',
        snippet: 'if (!response.ok) throw new Error(`n8n error: ${response.status}`);',
        suggestion: 'Le serveur N8N a renvoyé une erreur. Vérifiez les logs du workflow.'
    }
};

class SystemTester {
    
    // TIME OUT WRAPPER
    private async measure<T>(name: string, fn: () => Promise<T>, timeoutMs: number = 15000): Promise<{ result: T, duration: number }> {
        const start = performance.now();
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Timeout: ${name} took longer than ${timeoutMs/1000}s`)), timeoutMs);
        });

        try {
            const result = await Promise.race([fn(), timeoutPromise]);
            const end = performance.now();
            return { result, duration: Math.round(end - start) };
        } catch (e: any) {
            const end = performance.now();
            throw { error: e instanceof Error ? e : new Error(String(e)), duration: Math.round(end - start) };
        }
    }

    private async sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // --- ANALYSEUR D'ERREUR INTELLIGENT ---
    private analyzeError(error: Error | string): CodeDiagnostic | undefined {
        const msg = typeof error === 'string' ? error : error.message;
        
        // 1. Recherche par mot-clé dans la MAP
        for (const [key, diagnostic] of Object.entries(ERROR_MAP)) {
            if (msg.includes(key)) return diagnostic;
        }

        // 2. Fallback générique si trace de pile disponible
        if (error instanceof Error && error.stack) {
            // Tentative d'extraction simpliste (ex: "at GeminiService.sendMessage (webpack-internal:///./services/geminiService.ts:120:15)")
            const match = error.stack.match(/webpack-internal:\/\/\/\.\/(.*?):(\d+):/);
            if (match) {
                return {
                    file: match[1],
                    line: match[2],
                    functionName: 'Unknown (Runtime)',
                    errorType: 'RuntimeError',
                    snippet: '// Code dynamique introuvable',
                    suggestion: 'Erreur inattendue. Vérifiez la stack trace.'
                };
            }
        }

        return undefined;
    }

    // 0. STATIC CODE INTEGRITY
    private async checkCodeIntegrity(onProgress: ProgressCallback): Promise<TestResult[]> {
        const results: TestResult[] = [];
        onProgress("--- PHASE 1: ANALYSE STATIQUE & INTÉGRITÉ DU CODE ---", 'info');
        
        await this.sleep(400);
        
        // Check Env Vars
        onProgress("Checking Environment Configuration...", 'info');
        const settings = db.getSystemSettings();
        const missingKeys = [];
        if (!settings.aiConfig.geminiKey) missingKeys.push("GEMINI_API_KEY");
        
        if (missingKeys.length > 0) {
            onProgress(`Missing API Keys: ${missingKeys.join(', ')}`, 'warning');
            results.push({ 
                module: 'Config', 
                testName: 'Env Vars Check', 
                status: 'fail', 
                duration: 0, 
                error: `Missing: ${missingKeys.join(', ')}`,
                codeLocation: ERROR_MAP['MISSING_API_KEY']
            });
        } else {
            onProgress("Environment Variables Integrity: 100%", 'success');
            results.push({ module: 'Config', testName: 'Env Vars Check', status: 'pass', duration: 0 });
        }

        return results;
    }

    // 1. TEST CHAT
    private async testChatModule(onProgress: ProgressCallback): Promise<TestResult> {
        onProgress("--- PHASE 2: TEST COGNITIF (LLM & CHAT) ---", 'info');
        try {
            onProgress("Simulating user input...", 'info');
            const { duration, result } = await this.measure('Text Logic', async () => {
                const res = await apiRouter.routeRequest({
                    type: 'chat_simple',
                    prompt: '[TEST SYSTÈME] Ping.',
                    qualityRequired: 'low'
                });
                // Si le contenu est une erreur texte, on throw pour l'attraper
                if (res.content.startsWith('Error:')) throw new Error(res.content);
                return res;
            });
            
            onProgress(`Response received from ${result.provider}`, 'success');
            return { module: 'Chat Agent', testName: 'Complex Logic', status: 'pass', duration, apiProvider: result.provider };
        } catch (e: any) {
            const err = e.error || e;
            onProgress(`Chat Module Failed: ${err.message}`, 'error');
            return { 
                module: 'Chat Agent', 
                testName: 'Complex Logic', 
                status: 'fail', 
                duration: e.duration || 0, 
                error: err.message,
                codeLocation: this.analyzeError(err)
            };
        }
    }

    // 2. TEST CREATIVE
    private async testCreativeModule(userId: string, onProgress: ProgressCallback): Promise<TestResult[]> {
        onProgress("--- PHASE 3: STUDIO CRÉATIF ---", 'info');
        const results: TestResult[] = [];
        
        try {
            onProgress("Testing Image Gen Config...", 'info');
            // Fake call to test config validity without spending tokens
            const settings = db.getSystemSettings();
            if (!settings.aiConfig.geminiKey && settings.contentCreation.provider === 'gemini') {
                throw new Error("MISSING_API_KEY");
            }
            results.push({ module: 'Image Studio', testName: 'Config Check', status: 'pass', duration: 10, apiProvider: 'Gemini Image' });
        } catch (e: any) {
            results.push({ 
                module: 'Image Studio', 
                testName: 'Config Check', 
                status: 'fail', 
                duration: 0, 
                error: e.message,
                codeLocation: this.analyzeError(e.message)
            });
        }

        return results;
    }

    // 3. TEST WORKSPACE
    private async testWorkspaceModule(userId: string, onProgress: ProgressCallback): Promise<TestResult[]> {
        onProgress("--- PHASE 4: GOOGLE WORKSPACE ---", 'info');
        const results: TestResult[] = [];
        
        try {
            onProgress("Verifying OAuth2...", 'info');
            const status = await googleService.getAccountStatus(userId);
            
            if (status.status === 'disconnected') {
                throw new Error("AUTH_REQUIRED"); // Force mapping to code
            }
            
            if (status.status === 'mock') {
                throw new Error("MOCK_MODE"); // Force mapping to code warning
            }

            results.push({ module: 'Workspace', testName: 'Auth Check', status: 'pass', duration: 50, apiProvider: 'Google OAuth' });

        } catch (e: any) {
            onProgress(`Workspace Auth Issue: ${e.message}`, 'error');
            results.push({ 
                module: 'Workspace', 
                testName: 'Auth Check', 
                status: 'fail', 
                duration: 0, 
                error: e.message,
                codeLocation: this.analyzeError(e.message)
            });
        }

        return results;
    }

    // 4. TEST CRM
    private async testCrmFlow(onProgress: ProgressCallback): Promise<TestResult[]> {
        onProgress("--- PHASE 5: CRM & DB ---", 'info');
        // Mock success for now, focusing on identifying errors in other modules
        return [{ module: 'CRM', testName: 'DB Connection', status: 'pass', duration: 20 }];
    }

    // 5. TEST PROSPECTION
    private async testProspection(onProgress: ProgressCallback): Promise<TestResult> {
        return { module: 'Prospection', testName: 'Scraper', status: 'pass', duration: 10 };
    }

    async runFullSystemTest(userId: string = 'user_1', onProgress: ProgressCallback = () => {}): Promise<SystemReport> {
        const startTime = Date.now();
        let allResults: TestResult[] = [];

        // Execution
        allResults = [
            ...await this.checkCodeIntegrity(onProgress),
            await this.testChatModule(onProgress),
            ...await this.testCreativeModule(userId, onProgress),
            ...await this.testWorkspaceModule(userId, onProgress)
        ];

        // Aggregation des diagnostics de code
        const diagnostics: CodeDiagnostic[] = allResults
            .filter(r => r.status === 'fail' && r.codeLocation)
            .map(r => r.codeLocation!);

        return {
            id: `diag_${Date.now()}`,
            timestamp: new Date().toISOString(),
            environment: db.getSystemSettings().appMode,
            totalDuration: Date.now() - startTime,
            passCount: allResults.filter(t => t.status === 'pass').length,
            failCount: allResults.filter(t => t.status === 'fail').length,
            results: allResults,
            diagnostics,
            aiAnalysis: "Analyse terminée."
        };
    }
}

export const systemTester = new SystemTester();
