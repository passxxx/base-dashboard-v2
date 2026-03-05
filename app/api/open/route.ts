import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const kv = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export async function POST(req: NextRequest) {
  try {
    const { app_id, app_name } = await req.json()
    if (!app_id) return NextResponse.json({ error: 'Missing app_id' }, { status: 400 })

    const day = new Date().toISOString().slice(0, 10)

    const pipe = kv.pipeline()
    pipe.incr(`app:${app_id}:opens`)
    pipe.incr(`app:${app_id}:day:${day}:opens`)
    if (app_name) pipe.set(`app:${app_id}:open_name`, app_name)
    await pipe.exec()

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
