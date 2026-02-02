
import { NextResponse } from 'next/server';
import { n8nService } from '../../../lib/n8nService';

// Cette route agit comme un proxy sécurisé pour toutes les actions DB
// POST /api/action { action: "db.clients.create", payload: { name: "Client A" } }
export async function POST(request: Request) {
  try {
    // 1. Simulation Auth (En prod: utiliser getSession de NextAuth/Auth.js)
    const userId = "user_1"; // Mock ID for now
    
    // 2. Parse Body
    const body = await request.json();
    const { action, payload } = body;

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    // 3. Appel N8N
    const result = await n8nService.execute({
      action,
      payload: payload || {},
      userId
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json(result.data || result);

  } catch (error) {
    console.error("API Action Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
