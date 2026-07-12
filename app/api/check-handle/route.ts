// src/app/api/check-handle/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform'); // Expected: 'instagram', 'tiktok', or 'email'
  const value = searchParams.get('value');

  if (!platform || !value) {
    return NextResponse.json({ error: 'Missing platform or value parameters' }, { status: 400 });
  }

  // Remove spaces and normalize to lowercase for safe checking
  const normalizedValue = value.toLowerCase().trim();

  try {
    let exists = false;

    if (platform === 'instagram') {
      const creator = await db.creator.findFirst({
        where: { instagramHandle: { equals: normalizedValue, mode: 'insensitive' } }
      });
      exists = !!creator;
    } 
    
    else if (platform === 'tiktok') {
      const creator = await db.creator.findFirst({
        where: { tiktokHandle: { equals: normalizedValue, mode: 'insensitive' } }
      });
      exists = !!creator;
    } 
    
    else if (platform === 'email') {
      const creator = await db.creator.findUnique({
        where: { email: normalizedValue }
      });
      exists = !!creator;
    }

    return NextResponse.json({ exists, platform, checkedValue: normalizedValue });

  } catch (error) {
    console.error("Database check error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}