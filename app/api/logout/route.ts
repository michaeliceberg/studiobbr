import { NextResponse } from 'next/server'
import { endSession } from '@/lib/auth'

export async function POST(req: Request) {
    endSession()
    const url = new URL(req.url)
    return NextResponse.redirect(`${req.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '')}://${req.headers.get('host')}/login`, 303)
}
