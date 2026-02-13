import { NextRequest, NextResponse } from 'next/server'

let invoicesStore: Array<Record<string, unknown>> = []
let contractsStore: Array<Record<string, unknown>> = []

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'invoices'

  if (type === 'contracts') {
    return NextResponse.json({ success: true, data: contractsStore })
  }
  return NextResponse.json({ success: true, data: invoicesStore })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type } = body

    if (type === 'contract') {
      const contract = {
        id: `CTR-${Date.now()}`,
        clientName: body.clientName,
        projectName: body.projectName,
        amount: body.amount || 0,
        startDate: body.startDate,
        endDate: body.endDate,
        status: 'draft',
        createdAt: new Date().toISOString(),
      }

      if (process.env.MATON_API_KEY) {
        try {
          const { docs } = await import('@/lib/maton')
          const doc = await docs.createDocument(`Contrat - ${body.clientName} - ${body.projectName}`)
          const docId = doc.documentId

          await docs.batchUpdate(docId, [
            { insertText: { location: { index: 1 }, text: `CONTRAT DE PRESTATION\n\n` } },
            { insertText: { location: { index: 25 }, text: `Client: ${body.clientName}\nProjet: ${body.projectName}\nMontant: ${body.amount || 0} EUR\nDate de début: ${body.startDate || 'À définir'}\nDate de fin: ${body.endDate || 'À définir'}\n\n---\n\nArticle 1 - Objet du contrat\nLe présent contrat a pour objet la réalisation des prestations décrites ci-dessus.\n\nArticle 2 - Durée\nLe contrat prend effet à la date de début mentionnée ci-dessus.\n\nArticle 3 - Rémunération\nLe montant total de la prestation est fixé à ${body.amount || 0} EUR HT.\n\nArticle 4 - Conditions de paiement\n30% à la signature, 70% à la livraison.\n\n---\n\nSignature Client:                    Signature Prestataire:\n\n` } },
          ])

          Object.assign(contract, {
            googleDocId: docId,
            googleDocUrl: `https://docs.google.com/document/d/${docId}/edit`,
          })
        } catch {
          // Continue without Google Docs
        }
      }

      contractsStore.push(contract)
      return NextResponse.json({ success: true, data: contract })
    }

    const invoiceNumber = `FAC-${new Date().getFullYear()}-${String(invoicesStore.length + 1).padStart(4, '0')}`
    const items = (body.items || []) as Array<{ description: string; quantity: number; unitPrice: number }>
    const amount = items.reduce((sum: number, item) => sum + item.quantity * item.unitPrice, 0)
    const tax = amount * 0.2
    const total = amount + tax

    const invoice = {
      id: `INV-${Date.now()}`,
      number: invoiceNumber,
      clientId: body.clientId || '',
      clientName: body.clientName || '',
      amount,
      tax,
      total,
      status: body.status || 'draft',
      dueDate: body.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      items,
    }

    invoicesStore.push(invoice)
    return NextResponse.json({ success: true, data: invoice })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur facturation'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
