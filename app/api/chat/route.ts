import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    if (!messages?.length) {
      return NextResponse.json({ error: 'Messages requis' }, { status: 400 })
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY non configurée' }, { status: 500 })
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

    // Build contents for Gemini
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        systemInstruction: 'Tu es un assistant professionnel pour la plateforme Splash Banana. Tu aides avec la gestion de projets, clients, facturation et création de contenu. Réponds en français.',
      },
    })

    const text = response.text || ''

    return NextResponse.json({
      content: text,
      model: 'gemini-2.5-flash',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
