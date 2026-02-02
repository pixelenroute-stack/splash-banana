
import { NextResponse } from 'next/server';
import { configService } from '../../../../../../services/configService';
import { SystemSettings } from '../../../../../../types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ module: string }> } // Params are promise in Next 15
) {
  // Await params in Next 15
  const { module } = await params;

  try {
      const result = await configService.testWebhook(module as any, 'user_1');
      return NextResponse.json(result);
  } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
