import { NextRequest, NextResponse } from 'next/server'
import { getGoogleToken } from '@/lib/google-token'
import { googleDocs, googleDrive } from '@/lib/google'

const CONTRACT_TEMPLATE_ID = '1yQSTeadQYfAVbveocp2qIrgqFPems3BCSjpU1YQJsec'

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
      const contract: Record<string, unknown> = {
        id: `CTR-${Date.now()}`,
        clientName: body.clientName,
        projectName: body.projectName,
        amount: body.amount || 0,
        startDate: body.startDate,
        endDate: body.endDate,
        status: 'draft',
        createdAt: new Date().toISOString(),
      }

      // Create contract from Google Docs template via direct OAuth
      const token = await getGoogleToken()
      if (token) {
        try {
          // 1. Copy the template document
          const title = `Contrat - ${body.clientName} - ${body.projectName}`
          const copy = await googleDrive.copyFile(token, CONTRACT_TEMPLATE_ID, title)
          const docId = copy.id

          // 2. Build replacement requests for all placeholder formats
          const replacements: Record<string, string> = {
            CLIENT_NAME: body.clientName || '',
            PROJECT_NAME: body.projectName || '',
            AMOUNT: String(body.amount || 0),
            START_DATE: body.startDate || 'A definir',
            END_DATE: body.endDate || 'A definir',
            DATE: new Date().toLocaleDateString('fr-FR'),
          }

          const replaceRequests: unknown[] = []
          for (const [key, value] of Object.entries(replacements)) {
            // Format {{KEY}}
            replaceRequests.push({
              replaceAllText: {
                containsText: { text: `{{${key}}}`, matchCase: false },
                replaceText: value,
              },
            })
            // Format [KEY]
            replaceRequests.push({
              replaceAllText: {
                containsText: { text: `[${key}]`, matchCase: false },
                replaceText: value,
              },
            })
            // Format {KEY}
            replaceRequests.push({
              replaceAllText: {
                containsText: { text: `{${key}}`, matchCase: false },
                replaceText: value,
              },
            })
          }

          await googleDocs.batchUpdate(token, docId, replaceRequests)

          contract.googleDocId = docId
          contract.googleDocUrl = `https://docs.google.com/document/d/${docId}/edit`
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
