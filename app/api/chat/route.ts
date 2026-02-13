import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

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

async function chatOpenAI(messages: Array<{ role: string; content: string }>) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY non configurée')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI error: ${err}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

async function chatClaude(messages: Array<{ role: string; content: string }>) {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY non configurée')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude error: ${err}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text || ''
}

export async function POST(request: NextRequest) {
  try {
    const { messages, model } = await request.json()

    if (!messages?.length) {
      return NextResponse.json({ error: 'Messages requis' }, { status: 400 })
    }

    let content: string
    let usedModel: string

    switch (model) {
      case 'openai':
      case 'gpt-4o':
        content = await chatOpenAI(messages)
        usedModel = 'gpt-4o'
        break
      case 'claude':
      case 'claude-sonnet':
        content = await chatClaude(messages)
        usedModel = 'claude-sonnet-4-5'
        break
      case 'gemini':
      default:
        content = await chatGemini(messages)
        usedModel = 'gemini-2.5-flash'
        break
    }

    return NextResponse.json({ content, model: usedModel })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
