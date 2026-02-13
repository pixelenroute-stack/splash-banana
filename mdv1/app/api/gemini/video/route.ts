import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ success: false, error: 'Gemini non configuré' }, { status: 500 })
  }

  try {
    const { prompt } = await request.json()

    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt requis' }, { status: 400 })
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

    // Start video generation
    const operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt,
      config: {
        numberOfVideos: 1,
        durationSeconds: 8,
        aspectRatio: '16:9',
      },
    })

    // Return operation name for polling
    return NextResponse.json({
      success: true,
      data: {
        operationName: operation.name,
        status: 'processing',
        message: 'Vidéo en cours de génération...',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur Gemini Video'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
