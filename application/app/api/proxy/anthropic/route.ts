
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { messages, apiKey, system, max_tokens, temperature } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'Clé API manquante' }, { status: 400 });
    }

    // Appel Serveur-à-Serveur vers Anthropic
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: max_tokens || 4096,
        temperature: temperature || 0.1,
        system: system,
        messages: messages
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
          const errorJson = JSON.parse(errorText);
          return NextResponse.json({ error: `Anthropic API Error: ${errorJson.error?.message || response.statusText}` }, { status: response.status });
      } catch {
          return NextResponse.json({ error: `Anthropic API Error: ${response.status} - ${errorText}` }, { status: response.status });
      }
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Anthropic Proxy Error:', error);
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur proxy Anthropic' }, { status: 500 });
  }
}
