import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

const SYSTEM_PROMPT = 'Tu es un assistant professionnel pour la plateforme Splash Banana. Tu aides avec la gestion de projets, clients, facturation et création de contenu. Réponds en français de manière concise et utile.'

async function chatGemini(messages: Array<{ role: string; content: string }>) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY non configurée')

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

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
    const { messages } = await request.json()

    if (!messages?.length) {
      return NextResponse.json({ error: 'Messages requis' }, { status: 400 })
    }

    const content = await chatGemini(messages)

    return NextResponse.json({ content, model: 'gemini-2.5-flash' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
