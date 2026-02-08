
import React, { useEffect, useState } from 'react';
import { billingService } from '../services/billingService';
import { db } from '../services/mockDatabase';
import { Invoice, Contract } from '../types';
import { 
    FileText, Download, RefreshCw, FileCheck, Briefcase, 
    ExternalLink, DollarSign, Clock, AlertCircle, CheckCircle2, 
    MoreHorizontal, ArrowUpRight, FileSpreadsheet, Plus, Filter,
    CreditCard, Calendar, Eye
} from 'lucide-react';

export const Billing: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'contracts'>('invoices');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'OVERDUE'>('ALL');
  const [stats, setStats] = useState({ totalRevenue: 0, pendingAmount: 0, signedContracts: 0 });

  const settings = db.getSystemSettings();

  const loadData = async () => {
    setLoading(true);
    try {
        const invData = await billingService.getInvoices();
        const contData = await billingService.getContracts();

        setInvoices(invData);
        setContracts(contData);

        const revenue = invData.filter((i: any) => i.status === 'paid').reduce((acc: number, curr: any) => acc + (curr.amountHT || 0), 0);
        const pending = invData.filter((i: any) => ['sent', 'draft', 'overdue'].includes(i.status)).reduce((acc: number, curr: any) => acc + (curr.amountHT || 0), 0);
        const signed = contData.filter((c: any) => c.status === 'SIGNED').length;

        setStats({ totalRevenue: revenue, pendingAmount: pending, signedContracts: signed });

    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusBadge = (status: string) => {
      switch(status.toLowerCase()) {
          case 'paid': return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider"><CheckCircle2 size={12}/> Payée</span>;
          case 'sent': return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold uppercase tracking-wider"><Clock size={12}/> Envoyée</span>;
          case 'overdue': return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase tracking-wider"><AlertCircle size={12}/> Retard</span>;
          case 'draft': return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-700/50 text-slate-400 border border-slate-700 text-[10px] font-bold uppercase tracking-wider">Brouillon</span>;
          default: return <span className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-xs">{status}</span>;
      }
  };

  const getContractStatusBadge = (status: string) => {
      switch(status) {
          case 'SIGNED': return <span className="text-emerald-400 font-bold text-xs flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20"><CheckCircle2 size={12}/> Signé</span>;
          case 'DRAFT': return <span className="text-slate-400 font-bold text-xs bg-slate-800 px-2 py-1 rounded-md">Brouillon</span>;
          default: return <span className="text-slate-500 text-xs">{status}</span>;
      }
  };

  const updateInvoiceStatus = async (id: string, newStatus: string) => {
      db.updateInvoice(id, { status: newStatus });
      loadData();
  };

  const updateContractStatus = async (id: string, newStatus: any) => {
      db.updateContract(id, { status: newStatus });
      loadData();
  };

  const openExternalSheet = (url?: string) => {
      if (url) window.open(url, '_blank');
      else alert("URL non configurée. Allez dans Admin Console > Infrastructure > Gestion & RH.");
  };

  // Filtrage
  const filteredInvoices = invoices.filter(inv => {
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'PAID') return inv.status === 'paid';
      if (statusFilter === 'PENDING') return ['draft', 'sent'].includes(inv.status);
      if (statusFilter === 'OVERDUE') return inv.status === 'overdue';
      return true;
  });

  return (
    <div className="p-8 h-full overflow-y-auto bg-background scrollbar-thin">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                Service RH & Finances
                <Briefcase size={24} className="text-blue-400" />
            </h1>
            <p className="text-slate-400 text-sm mt-1">Suivi de la facturation, devis et contrats clients.</p>
        </div>
        <div className="flex gap-2">
            <button onClick={loadData} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700">
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''}/>
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95">
                <Plus size={18} /> Nouvelle Facture
            </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-surface border border-slate-700 p-6 rounded-2xl shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><DollarSign size={64}/></div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Encaissé (Payé)</p>
              <h3 className="text-3xl font-bold text-emerald-400">{stats.totalRevenue.toLocaleString()} €</h3>
          </div>
          <div className="bg-surface border border-slate-700 p-6 rounded-2xl shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Clock size={64}/></div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Reste à Percevoir</p>
              <h3 className="text-3xl font-bold text-orange-400">{stats.pendingAmount.toLocaleString()} €</h3>
          </div>
          <div className="bg-surface border border-slate-700 p-6 rounded-2xl shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><FileCheck size={64}/></div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Contrats Actifs</p>
              <h3 className="text-3xl font-bold text-white">{stats.signedContracts}</h3>
          </div>
      </div>

      {/* EXTERNAL LINKS BAR */}
      <div className="flex flex-wrap gap-4 mb-8">
          {settings.invoices.invoiceSheetUrl && (
              <button onClick={() => openExternalSheet(settings.invoices.invoiceSheetUrl)} className="flex items-center gap-2 px-4 py-2 bg-[#1da462]/10 hover:bg-[#1da462]/20 text-[#1da462] border border-[#1da462]/30 rounded-xl text-xs font-bold transition-all">
                  <FileSpreadsheet size={16}/> GSheet Suivi Factures
                  <ArrowUpRight size={12}/>
              </button>
          )}
          {settings.invoices.quoteSheetUrl && (
              <button onClick={() => openExternalSheet(settings.invoices.quoteSheetUrl)} className="flex items-center gap-2 px-4 py-2 bg-[#1da462]/10 hover:bg-[#1da462]/20 text-[#1da462] border border-[#1da462]/30 rounded-xl text-xs font-bold transition-all">
                  <FileSpreadsheet size={16}/> GSheet Suivi Devis
                  <ArrowUpRight size={12}/>
              </button>
          )}
          {settings.invoices.contractSheetUrl && (
              <button onClick={() => openExternalSheet(settings.invoices.contractSheetUrl)} className="flex items-center gap-2 px-4 py-2 bg-[#4285f4]/10 hover:bg-[#4285f4]/20 text-[#4285f4] border border-[#4285f4]/30 rounded-xl text-xs font-bold transition-all">
                  <FileText size={16}/> GSheet Contrats
                  <ArrowUpRight size={12}/>
              </button>
          )}
      </div>

      {/* TABS */}
      <div className="flex gap-6 border-b border-slate-800 mb-6">
        <button onClick={() => setActiveTab('invoices')} className={`pb-4 px-2 text-sm font-bold transition-all relative ${activeTab === 'invoices' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}>
            Factures & Devis
            {activeTab === 'invoices' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"/>}
        </button>
        <button onClick={() => setActiveTab('contracts')} className={`pb-4 px-2 text-sm font-bold transition-all relative ${activeTab === 'contracts' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}>
            Contrats
            {activeTab === 'contracts' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"/>}
        </button>
      </div>

      {/* CONTENT */}
      {activeTab === 'invoices' ? (
        <div className="space-y-4">
            
            {/* FILTERS */}
            <div className="flex gap-2">
                <button onClick={() => setStatusFilter('ALL')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${statusFilter === 'ALL' ? 'bg-slate-700 text-white border-slate-600' : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-800'}`}>Tout</button>
                <button onClick={() => setStatusFilter('PAID')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${statusFilter === 'PAID' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-800'}`}>Payées</button>
                <button onClick={() => setStatusFilter('PENDING')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${statusFilter === 'PENDING' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-800'}`}>En attente</button>
                <button onClick={() => setStatusFilter('OVERDUE')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${statusFilter === 'OVERDUE' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-800'}`}>Retard</button>
            </div>

            <div className="bg-surface border border-slate-700 rounded-[24px] overflow-hidden shadow-xl">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                    <th className="px-6 py-4">Réf.</th>
                    <th className="px-6 py-4">Client</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Montant HT</th>
                    <th className="px-6 py-4 text-center">Statut</th>
                    <th className="px-6 py-4 text-right">Suivi</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredInvoices.length === 0 ? (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-500 italic">Aucune facture ne correspond aux critères.</td></tr>
                ) : (
                    filteredInvoices.map(inv => (
                        <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors group">
                        <td className="px-6 py-4 font-mono text-xs text-slate-400">{inv.number}</td>
                        <td className="px-6 py-4 font-medium text-white">{inv.clients?.name || 'Client Inconnu'}</td>
                        <td className="px-6 py-4 text-xs text-slate-500">{new Date(inv.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-bold text-white text-right font-mono">{(inv.amountHT || 0).toLocaleString()} €</td>
                        <td className="px-6 py-4 flex justify-center">{getStatusBadge(inv.status)}</td>
                        <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                                {inv.status !== 'paid' ? (
                                    <button 
                                        onClick={() => updateInvoiceStatus(inv.id, 'paid')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg transition-colors text-xs font-bold" 
                                        title="Marquer comme payé"
                                    >
                                        <CreditCard size={14}/> Encaisser
                                    </button>
                                ) : (
                                    <span className="text-[10px] text-slate-500 italic px-3">Clôturé</span>
                                )}
                                <button className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700" title="Télécharger PDF">
                                    <Download size={14}/>
                                </button>
                            </div>
                        </td>
                        </tr>
                    ))
                )}
                </tbody>
            </table>
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {contracts.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-surface/30 border border-dashed border-slate-800 rounded-2xl text-slate-500 italic">
                  Aucun contrat généré.
              </div>
          ) : (
              contracts.map(c => (
                  <div key={c.id} className="bg-surface border border-slate-700 p-6 rounded-[24px] hover:border-slate-500 transition-all group shadow-lg flex flex-col justify-between h-48">
                      <div>
                          <div className="flex justify-between items-start mb-4">
                              <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20"><FileCheck size={24}/></div>
                              {getContractStatusBadge(c.status)}
                          </div>
                          <h4 className="text-white font-bold text-lg mb-1 truncate">{c.clients?.name}</h4>
                          <p className="text-xs text-slate-500">Créé le {new Date(c.created_at).toLocaleDateString()}</p>
                      </div>
                      
                      <div className="flex gap-3 mt-4 pt-4 border-t border-slate-800/50">
                          {c.status !== 'SIGNED' && (
                              <button 
                                onClick={() => updateContractStatus(c.id, 'SIGNED')}
                                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg"
                              >
                                  <CheckCircle2 size={14}/> Valider Signature
                              </button>
                          )}
                          <button className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                              <Download size={14} /> PDF
                          </button>
                      </div>
                  </div>
              ))
          )}
        </div>
      )}
    </div>
  );
};
