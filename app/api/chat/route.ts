
import { NextResponse } from 'next/server';
import { n8nAgentService } from '../../../lib/n8nAgentService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Simulation Auth: En production, récupérer l'ID depuis la session (Auth.js)
    const userId = "user_1"; 
    
    // Le sessionId permet à N8N de maintenir la mémoire de la conversation (Buffer Memory)
    const sessionId = body.sessionId || userId;
    const message = body.message;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Appel au service spécialisé Orchestrator
    const result = await n8nAgentService.sendMessage(sessionId, message);

    if (result.status === 'error' && result.agentUsed === 'System') {
       // Erreur technique grave (timeout, network)
       return NextResponse.json(result, { status: 503 });
    }

    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}
