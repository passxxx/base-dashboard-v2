import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const kv = Redis.fromEnv()

export async function GET() {
  try {
    const appIds = await kv.smembers('apps') as string[]
    if (!appIds || appIds.length === 0) return NextResponse.json({ apps: [] })

    const apps = await Promise.all(
      appIds.map(async (id) => {
        const data = await kv.get<{ name: string; contract: string; addedAt: string }>(`app:${id}`)
        return data ? { id, ...data } : null
      })
    )

    return NextResponse.json({ apps: apps.filter(Boolean) })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, contract } = await req.json()
    if (!name || !contract) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const id = `app-${Date.now()}`
    await kv.set(`app:${id}`, { name, contract: contract.toLowerCase(), addedAt: new Date().toISOString() })
    await kv.sadd('apps', id)

    return NextResponse.json({ ok: true, id })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    await kv.del(`app:${id}`)
    await kv.srem('apps', id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
