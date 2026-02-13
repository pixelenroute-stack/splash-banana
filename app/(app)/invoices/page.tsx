'use client'

import { useState } from 'react'
import { Receipt, Plus, Search } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Invoice } from '@/types'

const STATUS_COLORS: Record<Invoice['status'], string> = {
  draft: 'bg-gray-500/10 text-gray-400',
  sent: 'bg-blue-500/10 text-blue-400',
  paid: 'bg-green-500/10 text-green-400',
  overdue: 'bg-red-500/10 text-red-400',
  cancelled: 'bg-muted/10 text-muted',
}

export default function InvoicesPage() {
  const [invoices] = useState<Invoice[]>([])
  const [search, setSearch] = useState('')

  const filtered = invoices.filter((i) =>
    i.number.toLowerCase().includes(search.toLowerCase()) ||
    i.clientName?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Facturation</h1>
          <p className="text-muted text-sm mt-1">Gestion des factures</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors">
          <Plus className="w-4 h-4" />
          <span className="text-sm">Nouvelle facture</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Rechercher une facture..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <Receipt className="w-12 h-12 mb-4 opacity-30" />
          <p>Aucune facture</p>
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
              {filtered.map((invoice) => (
                <tr key={invoice.id} className="border-b border-border/50 hover:bg-surface/50 cursor-pointer">
                  <td className="py-3 font-mono text-sm">{invoice.number}</td>
                  <td className="py-3">{invoice.clientName}</td>
                  <td className="py-3 font-medium">{formatCurrency(invoice.total)}</td>
                  <td className="py-3 text-sm text-muted">{formatDate(invoice.dueDate)}</td>
                  <td className="py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[invoice.status]}`}>
                      {invoice.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
