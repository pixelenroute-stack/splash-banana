
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { message, apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'Clé API manquante' }, { status: 400 });
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro', 
        messages: [
          { role: "system", content: "Tu es 'Splash Banana Studio', un assistant de production expert connecté au web." },
          { role: "user", content: message }
        ],
        temperature: 0.2,
        return_citations: false
      }),
    });

    const errorText = await response.text();

    if (!response.ok) {
      try {
          const errorJson = JSON.parse(errorText);
          return NextResponse.json({ error: `Perplexity API Error: ${errorJson.error?.message || response.statusText}` }, { status: response.status });
      } catch {
          return NextResponse.json({ error: `Perplexity API Error: ${response.status} - ${errorText.substring(0, 200)}` }, { status: response.status });
      }
    }

    if (!errorText) {
        return NextResponse.json({ error: 'Empty response from Perplexity' }, { status: 502 });
    }

    try {
        const data = JSON.parse(errorText);
        return NextResponse.json(data);
    } catch (e) {
        return NextResponse.json({ error: 'Invalid JSON response from Perplexity', raw: errorText.substring(0, 200) }, { status: 502 });
    }

  } catch (error: any) {
    console.error('Perplexity Proxy Error:', error);
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur proxy' }, { status: 500 });
  }
}
