import { NextResponse } from 'next/server'
import { getBriefedMeetings } from '@/lib/meetings'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { meetings, mode, enriched } = await getBriefedMeetings()
  return NextResponse.json({ meetings, mode, enriched })
}
