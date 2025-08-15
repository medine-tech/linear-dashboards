import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.LINEAR_API_KEY;
  
  return NextResponse.json({
    hasApiKey: !!apiKey,
    keyLength: apiKey ? apiKey.length : 0,
    keyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'Not found'
  });
}
