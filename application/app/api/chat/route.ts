
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { db } from '../../../services/mockDatabase';

function getApiKey(): string {
  const settings = db.getSystemSettings();
  const adminKey = settings.aiConfig?.geminiKey || settings.contentCreation?.value;
  if (adminKey) return adminKey;
  return process.env.GEMINI_API_KEY || process.env.API_KEY || '';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = body.message;
    const sessionId = body.sessionId || 'default';

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const apiKey = getApiKey();
    if (!apiKey || apiKey.includes('placeholder')) {
      return NextResponse.json({
        response: "Clé API Gemini non configurée. Allez dans Admin > Infrastructure pour la configurer.",
        status: 'error',
        agentUsed: 'System'
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: message,
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        systemInstruction: `Tu es un assistant professionnel pour Splash Banana, une plateforme SaaS de production vidéo.
Tu aides avec la gestion de projets, clients, facturation et création de contenu.
Réponds de manière concise et utile en français.`
      }
    });

    const responseText = result.text || '';

    return NextResponse.json({
      response: responseText,
      status: 'success',
      agentUsed: 'Gemini'
    });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({
      response: `Erreur: ${error.message}`,
      status: 'error',
      agentUsed: 'System'
    }, { status: 503 });
  }
}
