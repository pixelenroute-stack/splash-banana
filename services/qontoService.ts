
import { db } from './mockDatabase';
import { Invoice } from '../types';

interface QontoTransaction {
  transaction_id: string;
  amount: number;
  amount_cents: number;
  currency: string;
  side: 'credit' | 'debit';
  operation_type: string;
  label: string;
  settled_at: string;
  emitted_at: string;
  status: string;
  note?: string;
  reference?: string;
  category?: string;
  attachment_ids?: string[];
}

interface QontoOrganization {
  slug: string;
  bank_accounts: Array<{
    slug: string;
    iban: string;
    bic: string;
    currency: string;
    balance: number;
    balance_cents: number;
    authorized_balance: number;
    authorized_balance_cents: number;
    name: string;
  }>;
}

export class QontoService {
  private login: string = '';
  private secretKey: string = '';
  private iban: string = '';
  private isConfigured: boolean = false;

  constructor() {
    this.loadConfig();
  }

  public loadConfig() {
    const settings = db.getSystemSettings();
    if (settings.qonto?.login && settings.qonto?.secretKey) {
      this.login = settings.qonto.login;
      this.secretKey = settings.qonto.secretKey;
      this.iban = settings.qonto.iban || '';
      this.isConfigured = true;
    } else {
      this.isConfigured = false;
    }
  }

  public getStatus() {
    return { configured: this.isConfigured, hasIban: !!this.iban };
  }

  private async callQonto(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any): Promise<any> {
    if (!this.isConfigured) throw new Error('Qonto not configured');

    const response = await fetch('/api/proxy/qonto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint,
        method,
        body,
        login: this.login,
        secretKey: this.secretKey,
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || `Qonto API Error ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get organization info + bank accounts
   */
  async getOrganization(): Promise<QontoOrganization | null> {
    try {
      const data = await this.callQonto('/organization');
      return data.organization;
    } catch (e) {
      console.error('[QontoService] getOrganization failed:', e);
      return null;
    }
  }

  /**
   * Get bank account balance
   */
  async getBalance(): Promise<{ balance: number; currency: string } | null> {
    try {
      const org = await this.getOrganization();
      if (!org?.bank_accounts?.length) return null;

      // If IBAN is configured, find matching account
      const account = this.iban
        ? org.bank_accounts.find(a => a.iban === this.iban) || org.bank_accounts[0]
        : org.bank_accounts[0];

      return {
        balance: account.balance,
        currency: account.currency,
      };
    } catch {
      return null;
    }
  }

  /**
   * Fetch transactions (last N days)
   */
  async getTransactions(days: number = 30, page: number = 1): Promise<QontoTransaction[]> {
    try {
      const org = await this.getOrganization();
      if (!org?.bank_accounts?.length) return [];

      const accountSlug = this.iban
        ? org.bank_accounts.find(a => a.iban === this.iban)?.slug || org.bank_accounts[0].slug
        : org.bank_accounts[0].slug;

      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);

      const params = new URLSearchParams({
        slug: accountSlug,
        settled_at_from: sinceDate.toISOString(),
        current_page: page.toString(),
        per_page: '100',
      });

      const data = await this.callQonto(`/transactions?${params.toString()}`);
      return data.transactions || [];
    } catch (e) {
      console.error('[QontoService] getTransactions failed:', e);
      return [];
    }
  }

  /**
   * Map Qonto transactions to our Invoice format (credit transactions = payments received)
   */
  async getInvoicesFromTransactions(days: number = 90): Promise<Invoice[]> {
    const transactions = await this.getTransactions(days);

    return transactions
      .filter(t => t.side === 'credit')
      .map((t, idx) => ({
        id: `qonto_${t.transaction_id}`,
        number: t.reference || `QNT-${idx + 1}`,
        clientId: 'qonto',
        qontoInvoiceId: t.transaction_id,
        amountHT: t.amount / 1.2, // Estimate HT from TTC (20% TVA default)
        amountTTC: t.amount,
        tvaRate: 20,
        status: 'paid' as const,
        items: [{ description: t.label || t.note || 'Paiement Qonto', price: t.amount }],
        dueDate: t.settled_at,
        paidAt: t.settled_at,
        created_at: t.emitted_at || t.settled_at,
        clients: { name: t.label || 'Client Qonto' },
      }));
  }

  /**
   * Get revenue stats from transactions
   */
  async getRevenueStats(days: number = 30): Promise<{
    totalRevenue: number;
    totalExpenses: number;
    transactionCount: number;
    currency: string;
  }> {
    const transactions = await this.getTransactions(days);

    let totalRevenue = 0;
    let totalExpenses = 0;

    transactions.forEach(t => {
      if (t.side === 'credit') totalRevenue += t.amount;
      else totalExpenses += t.amount;
    });

    return {
      totalRevenue,
      totalExpenses,
      transactionCount: transactions.length,
      currency: 'EUR',
    };
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const org = await this.getOrganization();
      return !!org?.slug;
    } catch { return false; }
  }
}

export const qontoService = new QontoService();
