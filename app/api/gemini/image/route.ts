import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { getSetting } from '@/lib/settings-service'

export async function POST(request: NextRequest) {
  const apiKey = await getSetting('gemini_api_key')
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'Gemini non configuré. Configurez-le dans Paramètres.' }, { status: 500 })
  }

  try {
    const { prompt } = await request.json()

    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt requis' }, { status: 400 })
    }

    const ai = new GoogleGenAI({ apiKey })

    // Use Imagen 3 for image generation
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt,
      config: {
        numberOfImages: 1,
      },
    })

    const image = response.generatedImages?.[0]
    if (image?.image?.imageBytes) {
      const url = `data:image/png;base64,${image.image.imageBytes}`
      return NextResponse.json({ success: true, url })
    }

    // Fallback: try Gemini 2.0 Flash with image output
    const fallback = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    })

    const parts = fallback.candidates?.[0]?.content?.parts || []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imagePart = parts.find((p: any) => p.inlineData)

    if (imagePart && 'inlineData' in imagePart && imagePart.inlineData) {
      const { data, mimeType } = imagePart.inlineData as { data: string; mimeType: string }
      const url = `data:${mimeType};base64,${data}`
      return NextResponse.json({ success: true, url })
    }

    return NextResponse.json({
      success: false,
      error: 'Aucune image générée. Essayez un autre prompt.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur Gemini'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
