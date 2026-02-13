'use client'

import { useEffect, useState, FormEvent } from 'react'
import { Receipt, Plus, Search, FileText, Loader2, X, Trash2, ExternalLink } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Invoice, Contract } from '@/types'

const INVOICE_STATUS_COLORS: Record<Invoice['status'], string> = {
  draft: 'bg-gray-500/10 text-gray-400',
  sent: 'bg-blue-500/10 text-blue-400',
  paid: 'bg-green-500/10 text-green-400',
  overdue: 'bg-red-500/10 text-red-400',
  cancelled: 'bg-muted/10 text-muted',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', sent: 'Envoyée', paid: 'Payée', overdue: 'En retard', cancelled: 'Annulée',
  signed: 'Signé',
}

type TabId = 'invoices' | 'quotes' | 'contracts'

export default function InvoicesPage() {
  const [tab, setTab] = useState<TabId>('invoices')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Invoice form
  const [clientName, setClientName] = useState('')
  const [items, setItems] = useState([{ description: '', quantity: 1, unitPrice: 0 }])
  const [dueDate, setDueDate] = useState('')

  // Contract form
  const [contractData, setContractData] = useState({ clientName: '', projectName: '', amount: 0, startDate: '', endDate: '' })

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const [invRes, ctrRes] = await Promise.all([
          fetch('/api/invoices'),
          fetch('/api/invoices?type=contracts'),
        ])
        const invData = await invRes.json()
        const ctrData = await ctrRes.json()
        if (invData.success) setInvoices(invData.data)
        if (ctrData.success) setContracts(ctrData.data)
      } catch {
        // Not loaded
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  function addItem() {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0 }])
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: string, value: string | number) {
    setItems(items.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const totalHT = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const totalTVA = totalHT * 0.2
  const totalTTC = totalHT + totalTVA

  async function handleCreateInvoice(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const isQuote = tab === 'quotes'
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          items: items.filter((i) => i.description),
          dueDate,
          status: isQuote ? 'draft' : 'draft',
        }),
      })
      const data = await res.json()
      if (data.success) {
        setInvoices((prev) => [data.data as Invoice, ...prev])
        setShowForm(false)
        setClientName('')
        setItems([{ description: '', quantity: 1, unitPrice: 0 }])
        setDueDate('')
      }
    } catch {
      // Error
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCreateContract(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...contractData, type: 'contract' }),
      })
      const data = await res.json()
      if (data.success) {
        setContracts((prev) => [data.data as Contract, ...prev])
        setShowForm(false)
        setContractData({ clientName: '', projectName: '', amount: 0, startDate: '', endDate: '' })
      }
    } catch {
      // Error
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredInvoices = invoices.filter((i) =>
    i.number?.toLowerCase().includes(search.toLowerCase()) ||
    i.clientName?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredContracts = contracts.filter((c) =>
    (c as Contract).clientName?.toLowerCase().includes(search.toLowerCase()) ||
    (c as Contract).projectName?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Facturation</h1>
          <p className="text-muted text-sm mt-1">Factures, devis et contrats</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span className="text-sm">{showForm ? 'Annuler' : tab === 'contracts' ? 'Nouveau contrat' : 'Nouvelle facture'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface border border-border rounded-lg p-1 w-fit">
        {([
          { id: 'invoices' as TabId, label: 'Factures' },
          { id: 'quotes' as TabId, label: 'Devis' },
          { id: 'contracts' as TabId, label: 'Contrats' },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setShowForm(false) }}
            className={`px-4 py-2 rounded text-sm transition-colors ${tab === t.id ? 'bg-primary/20 text-lantean-blue font-medium' : 'text-muted hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Invoice/Quote creation form */}
      {showForm && tab !== 'contracts' && (
        <form onSubmit={handleCreateInvoice} className="card space-y-4">
          <h3 className="font-semibold">{tab === 'quotes' ? 'Nouveau devis' : 'Nouvelle facture'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nom du client"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue"
              required
            />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="px-4 py-2.5 bg-background border border-border rounded-lg text-white outline-none focus:border-lantean-blue"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Lignes</p>
            {items.map((item, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateItem(i, 'description', e.target.value)}
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue text-sm"
                />
                <input
                  type="number"
                  placeholder="Qté"
                  value={item.quantity}
                  onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 0)}
                  className="w-20 px-3 py-2 bg-background border border-border rounded-lg text-white outline-none focus:border-lantean-blue text-sm"
                  min={1}
                />
                <input
                  type="number"
                  placeholder="Prix HT"
                  value={item.unitPrice || ''}
                  onChange={(e) => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)}
                  className="w-28 px-3 py-2 bg-background border border-border rounded-lg text-white outline-none focus:border-lantean-blue text-sm"
                  step="0.01"
                />
                <span className="text-sm text-muted w-24 text-right">{formatCurrency(item.quantity * item.unitPrice)}</span>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(i)} className="p-1 text-muted hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addItem} className="text-sm text-lantean-blue hover:underline">
              + Ajouter une ligne
            </button>
          </div>

          <div className="flex justify-between items-end">
            <div className="text-sm space-y-1">
              <p className="text-muted">Total HT : <span className="text-white">{formatCurrency(totalHT)}</span></p>
              <p className="text-muted">TVA 20% : <span className="text-white">{formatCurrency(totalTVA)}</span></p>
              <p className="font-bold text-gold-accent">Total TTC : {formatCurrency(totalTTC)}</p>
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !clientName}
              className="px-6 py-2.5 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-30 font-medium"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Créer ${tab === 'quotes' ? 'le devis' : 'la facture'}`}
            </button>
          </div>
        </form>
      )}

      {/* Contract creation form */}
      {showForm && tab === 'contracts' && (
        <form onSubmit={handleCreateContract} className="card space-y-4">
          <h3 className="font-semibold">Nouveau contrat (Google Docs)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nom du client"
              value={contractData.clientName}
              onChange={(e) => setContractData({ ...contractData, clientName: e.target.value })}
              className="px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue"
              required
            />
            <input
              type="text"
              placeholder="Nom du projet"
              value={contractData.projectName}
              onChange={(e) => setContractData({ ...contractData, projectName: e.target.value })}
              className="px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue"
              required
            />
            <input
              type="number"
              placeholder="Montant (EUR)"
              value={contractData.amount || ''}
              onChange={(e) => setContractData({ ...contractData, amount: parseFloat(e.target.value) || 0 })}
              className="px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue"
              step="0.01"
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={contractData.startDate}
                onChange={(e) => setContractData({ ...contractData, startDate: e.target.value })}
                className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-white outline-none focus:border-lantean-blue"
              />
              <input
                type="date"
                value={contractData.endDate}
                onChange={(e) => setContractData({ ...contractData, endDate: e.target.value })}
                className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-white outline-none focus:border-lantean-blue"
              />
            </div>
          </div>
          <p className="text-xs text-muted">Un document Google Docs sera généré automatiquement avec le template de contrat.</p>
          <button
            type="submit"
            disabled={isSubmitting || !contractData.clientName || !contractData.projectName}
            className="px-6 py-2.5 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-30 font-medium"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Générer le contrat'}
          </button>
        </form>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-lantean-blue animate-spin" />
        </div>
      ) : tab === 'contracts' ? (
        filteredContracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted">
            <FileText className="w-12 h-12 mb-4 opacity-30" />
            <p>Aucun contrat</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredContracts.map((contract) => (
              <div key={contract.id} className="card-hover flex items-center justify-between">
                <div>
                  <p className="font-medium">{contract.clientName} — {contract.projectName}</p>
                  <p className="text-sm text-muted">
                    {formatCurrency(contract.amount)} · {contract.startDate ? formatDate(contract.startDate) : 'Date à définir'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    contract.status === 'signed' ? 'bg-green-500/10 text-green-400' :
                    contract.status === 'sent' ? 'bg-blue-500/10 text-blue-400' :
                    'bg-gray-500/10 text-gray-400'
                  }`}>
                    {STATUS_LABELS[contract.status] || contract.status}
                  </span>
                  {contract.googleDocUrl && (
                    <a
                      href={contract.googleDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-muted hover:text-lantean-blue transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        filteredInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted">
            <Receipt className="w-12 h-12 mb-4 opacity-30" />
            <p>Aucune {tab === 'quotes' ? 'devis' : 'facture'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm text-muted">
                  <th className="pb-3 font-medium">N°</th>
                  <th className="pb-3 font-medium">Client</th>
                  <th className="pb-3 font-medium">Montant</th>
                  <th className="pb-3 font-medium">Échéance</th>
                  <th className="pb-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-border/50 hover:bg-surface/50 cursor-pointer">
                    <td className="py-3 font-mono text-sm">{invoice.number}</td>
                    <td className="py-3">{invoice.clientName}</td>
                    <td className="py-3 font-medium">{formatCurrency(invoice.total)}</td>
                    <td className="py-3 text-sm text-muted">{formatDate(invoice.dueDate)}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${INVOICE_STATUS_COLORS[invoice.status]}`}>
                        {STATUS_LABELS[invoice.status] || invoice.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
