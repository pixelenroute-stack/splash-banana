
import { NextResponse } from 'next/server';
import { configService } from '../../../../services/configService';
import { db } from '../../../../services/mockDatabase';
import { SystemSettings } from '../../../../types';

// Mock Auth Check
const requireAdmin = (req: Request) => {
    // In a real app, use auth middleware/session
    // Here we assume client sends a header or cookie, 
    // but since we are in mock mode, we assume access for now or check a dummy header
    return true; 
};

function maskSensitiveFields(config: SystemSettings) {
  const masked = JSON.parse(JSON.stringify(config));
  
  if (masked.aiConfig) {
      Object.keys(masked.aiConfig).forEach(k => {
          if (masked.aiConfig[k]) masked.aiConfig[k] = '••••••••' + masked.aiConfig[k].slice(-4);
      });
  }
  
  if (masked.google) {
      if (masked.google.clientSecret) masked.google.clientSecret = '••••••••';
  }
  
  return masked;
}

export async function GET(request: Request) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  const config = await configService.getActiveConfig();
  
  // NOTE: For the edit form, we might need the actual values to edit them.
  // Masking is good for display-only, but for admin editing, we need the real values OR a way to say "unchanged".
  // For this MVP implementation, we send decrypted values to the Admin Console (secured by HTTPS + Admin Role).
  // In a stricter env, we would send empty secrets and only update if changed.
  
  return NextResponse.json(config);
}

export async function POST(request: Request) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  try {
      const body = await request.json();
      const { config, reason } = body;
      
      if (!config) {
          return NextResponse.json({ error: 'Config required' }, { status: 400 });
      }

      // Basic Validation
      const errors = [];
      if (config.appMode === 'production' && config.webhooks) {
          Object.keys(config.webhooks).forEach((key: string) => {
              const hook = config.webhooks[key];
              if (hook.enabled && hook.url && !hook.url.startsWith('http')) {
                  errors.push(`${key}: URL invalide`);
              }
          });
      }

      if (errors.length > 0) {
          return NextResponse.json({ error: errors.join(', ') }, { status: 400 });
      }
      
      const updated = await configService.saveConfig(config, 'user_1', reason);
      
      return NextResponse.json({
        success: true,
        config: updated,
        version: updated.version
      });
  } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
