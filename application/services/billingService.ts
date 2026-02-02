import { db } from './mockDatabase';
import { Contract, Invoice, ContractStatus } from '../types';

export class BillingService {

  async generateContract(clientId: string, templateId: string, variables: Record<string, string>) {
    const client = db.getClientById(clientId);
    const template = db.getTemplates().find(t => t.id === templateId);

    if (!client || !template) throw new Error("Client ou Template introuvable");

    // Replace variables simlpiste
    let content = template.contentMarkdown || "";
    content = content.replace('{{clientName}}', client.name);
    Object.keys(variables).forEach(key => {
        content = content.replace(`{{${key}}}`, variables[key]);
    });

    const contract = db.createContract({
      clientId,
      templateId,
      contentSnapshot: content,
      status: ContractStatus.DRAFT
    });

    return contract;
  }

  async generateInvoice(clientId: string, items: { description: string, price: number }[]) {
     const client = db.getClientById(clientId);
     if (!client) throw new Error("Client introuvable");

     const total = items.reduce((acc, item) => acc + item.price, 0);
     
     const invoice = db.createInvoice({
        clientId,
        amountHT: total,
        items,
        status: 'draft'
     });

     return invoice;
  }
}

export const billingService = new BillingService();