import { NextResponse } from 'next/server'
import { getMeetings } from '@/lib/meetings'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { meetings, mode } = await getMeetings()
  return NextResponse.json({ meetings, mode })
}
