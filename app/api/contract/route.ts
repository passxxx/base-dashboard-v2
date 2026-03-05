import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const kv = Redis.fromEnv()
const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY!
const BASE_CHAIN_ID = '8453'
const API_BASE = 'https://api.etherscan.io/v2/api'
const CACHE_TTL = 300

async function fetchTxList(contract: string) {
  const url = `${API_BASE}?chainid=${BASE_CHAIN_ID}&module=account&action=txlist&address=${contract}&startblock=0&endblock=99999999&page=1&offset=1000&sort=asc&apikey=${ETHERSCAN_KEY}`
  const res = await fetch(url)
  const data = await res.json()
  return data.status === '1' ? data.result : []
}

function getDaysAgo(n: number): string[] {
  const days = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const contract = searchParams.get('contract')?.toLowerCase()
    const range = parseInt(searchParams.get('range') || '7')
    const appId = searchParams.get('appId') || ''

    if (!contract) return NextResponse.json({ error: 'Missing contract' }, { status: 400 })

    const cacheKey = `cache:${contract}:${range}`
    const cached = await kv.get(cacheKey)
    if (cached) return NextResponse.json(cached)

    const txList = await fetchTxList(contract)

    const now = new Date()
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - range)

    const allTx = txList.filter((tx: any) => tx.isError === '0')
    const rangeTx = allTx.filter((tx: any) => new Date(parseInt(tx.timeStamp) * 1000) >= cutoff)

    const days = getDaysAgo(range)
    const dailyMap: Record<string, { txns: number; users: Set<string>; opens: number }> = {}
    days.forEach(d => { dailyMap[d] = { txns: 0, users: new Set(), opens: 0 } })

    rangeTx.forEach((tx: any) => {
      const day = new Date(parseInt(tx.timeStamp) * 1000).toISOString().slice(0, 10)
      if (dailyMap[day]) {
        dailyMap[day].txns++
        dailyMap[day].users.add(tx.from.toLowerCase())
      }
    })

    // 拉取每日 opens 数据
    const opensData = await Promise.all(
      days.map(d => kv.get<number>(`app:${appId}:day:${d}:opens`))
    )
    days.forEach((d, i) => {
      if (dailyMap[d]) dailyMap[d].opens = opensData[i] || 0
    })

    const allUsers = new Set(allTx.map((tx: any) => tx.from.toLowerCase()))
    const rangeUsers = new Set(rangeTx.map((tx: any) => tx.from.toLowerCase()))
    const beforeCutoffUsers = new Set(
      allTx.filter((tx: any) => new Date(parseInt(tx.timeStamp) * 1000) < cutoff)
        .map((tx: any) => tx.from.toLowerCase())
    )
    const newUsers = [...rangeUsers].filter(u => !beforeCutoffUsers.has(u))
    const returningUsers = [...rangeUsers].filter(u => beforeCutoffUsers.has(u))

    // 总 opens
    const totalOpens = await kv.get<number>(`app:${appId}:opens`) || 0
    const rangeOpens = opensData.reduce((s, v) => s + (v || 0), 0)

    const daily = days.map(d => ({
      date: d,
      txns: dailyMap[d].txns,
      users: dailyMap[d].users.size,
      opens: dailyMap[d].opens,
    }))

    const recentTx = [...rangeTx].reverse().slice(0, 10).map((tx: any) => ({
      hash: tx.hash,
      from: tx.from,
      timeStamp: tx.timeStamp,
      functionName: tx.functionName || 'transfer',
      value: tx.value,
    }))

    const result = {
      appId, contract, range,
      rangeTxns: rangeTx.length,
      rangeUsers: rangeUsers.size,
      newUsers: newUsers.length,
      returningUsers: returningUsers.length,
      totalTxns: allTx.length,
      totalUsers: allUsers.size,
      totalOpens,
      rangeOpens,
      daily,
      recentTx,
      updatedAt: new Date().toISOString(),
    }

    await kv.set(cacheKey, result, { ex: CACHE_TTL })
    return NextResponse.json(result)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
