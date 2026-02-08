
import { NextResponse } from 'next/server';

const QONTO_API_BASE = 'https://thirdparty.qonto.com/v2';

export async function POST(request: Request) {
  try {
    const { endpoint, method, body, login, secretKey } = await request.json();

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint missing' }, { status: 400 });
    }

    if (!login || !secretKey) {
      return NextResponse.json({ error: 'Qonto credentials missing' }, { status: 401 });
    }

    const qontoUrl = `${QONTO_API_BASE}${endpoint}`;

    const response = await fetch(qontoUrl, {
      method: method || 'GET',
      headers: {
        'Authorization': `${login}:${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        return NextResponse.json({
          error: errorJson.message || errorJson.errors?.[0]?.detail || `Qonto API Error: ${response.status}`,
          status: response.status
        }, { status: response.status });
      } catch {
        return NextResponse.json({ error: `Qonto API Error: ${response.status}` }, { status: response.status });
      }
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Qonto Proxy Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Proxy Error' }, { status: 500 });
  }
}
