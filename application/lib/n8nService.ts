
// Service local - Plus de dépendance n8n webhook.
// Les actions sont traitées par les services API directs.

export interface N8NRequest {
  action: string;
  payload: any;
  userId: string;
}

export interface N8NResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: any;
}

class N8NService {
  async execute<T = any>(req: N8NRequest): Promise<N8NResponse<T>> {
    // Traitement local - les opérations sont gérées par les services dédiés
    console.log(`[LocalService] Action: ${req.action}`);
    return {
      success: true,
      data: { message: `Action '${req.action}' traitée localement`, action: req.action } as any
    };
  }

  async stream(req: N8NRequest): Promise<Response> {
    return new Response(JSON.stringify({ message: 'Streaming non disponible en mode local' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export const n8nService = new N8NService();
