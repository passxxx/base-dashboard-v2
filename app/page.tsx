'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const RANGE_OPTIONS = [{ label: '1D', value: 1 }, { label: '7D', value: 7 }, { label: '30D', value: 30 }, { label: '90D', value: 90 }]
const COLORS = ['#2563eb', '#16a34a', '#9333ea', '#ca8a04', '#dc2626', '#ea580c', '#0891b2', '#db2777']

interface App { id: string; name: string; contract: string; addedAt: string }
interface ContractData {
  rangeTxns: number; rangeUsers: number; newUsers: number; returningUsers: number
  totalTxns: number; totalUsers: number
  daily: { date: string; txns: number; users: number }[]
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 36 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, borderRadius: 2, background: color, minHeight: 2,
          height: `${Math.max((v / max) * 100, v > 0 ? 8 : 2)}%`,
          opacity: i === data.length - 1 ? 1 : 0.25 }} />
      ))}
    </div>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [range, setRange] = useState(7)
  const [apps, setApps] = useState<App[]>([])
  const [contractData, setContractData] = useState<Record<string, ContractData>>({})
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newContract, setNewContract] = useState('')
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')

  const fetchApps = useCallback(async () => {
    const res = await fetch('/api/apps')
    const data = await res.json()
    setApps(data.apps || [])
    return data.apps || []
  }, [])

  const fetchAllContractData = useCallback(async (appList: App[]) => {
    if (!appList.length) { setLoading(false); return }
    const results = await Promise.all(
      appList.map(app =>
        fetch(`/api/contract?contract=${app.contract}&range=${range}&appId=${app.id}`)
          .then(r => r.json()).catch(() => null)
      )
    )
    const map: Record<string, ContractData> = {}
    appList.forEach((app, i) => { if (results[i]) map[app.id] = results[i] })
    setContractData(map)
    setLoading(false)
    setLastUpdated(new Date().toLocaleTimeString('zh-CN'))
  }, [range])

  const refresh = useCallback(async () => {
    setLoading(true)
    const appList = await fetchApps()
    await fetchAllContractData(appList)
  }, [fetchApps, fetchAllContractData])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => { const t = setInterval(refresh, 120000); return () => clearInterval(t) }, [refresh])

  const addApp = async () => {
    if (!newName.trim() || !newContract.trim()) return
    setAdding(true)
    await fetch('/api/apps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName.trim(), contract: newContract.trim() }) })
    setNewName(''); setNewContract(''); setShowModal(false); setAdding(false)
    refresh()
  }

  const deleteApp = async (id: string) => {
    if (!confirm('确认删除？')) return
    await fetch('/api/apps', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    refresh()
  }

  const filtered = apps.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))

  // 汇总
  const totalTxns = Object.values(contractData).reduce((s, d) => s + (d?.rangeTxns || 0), 0)
  const totalUsers = Object.values(contractData).reduce((s, d) => s + (d?.rangeUsers || 0), 0)

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', fontFamily: "'PingFang SC','Microsoft YaHei',sans-serif" }}>
      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, background: '#2563eb', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>B</div>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Base 归因监控</span>
            <span style={{ fontSize: 12, color: '#cbd5e1' }}>|</span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>链上数据自动同步</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastUpdated && <span style={{ fontSize: 12, color: '#94a3b8' }}>更新于 {lastUpdated}</span>}
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
              {RANGE_OPTIONS.map(r => (
                <button key={r.value} onClick={() => setRange(r.value)} style={{ padding: '4px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: range === r.value ? '#fff' : 'transparent', color: range === r.value ? '#0f172a' : '#94a3b8', boxShadow: range === r.value ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.12s' }}>{r.label}</button>
              ))}
            </div>
            <button onClick={refresh} disabled={loading} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, cursor: 'pointer' }}>↻ 刷新</button>
            <button onClick={() => setShowModal(true)} style={{ padding: '6px 16px', borderRadius: 7, border: 'none', background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ 添加 App</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 32px' }}>
        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: '监控 App 数', value: apps.length, unit: '个', border: '#2563eb' },
            { label: `总交易数 (${RANGE_OPTIONS.find(r=>r.value===range)?.label})`, value: totalTxns.toLocaleString(), unit: '笔', border: '#16a34a' },
            { label: `总用户数 (${RANGE_OPTIONS.find(r=>r.value===range)?.label})`, value: totalUsers.toLocaleString(), unit: '人', border: '#9333ea' },
            { label: '平均交易/用户', value: totalUsers > 0 ? (totalTxns / totalUsers).toFixed(1) : '—', unit: '次', border: '#ca8a04' },
          ].map((c, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '18px 22px', border: '1px solid #e2e8f0', borderTop: `3px solid ${c.border}` }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 500 }}>{c.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 30, fontWeight: 700, color: '#0f172a', letterSpacing: -0.5 }}>{c.value}</span>
                <span style={{ fontSize: 13, color: '#94a3b8' }}>{c.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* App list */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>
              Mini App 列表
              <span style={{ marginLeft: 8, fontSize: 12, color: '#94a3b8', background: '#f1f5f9', padding: '2px 8px', borderRadius: 10 }}>{filtered.length}</span>
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索 App..." style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', width: 180, background: '#f8fafc' }} />
          </div>

          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
              <div style={{ marginBottom: 8 }}>⟳ 正在从链上拉取数据...</div>
              <div style={{ fontSize: 12 }}>首次加载需要几秒钟</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
              {apps.length === 0 ? '点击右上角"添加 App"，填入合约地址即可自动追踪' : '没有匹配的 App'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['#', 'App 名称', '合约地址', `交易数`, '用户数', '新用户', '回流', '趋势', '操作'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', fontSize: 12, color: '#94a3b8', fontWeight: 500, textAlign: 'left', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((app, i) => {
                  const color = COLORS[i % COLORS.length]
                  const d = contractData[app.id]
                  return (
                    <tr key={app.id} style={{ borderBottom: '1px solid #f8fafc', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                      onClick={() => router.push(`/app/${app.id}?contract=${app.contract}&name=${encodeURIComponent(app.name)}`)}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ width: 26, height: 26, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: i===0?'#fef9c3':i===1?'#f1f5f9':i===2?'#fff7ed':'#f8fafc', color: i===0?'#a16207':i===1?'#64748b':i===2?'#c2410c':'#94a3b8' }}>{i+1}</span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                          <span style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{app.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <code style={{ fontSize: 11, background: '#f1f5f9', padding: '3px 7px', borderRadius: 5, color: '#64748b' }}>
                          {app.contract.slice(0, 6)}...{app.contract.slice(-4)}
                        </code>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {d ? <span style={{ fontSize: 18, fontWeight: 700, color }}>{d.rangeTxns.toLocaleString()}</span> : <span style={{ color: '#cbd5e1' }}>—</span>}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{d?.rangeUsers ?? '—'}</td>
                      <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600, color: '#16a34a' }}>{d ? `+${d.newUsers}` : '—'}</td>
                      <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600, color: '#9333ea' }}>{d?.returningUsers ?? '—'}</td>
                      <td style={{ padding: '14px 16px', width: 90 }} onClick={e => e.stopPropagation()}>
                        {d && <Sparkline data={d.daily.map(x => x.txns)} color={color} />}
                      </td>
                      <td style={{ padding: '14px 16px' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => deleteApp(app.id)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fee2e2', background: '#fff', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>删除</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#cbd5e1' }}>
          <span>Base Attribution Monitor · 数据来自 Basescan，每2分钟自动刷新</span>
          <span>本看板与 base.dev 官方数据相互独立</span>
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 20, color: '#0f172a' }}>添加 Mini App</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 500 }}>App 名称 *</div>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="例：每日签到" style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 500 }}>合约地址 * (Base 主网)</div>
              <input value={newContract} onChange={e => setNewContract(e.target.value)} placeholder="0x..." style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#0369a1' }}>
              ℹ️ 填入合约地址后，看板自动从链上拉取所有交易数据，无需任何埋点代码。
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 14, cursor: 'pointer' }}>取消</button>
              <button onClick={addApp} disabled={adding || !newName || !newContract} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: adding || !newName || !newContract ? 0.6 : 1 }}>
                {adding ? '添加中...' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
