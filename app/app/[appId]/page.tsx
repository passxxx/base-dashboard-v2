'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const RANGE_OPTIONS = [{ label: '1D', value: 1 }, { label: '7D', value: 7 }, { label: '30D', value: 30 }, { label: '90D', value: 90 }]

interface DayData { date: string; txns: number; users: number; opens: number }
interface ContractData {
  contract: string; range: number
  rangeTxns: number; rangeUsers: number; newUsers: number; returningUsers: number
  totalTxns: number; totalUsers: number
  totalOpens: number; rangeOpens: number
  daily: DayData[]
  recentTx: { hash: string; from: string; timeStamp: string; functionName: string; value: string }[]
  updatedAt: string
}

function BarChart({ data, color, label }: { data: { label: string; value: number }[]; color: string; label: string }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '20px 22px' }}>
      <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', marginBottom: 16 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 4 }}>
            <div style={{ width: '100%', borderRadius: '3px 3px 0 0', background: color, minHeight: 2,
              height: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 1)}%`,
              opacity: i === data.length - 1 ? 1 : 0.45, transition: 'height 0.3s' }} />
            {data.length <= 14 && (
              <div style={{ fontSize: 9, color: '#94a3b8', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>{d.label.slice(5)}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AppDetail({ params }: { params: { appId: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const contract = searchParams.get('contract') || ''
  const name = decodeURIComponent(searchParams.get('name') || params.appId)

  const [range, setRange] = useState(7)
  const [data, setData] = useState<ContractData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!contract) return
    setLoading(true)
    try {
      const res = await fetch(`/api/contract?contract=${contract}&range=${range}&appId=${params.appId}`)
      setData(await res.json())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [contract, range, params.appId])

  useEffect(() => { fetchData() }, [fetchData])

  const rangeLabel = RANGE_OPTIONS.find(r => r.value === range)?.label

  const statCards = data ? [
    { label: `交易数 (${rangeLabel})`, value: data.rangeTxns.toLocaleString(), unit: '笔', color: '#2563eb' },
    { label: `用户数 (${rangeLabel})`, value: data.rangeUsers.toLocaleString(), unit: '人', color: '#16a34a' },
    { label: `打开次数 (${rangeLabel})`, value: data.rangeOpens.toLocaleString(), unit: '次', color: '#0891b2' },
    { label: '新用户', value: data.newUsers.toLocaleString(), unit: '人', color: '#9333ea' },
    { label: '回流用户', value: data.returningUsers.toLocaleString(), unit: '人', color: '#ca8a04' },
    { label: '历史总打开', value: data.totalOpens.toLocaleString(), unit: '次', color: '#64748b' },
    { label: '历史总交易', value: data.totalTxns.toLocaleString(), unit: '笔', color: '#64748b' },
    { label: '历史总用户', value: data.totalUsers.toLocaleString(), unit: '人', color: '#64748b' },
  ] : []

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', fontFamily: "'PingFang SC','Microsoft YaHei',sans-serif" }}>
      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, cursor: 'pointer' }}>← 返回</button>
            <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{name}</span>
            <code style={{ fontSize: 11, background: '#f1f5f9', padding: '3px 8px', borderRadius: 5, color: '#64748b' }}>
              {contract.slice(0, 8)}...{contract.slice(-6)}
            </code>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
              {RANGE_OPTIONS.map(r => (
                <button key={r.value} onClick={() => setRange(r.value)} style={{ padding: '4px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: range === r.value ? '#fff' : 'transparent', color: range === r.value ? '#0f172a' : '#94a3b8', boxShadow: range === r.value ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>{r.label}</button>
              ))}
            </div>
            <button onClick={fetchData} disabled={loading} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, cursor: 'pointer' }}>↻ 刷新</button>
            <a href={`https://basescan.org/address/${contract}`} target="_blank" rel="noreferrer" style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', color: '#2563eb', fontSize: 13, textDecoration: 'none' }}>Basescan ↗</a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 32px' }}>
        {loading ? (
          <div style={{ padding: '80px 0', textAlign: 'center', color: '#94a3b8' }}>⟳ 从链上加载数据...</div>
        ) : !data ? (
          <div style={{ padding: '80px 0', textAlign: 'center', color: '#94a3b8' }}>加载失败，请刷新重试</div>
        ) : (
          <>
            {/* Stat cards - 4列 x 2行 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
              {statCards.map((c, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '16px 18px', border: '1px solid #e2e8f0', borderTop: `3px solid ${c.color}` }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, fontWeight: 500 }}>{c.label}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                    <span style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{c.value}</span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>{c.unit}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* 三图并排 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
              <BarChart data={data.daily.map(d => ({ label: d.date, value: d.txns }))} color="#2563eb" label="每日交易数" />
              <BarChart data={data.daily.map(d => ({ label: d.date, value: d.users }))} color="#16a34a" label="每日用户数" />
              <BarChart data={data.daily.map(d => ({ label: d.date, value: d.opens }))} color="#0891b2" label="每日打开次数" />
            </div>

            {/* 最近交易 */}
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ padding: '16px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>
                  最近交易记录
                  <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400, marginLeft: 8 }}>最新 {data.recentTx.length} 笔</span>
                </div>
                {data.updatedAt && <span style={{ fontSize: 12, color: '#94a3b8' }}>数据时间 {new Date(data.updatedAt).toLocaleTimeString('zh-CN')}</span>}
              </div>
              {data.recentTx.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>该时间范围内暂无交易</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['交易哈希', '发起地址', '方法', '时间'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', fontSize: 12, color: '#94a3b8', fontWeight: 500, textAlign: 'left', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentTx.map((tx, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <a href={`https://basescan.org/tx/${tx.hash}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontFamily: 'monospace', color: '#2563eb', textDecoration: 'none' }}>
                            {tx.hash.slice(0, 10)}...{tx.hash.slice(-6)}
                          </a>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <a href={`https://basescan.org/address/${tx.from}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontFamily: 'monospace', color: '#475569', textDecoration: 'none' }}>
                            {tx.from.slice(0, 8)}...{tx.from.slice(-4)}
                          </a>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <code style={{ fontSize: 12, background: '#f1f5f9', padding: '2px 8px', borderRadius: 5, color: '#7c3aed' }}>
                            {tx.functionName ? tx.functionName.split('(')[0] : 'transfer'}
                          </code>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>
                          {new Date(parseInt(tx.timeStamp) * 1000).toLocaleString('zh-CN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
