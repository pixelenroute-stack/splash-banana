
import { NextResponse } from 'next/server';
import { db } from '../../../../../services/mockDatabase';

export async function GET(request: Request) {
  const versions = db.getConfigVersions();
  return NextResponse.json({ versions });
}
