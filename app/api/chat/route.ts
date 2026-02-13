import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { getSetting } from '@/lib/settings-service'

const SYSTEM_PROMPT = 'Tu es un assistant professionnel pour la plateforme Splash Banana. Tu aides avec la gestion de projets, clients, facturation et création de contenu. Réponds en français de manière concise et utile.'

async function chatGemini(messages: Array<{ role: string; content: string }>, apiKey: string) {
  const ai = new GoogleGenAI({ apiKey })

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents,
    config: {
      temperature: 0.7,
      maxOutputTokens: 4096,
      systemInstruction: SYSTEM_PROMPT,
    },
  })

  return response.text || ''
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = await getSetting('gemini_api_key')
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY non configurée. Configurez-la dans Paramètres.' }, { status: 500 })
    }

    const { messages } = await request.json()

    if (!messages?.length) {
      return NextResponse.json({ error: 'Messages requis' }, { status: 400 })
    }

    const content = await chatGemini(messages, apiKey)

    return NextResponse.json({ content, model: 'gemini-2.5-flash' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
