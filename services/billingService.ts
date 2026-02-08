
import { db } from './mockDatabase';
import { Contract, Invoice, ContractStatus } from '../types';
import { qontoService } from './qontoService';
import { n8nAgentService } from '../lib/n8nAgentService';

export class BillingService {

  /**
   * Generate a contract via n8n workflow (Google Docs template) or local fallback
   */
  async generateContract(clientId: string, templateId: string, variables: Record<string, string>): Promise<Contract> {
    const client = db.getClientById(clientId);
    if (!client) throw new Error("Client introuvable");

    const settings = db.getSystemSettings();
    const googleTemplateId = settings.contracts?.googleDocsTemplateId || templateId;

    // Try n8n workflow for Google Docs generation
    try {
      const response = await n8nAgentService.sendAction('contracts', {
        action: 'generate_contract',
        clientId,
        clientName: client.name,
        clientEmail: client.email || '',
        templateId: googleTemplateId,
        outputFolderId: settings.contracts?.outputDriveFolderId || '',
        variables,
      });

      if (response?.success && response.data) {
        const contract = db.createContract({
          clientId,
          templateId: googleTemplateId,
          googleDocId: response.data.googleDocId,
          googleDocUrl: response.data.googleDocUrl,
          pdfUrl: response.data.pdfUrl,
          variables,
          contentSnapshot: response.data.content || '',
          status: ContractStatus.DRAFT,
        });
        return contract;
      }
    } catch (e) {
      console.warn('[BillingService] n8n contract generation failed, using local fallback:', e);
    }

    // Fallback: local contract creation (no Google Docs)
    const template = db.getTemplates().find(t => t.id === templateId);
    let content = template?.contentMarkdown || "";
    content = content.replace('{{clientName}}', client.name);
    Object.keys(variables).forEach(key => {
      content = content.replace(`{{${key}}}`, variables[key]);
    });

    const contract = db.createContract({
      clientId,
      templateId,
      contentSnapshot: content,
      variables,
      status: ContractStatus.DRAFT
    });

    return contract;
  }

  /**
   * Generate an invoice - save locally + optionally push to n8n for Qonto
   */
  async generateInvoice(clientId: string, items: { description: string; quantity?: number; unitPrice?: number; price: number }[], dueDate?: string): Promise<Invoice> {
    const client = db.getClientById(clientId);
    if (!client) throw new Error("Client introuvable");

    const total = items.reduce((acc, item) => acc + item.price, 0);
    const tvaRate = 20;
    const amountTTC = total * (1 + tvaRate / 100);

    const invoice = db.createInvoice({
      clientId,
      amountHT: total,
      amountTTC,
      tvaRate,
      items,
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'draft'
    });

    // Try to push to n8n for Qonto / PDF generation
    try {
      await n8nAgentService.sendAction('unified_action', {
        action: 'create_invoice',
        invoiceId: invoice.id,
        clientName: client.name,
        clientEmail: client.email || '',
        amountHT: total,
        amountTTC,
        tvaRate,
        items,
        dueDate: invoice.dueDate,
      });
    } catch (e) {
      console.warn('[BillingService] n8n invoice push failed (invoice saved locally):', e);
    }

    return invoice;
  }

  /**
   * Get all invoices: merge Qonto transactions + local invoices
   */
  async getInvoices(): Promise<Invoice[]> {
    const localInvoices = db.getInvoices();

    // If Qonto is configured, merge with bank transactions
    if (qontoService.getStatus().configured) {
      try {
        const qontoInvoices = await qontoService.getInvoicesFromTransactions(90);
        // Merge: local first, then qonto (deduplicate by qontoInvoiceId)
        const existingQontoIds = new Set(localInvoices.filter(i => i.qontoInvoiceId).map(i => i.qontoInvoiceId));
        const newFromQonto = qontoInvoices.filter(qi => !existingQontoIds.has(qi.qontoInvoiceId));
        return [...localInvoices, ...newFromQonto];
      } catch (e) {
        console.warn('[BillingService] Qonto fetch failed, returning local invoices:', e);
      }
    }

    return localInvoices;
  }

  /**
   * Get contracts from local DB
   */
  async getContracts(): Promise<Contract[]> {
    return db.getContracts();
  }

  /**
   * Send invoice via n8n email workflow
   */
  async sendInvoice(invoiceId: string): Promise<boolean> {
    const invoice = db.getInvoices().find(i => i.id === invoiceId);
    if (!invoice) return false;

    try {
      await n8nAgentService.sendAction('email_sender', {
        action: 'send_invoice',
        invoiceId: invoice.id,
        clientId: invoice.clientId,
        clientEmail: invoice.clients?.email || '',
        amount: invoice.amountTTC || invoice.amountHT,
        pdfUrl: invoice.pdfUrl,
      });
      db.updateInvoice(invoiceId, { status: 'sent' });
      return true;
    } catch (e) {
      console.warn('[BillingService] sendInvoice failed:', e);
      return false;
    }
  }
}

export const billingService = new BillingService();
