
import { NextResponse } from 'next/server';
import { configService } from '../../../../../services/configService';

export async function POST(request: Request) {
  try {
      const { versionId, reason } = await request.json();
      
      if (!versionId || !reason) {
        return NextResponse.json({ error: 'VersionID and Reason required' }, { status: 400 });
      }
      
      const restored = await configService.rollbackToVersion(versionId, 'user_1', reason);
      
      return NextResponse.json({
        success: true,
        config: restored,
        message: `Rolled back to v${restored.version}`
      });
  } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
