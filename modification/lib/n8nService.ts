
// Service Singleton pour gérer les appels vers N8N
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || '';
const N8N_SECRET = process.env.N8N_SECRET || '';

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
  /**
   * Exécute une action sur le workflow N8N
   */
  async execute<T = any>(req: N8NRequest): Promise<N8NResponse<T>> {
    if (!N8N_WEBHOOK_URL) {
      return { success: false, error: "URL n8n non configurée." };
    }

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${N8N_SECRET}`,
          'X-Source': 'NextJS-App'
        },
        body: JSON.stringify({
          action: req.action,
          payload: req.payload,
          userId: req.userId,
          timestamp: Date.now()
        }),
        cache: 'no-store'
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `N8N Error: ${response.status}`);
      }

      const data = await response.json();
      if (data.success === undefined) {
          return { success: true, data: data };
      }

      return data as N8NResponse<T>;

    } catch (error) {
      console.error(`[N8NService] Error executing ${req.action}:`, error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Exécute une action Chat avec support du Streaming
   */
  async stream(req: N8NRequest): Promise<Response> {
    return fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${N8N_SECRET}`,
        'X-Source': 'NextJS-App',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        action: req.action,
        payload: req.payload,
        userId: req.userId,
        stream: true,
        timestamp: Date.now()
      }),
      cache: 'no-store'
    });
  }
}

export const n8nService = new N8NService();
