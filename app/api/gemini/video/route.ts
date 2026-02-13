import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { getSetting } from '@/lib/settings-service'

export async function POST(request: NextRequest) {
  const apiKey = await getSetting('gemini_api_key')
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'Gemini non configuré. Configurez-le dans Paramètres.' }, { status: 500 })
  }

  try {
    const { prompt, operationName } = await request.json()

    const ai = new GoogleGenAI({ apiKey })

    // If polling for an existing operation
    if (operationName) {
      try {
        const op = await ai.operations.get({ operation: operationName })
        if (op.done) {
          const videos = (op.response as Record<string, unknown>)?.generatedVideos as Array<{ video: { uri: string } }> | undefined
          const videoUrl = videos?.[0]?.video?.uri
          return NextResponse.json({
            success: true,
            data: { status: 'completed', videoUrl, operationName },
          })
        }
        return NextResponse.json({
          success: true,
          data: { status: 'processing', operationName, message: 'Vidéo en cours de génération...' },
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur polling'
        return NextResponse.json({ success: false, error: msg }, { status: 500 })
      }
    }

    // Start new video generation
    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt requis' }, { status: 400 })
    }

    const operation = await ai.models.generateVideos({
      model: 'veo-2.0-generate-001',
      prompt,
      config: {
        numberOfVideos: 1,
        durationSeconds: 8,
        aspectRatio: '16:9',
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        operationName: operation.name,
        status: 'processing',
        message: 'Vidéo en cours de génération (1-3 minutes)...',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur Gemini Video'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
