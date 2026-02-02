
import { db } from './mockDatabase';
import { Template, TemplateType, AirtableConfig, AirtableBase, AirtableTable } from '../types';

/**
 * Service Airtable Multi-Base
 */
export class AirtableRepository {

  private async delay(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

  async listBases(pat: string): Promise<AirtableBase[]> {
      await this.delay(800);
      if (!pat.startsWith('pat')) throw new Error("PAT Invalide");

      return [
          { id: 'app_finance', name: 'Gestion Agence (Finance)', permissionLevel: 'create' },
          { id: 'app_legal', name: 'Juridique & Contrats', permissionLevel: 'edit' },
      ];
  }

  async listTables(pat: string, baseId: string): Promise<AirtableTable[]> {
      await this.delay(600);
      if (!baseId) return [];

      if (baseId === 'app_finance') {
          return [
              { id: 'tblInvoices', name: 'Invoices' },
              { id: 'tblQuotes', name: 'Quotes' }
          ];
      }
      
      return [
          { id: 'tblDefault', name: 'Table 1' }
      ];
  }

  async syncTemplates(): Promise<Template[]> {
    const settings = db.getGlobalSettings();
    let config: AirtableConfig | null = null;

    if (settings.airtableConfigEncrypted) {
        try {
            const json = db.decrypt(settings.airtableConfigEncrypted);
            config = JSON.parse(json);
        } catch (e) {
            console.error("Invalid Airtable Global Config", e);
        }
    }

    if (!config) throw new Error("Airtable non connecté");

    await this.delay(1000);
    
    const invoiceTemplates: Template[] = [{
        id: 'tpl_inv_1',
        airtableRecordId: 'recInv1',
        baseId: config.invoiceBaseId || '',
        name: 'Facture Freelance Simple',
        type: TemplateType.INVOICE,
        contentMarkdown: '# FACTURE {{number}}\nClient: {{clientName}}',
        version: 1,
        updatedAt: new Date().toISOString()
    }];

    const contractTemplates: Template[] = [{
        id: 'tpl_ctr_1',
        airtableRecordId: 'recCtr1',
        baseId: config.contractBaseId || '',
        name: 'Contrat Montage Vidéo',
        type: TemplateType.CONTRACT,
        contentMarkdown: '# CONTRAT\nEntre {{clientName}} et moi...',
        version: 2,
        updatedAt: new Date().toISOString()
    }];

    [...invoiceTemplates, ...contractTemplates].forEach(t => db.addTemplate(t));
    return db.getTemplates();
  }

  async validateConnection(token: string, baseId: string): Promise<boolean> {
      if (!token.startsWith('pat')) throw new Error("Token PAT invalide");
      if (!baseId.startsWith('app')) throw new Error("Base ID invalide");
      return true;
  }
}

export const airtableService = new AirtableRepository();
