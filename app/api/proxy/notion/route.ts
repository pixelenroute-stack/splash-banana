
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { endpoint, method, body, headers } = await request.json();

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint missing' }, { status: 400 });
    }

    const notionUrl = `https://api.notion.com/v1${endpoint}`;
    
    // Authorization header comes from the client service (decrypted there)
    // In a higher security setup, we would decrypt it here using a session ID.
    const authHeader = headers?.Authorization; 

    if (!authHeader) {
        return NextResponse.json({ error: 'Authorization missing' }, { status: 401 });
    }

    const response = await fetch(notionUrl, {
      method: method || 'GET',
      headers: {
        'Authorization': authHeader,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
          const errorJson = JSON.parse(errorText);
          return NextResponse.json({ error: errorJson.message || errorJson.code }, { status: response.status });
      } catch {
          return NextResponse.json({ error: `Notion API Error: ${response.status}` }, { status: response.status });
      }
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Notion Proxy Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Proxy Error' }, { status: 500 });
  }
}
