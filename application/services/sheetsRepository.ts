
import { googleService } from './googleService';
import { db } from './mockDatabase';
import { NotionClient } from '../types';

// --- TYPES & INTERFACES ---

interface ColumnMapping {
    [key: string]: number; // Field Name -> Column Index (0-based)
}

interface SyncResult {
    success: boolean;
    localChanges: number;
    remoteChanges: number;
    errors: ValidationError[];
    timestamp: string;
    data?: NotionClient[];
    message?: string;
}

interface ValidationError {
    clientId?: string;
    field: string;
    reason: string;
}

interface ClientUpdate {
    rowNumber?: number; // If undefined, treat as insert
    client: Partial<NotionClient>;
    operation: 'insert' | 'update';
}

// Mapping between App Interface Keys and expected Sheet Header Names
// Keys = NotionClient properties, Values = Sheet Header Strings
const FIELD_TO_HEADER_MAP: Record<string, string> = {
    name: 'Nom',
    companyName: 'Entreprise',
    email: 'Email',
    leadStatus: 'Statut',
    serviceType: 'Service',
    contactDate: 'Date Contact',
    comments: 'Commentaire',
    youtubeChannel: 'YouTube',
    instagramAccount: 'Instagram',
    postalAddress: 'Adresse',
    // Optional timestamps for conflict resolution
    lastSyncedAt: 'Last Modified',
    notionProjectUrl: 'Notion Project' // Added for project linking
};

export class SheetsRepository {
    
    private readonly CURRENT_USER_ID = "user_1";
    private columnMapping: ColumnMapping | null = null;
    private sheetIdCache: number | null = null; // Numeric Sheet ID (gid), distinct from Spreadsheet ID

    // --- 1. DYNAMIC MAPPING & INITIALIZATION ---

    /**
     * Fetches the header row (Row 1) and builds a map of Column Name -> Index
     */
    private async fetchHeaderMapping(spreadsheetId: string): Promise<ColumnMapping> {
        if (this.columnMapping) return this.columnMapping;

        try {
            const response = await googleService.fetchGoogle(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/1:1`,
                this.CURRENT_USER_ID
            );

            const headers = response.values?.[0] || [];
            const mapping: ColumnMapping = {};

            headers.forEach((header: string, index: number) => {
                mapping[header.trim()] = index;
            });

            // Validation: Ensure strictly required columns exist
            if (mapping[FIELD_TO_HEADER_MAP.name] === undefined) {
                // If missing, we might want to be lenient or throw
                // For critical operations, throwing is safer.
                throw new Error(`Colonne obligatoire manquante dans le Sheet : '${FIELD_TO_HEADER_MAP.name}'`);
            }

            this.columnMapping = mapping;
            return mapping;
        } catch (e) {
            console.error("[Sheets] Failed to map headers", e);
            throw e;
        }
    }

    /**
     * Gets the numeric Sheet ID (gid) usually 0 for the first sheet
     */
    private async getSheetId(spreadsheetId: string): Promise<number> {
        if (this.sheetIdCache !== null) return this.sheetIdCache;
        
        try {
            const meta = await googleService.fetchGoogle(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
                this.CURRENT_USER_ID
            );
            // Default to first sheet
            this.sheetIdCache = meta.sheets?.[0]?.properties?.sheetId || 0;
            return this.sheetIdCache!;
        } catch (e) {
            return 0; // Fallback default
        }
    }

    // --- 2. DATA CONVERSION HELPERS ---

    private mapRowToClient(row: string[], rowIndex: number, mapping: ColumnMapping): NotionClient {
        const getValue = (key: string) => {
            const header = FIELD_TO_HEADER_MAP[key];
            const idx = mapping[header];
            return idx !== undefined && row[idx] ? row[idx] : '';
        };

        return {
            id: `sheet_row_${rowIndex}`,
            spreadsheetRow: rowIndex,
            name: getValue('name') || 'Sans nom',
            companyName: getValue('companyName'),
            email: getValue('email'),
            leadStatus: getValue('leadStatus') || 'Lead',
            serviceType: getValue('serviceType'),
            contactDate: getValue('contactDate') || new Date().toISOString(),
            comments: getValue('comments'),
            youtubeChannel: getValue('youtubeChannel'),
            instagramAccount: getValue('instagramAccount'),
            postalAddress: getValue('postalAddress'),
            notionProjectUrl: getValue('notionProjectUrl'),
            isArchived: false,
            lastSyncedAt: getValue('lastSyncedAt') || new Date().toISOString(),
            isContacted: false,
            giftSent: false
        };
    }

    private mapClientToRow(client: Partial<NotionClient>, mapping: ColumnMapping): (string | number | boolean)[] {
        // Find max index to determine row length
        const indices = Object.values(mapping);
        const maxIndex = indices.length > 0 ? Math.max(...indices) : 0;
        const row = new Array(maxIndex + 1).fill('');

        Object.entries(FIELD_TO_HEADER_MAP).forEach(([field, header]) => {
            const colIdx = mapping[header];
            if (colIdx !== undefined) {
                // @ts-ignore
                let val = client[field];
                if (val === undefined || val === null) val = '';
                row[colIdx] = val;
            }
        });

        return row;
    }

    // --- 3. VALIDATION ---

    public validateClient(client: Partial<NotionClient>): ValidationError[] {
        const errors: ValidationError[] = [];
        if (!client.name || client.name.trim() === '') {
            errors.push({ field: 'name', reason: 'Le nom est obligatoire.' });
        }
        return errors;
    }

    // --- 4. CORE: FETCH (PULL) ---

    /**
     * Lit les données du Google Sheet via mapping dynamique
     */
    async fetchClients(): Promise<{ success: boolean, data: NotionClient[], message?: string }> {
        const settings = db.getSystemSettings();
        const spreadsheetId = settings.clients.spreadsheetId;

        if (!spreadsheetId) {
            return { success: false, data: [], message: "ID Google Sheet manquant." };
        }

        // Check connection
        const account = db.getGoogleAccount(this.CURRENT_USER_ID);
        if (!account) return { success: false, data: [], message: "Compte Google non connecté" };

        try {
            // 1. Get Mapping
            const mapping = await this.fetchHeaderMapping(spreadsheetId);

            // 2. Fetch Data (All rows)
            const response = await googleService.fetchGoogle(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:Z`,
                this.CURRENT_USER_ID
            );

            const rows = response.values;
            if (!rows || rows.length < 2) return { success: true, data: [] };

            // 3. Convert
            const clients: NotionClient[] = rows.slice(1).map((row: string[], index: number) => 
                this.mapRowToClient(row, index + 2, mapping) // +2 because 0-indexed + 1 header row
            );

            return { success: true, data: clients };

        } catch (e) {
            console.error("[Sheets] Fetch Error:", e);
            // Invalidate cache on error in case headers changed
            this.columnMapping = null; 
            return { success: false, data: [], message: (e as Error).message };
        }
    }

    // --- 5. CORE: BATCH UPDATE (PUSH) ---

    /**
     * Pushes a list of updates (Inserts or Updates) to Google Sheets efficiently.
     */
    async batchUpdateSheet(updates: ClientUpdate[]): Promise<SyncResult> {
        const settings = db.getSystemSettings();
        const spreadsheetId = settings.clients.spreadsheetId;
        const result: SyncResult = { success: false, localChanges: 0, remoteChanges: 0, errors: [], timestamp: new Date().toISOString() };

        if (!spreadsheetId) return { ...result, message: "ID Sheet manquant" };

        try {
            const mapping = await this.fetchHeaderMapping(spreadsheetId);
            const sheetId = await this.getSheetId(spreadsheetId);

            const updateRequests: any[] = [];
            const appendRows: any[] = [];

            for (const update of updates) {
                // Validate
                const validationErrors = this.validateClient(update.client);
                if (validationErrors.length > 0) {
                    result.errors.push(...validationErrors);
                    continue;
                }

                const rowData = this.mapClientToRow(update.client, mapping);

                if (update.operation === 'update' && update.rowNumber) {
                    updateRequests.push({
                        range: `A${update.rowNumber}`, // We rely on the row knowing where it starts - A is arbitrary anchor, API handles full row if needed, but here we supply Values
                        // For valueInput, we specify range. The API figures out columns from the array length.
                        // Ideally we should construct Range like Sheet1!A5
                        values: [rowData]
                    });
                } else {
                    appendRows.push(rowData);
                }
            }

            const promises: Promise<any>[] = [];

            if (updateRequests.length > 0) {
                promises.push(googleService.fetchGoogle(
                    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
                    this.CURRENT_USER_ID,
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            valueInputOption: 'USER_ENTERED',
                            data: updateRequests
                        })
                    }
                ));
            }

            if (appendRows.length > 0) {
                promises.push(googleService.fetchGoogle(
                    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`,
                    this.CURRENT_USER_ID,
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            values: appendRows
                        })
                    }
                ));
            }

            await Promise.all(promises);

            result.success = true;
            result.localChanges = updates.length;
            return result;

        } catch (e) {
            console.error("[Sheets] Batch Update Error:", e);
            return { ...result, message: (e as Error).message };
        }
    }

    // --- 6. WRAPPERS WITH ROW RETURN ---

    /**
     * Ajoute un nouveau client et retourne son numéro de ligne (vital pour la synchronisation).
     */
    async addClient(client: Partial<NotionClient>): Promise<{ success: boolean; rowNumber?: number; message?: string }> {
        const settings = db.getSystemSettings();
        const spreadsheetId = settings.clients.spreadsheetId;
        
        if (!spreadsheetId) return { success: false, message: "Sheet ID manquant" };

        try {
            const mapping = await this.fetchHeaderMapping(spreadsheetId);
            const rowData = this.mapClientToRow(client, mapping);

            const response = await googleService.fetchGoogle(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`,
                this.CURRENT_USER_ID,
                {
                    method: 'POST',
                    body: JSON.stringify({ values: [rowData] })
                }
            );

            // Extract Row Number from 'updatedRange' (e.g., "Sheet1!A15:J15")
            let rowNumber: number | undefined;
            if (response.updates && response.updates.updatedRange) {
                const range = response.updates.updatedRange;
                const match = range.match(/[A-Z]+(\d+):/);
                if (match && match[1]) {
                    rowNumber = parseInt(match[1], 10);
                }
            }

            return { success: true, rowNumber };

        } catch (e) {
            console.error("[Sheets] Add Client Error:", e);
            return { success: false, message: (e as Error).message };
        }
    }

    /**
     * Met à jour un client existant.
     */
    async updateClient(rowNumber: number, client: Partial<NotionClient>): Promise<{ success: boolean }> {
        const settings = db.getSystemSettings();
        const spreadsheetId = settings.clients.spreadsheetId;
        
        if (!spreadsheetId) return { success: false };

        try {
            const mapping = await this.fetchHeaderMapping(spreadsheetId);
            const rowData = this.mapClientToRow(client, mapping);

            await googleService.fetchGoogle(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A${rowNumber}:append?valueInputOption=USER_ENTERED`, 
                // NOTE: 'append' endpoint used above for simplicity in batch, but for specific row update, we need PUT/UPDATE on range.
                // Correction: Use update for specific row.
                this.CURRENT_USER_ID,
                {
                    method: 'PUT', // or POST to values/{range}?valueInputOption
                }
            );
            
            // To properly update a specific row A{row}:
            await googleService.fetchGoogle(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A${rowNumber}?valueInputOption=USER_ENTERED`,
                this.CURRENT_USER_ID,
                {
                    method: 'PUT',
                    body: JSON.stringify({ values: [rowData] })
                }
            );

            return { success: true };
        } catch (e) {
            console.error("[Sheets] Update Client Error:", e);
            return { success: false };
        }
    }
    
    async deleteClient(rowNumber: number): Promise<boolean> {
        // Clearing the row is easier than deleting it via API (which requires batchUpdate with deleteDimension)
        const settings = db.getSystemSettings();
        const spreadsheetId = settings.clients.spreadsheetId;
        
        if (!spreadsheetId) return false;

        try {
            await googleService.fetchGoogle(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A${rowNumber}:Z${rowNumber}:clear`,
                this.CURRENT_USER_ID,
                { method: 'POST' }
            );
            return true;
        } catch (e) {
            console.error("Failed to clear row", e);
            return false;
        }
    }
}

export const sheetsService = new SheetsRepository();
