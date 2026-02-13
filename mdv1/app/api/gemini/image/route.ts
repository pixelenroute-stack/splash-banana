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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-image-generation',
      contents: prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    })

    // Extract image from response
    const parts = response.candidates?.[0]?.content?.parts || []
    const imagePart = parts.find((p) => 'inlineData' in p && p.inlineData)

    if (imagePart && 'inlineData' in imagePart && imagePart.inlineData) {
      const { data, mimeType } = imagePart.inlineData
      const url = `data:${mimeType};base64,${data}`
      return NextResponse.json({ success: true, url })
    }

    return NextResponse.json({
      success: false,
      error: 'Aucune image générée',
      text: response.text,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur Gemini'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
