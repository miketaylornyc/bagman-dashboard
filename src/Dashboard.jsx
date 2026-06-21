import { useState, useEffect, useMemo } from 'react'
import { fetchAllData } from './sheets.js'
import EventMap from './EventMap.jsx'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LabelList, Cell
} from 'recharts'

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const COLORS = {
  organic:      '#16213e',
  bulk:         '#a8b4c8',
  grAdded:      '#e07b39',
  grToRead:     '#c9a84c',
  grRatings:    '#4a9b8f',
  organicGreen: '#2d6a4f',
  event:        '#7c3aed',
  t1:           '#c9a84c',
  t2:           '#9ca3af',
  t3:           '#b45309',
}

const TIER_META = {
  1: { color: '#c9a84c', weight: 3, desc: 'National / major outlet' },
  2: { color: '#9ca3af', weight: 2, desc: 'Strong niche / high-reach' },
  3: { color: '#b45309', weight: 1, desc: 'Targeted / niche' },
}

const pressTypeColor = (type) => {
  if (type === 'Broadcast TV') return '#ef4444'
  if (type === 'Article')      return '#3b82f6'
  if (type === 'Review')       return '#8b5cf6'
  if (type === 'Podcast')      return '#f97316'
  if (type === 'Newsletter')   return '#10b981'
  return '#6b7280'
}

// ── DERIVED DATA ──────────────────────────────────────────────────────────────
function deriveData(bookscan, press, events, bulk, social) {
  const bulkByWeek   = {}
  bulk.forEach(o => { bulkByWeek[o.week] = (bulkByWeek[o.week] || 0) + o.qty })

  const eventsByWeek = {}
  events.forEach(e => { (eventsByWeek[e.week] = eventsByWeek[e.week] || []).push(e) })

  const pressByWeek = {}
  press.forEach(p => { (pressByWeek[p.week] = pressByWeek[p.week] || []).push(p) })

  const socialByWeek = {}
  social.forEach(s => {
    if (s.week === 'Pre') return
    ;(socialByWeek[s.week] = socialByWeek[s.week] || []).push(s)
  })

  return bookscan.map(d => {
    const bulkQty    = bulkByWeek[d.week] || 0
    const rawOrganic = d.sales - bulkQty
    const organic    = d.pending ? Math.max(0, rawOrganic) : rawOrganic
    const weekEvents = eventsByWeek[d.week] || []
    const weekPress  = pressByWeek[d.week]  || []
    const weekSocial = socialByWeek[d.week] || []
    const totalAtt   = weekEvents.reduce((s, e) => s + (e.attendance || 0), 0)
    const pressRaw   = weekPress.length
    const pressWt    = weekPress.reduce((s, p) => s + (TIER_META[p.tier]?.weight || 1), 0)
    const pressT1    = weekPress.filter(p => p.tier === 1).length
    const pressT2    = weekPress.filter(p => p.tier === 2).length
    const pressT3    = weekPress.filter(p => p.tier === 3).length
    const domColor   = pressT1 > 0 ? COLORS.t1 : pressT2 > 0 ? COLORS.t2 : pressT3 > 0 ? COLORS.t3 : COLORS.t1
    const socialViews  = weekSocial.reduce((s, p) => s + p.views, 0)
    const collabViews  = weekSocial.filter(p => p.collab).reduce((s, p) => s + p.views, 0)
    const ownViews     = weekSocial.filter(p => !p.collab).reduce((s, p) => s + p.views, 0)
    return {
      ...d, bulk: bulkQty, organic, events: weekEvents, press: weekPress,
      eventCount: weekEvents.length, pressRaw, pressWt, pressT1, pressT2, pressT3,
      domColor, totalAttendance: totalAtt, socialPosts: weekSocial,
      socialViews, collabViews, ownViews,
    }
  })
}

// ── SUB-COMPONENTS ────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, pct }) {
  return (
    <div style={{
      background: 'white', borderRadius: 14, padding: '16px 18px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.06)', flex: '1 1 120px', minWidth: 115,
      borderTop: `4px solid ${color}`
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 2 }}>{value}</div>
      {pct && <div style={{ fontSize: 10, color, fontWeight: 600, marginBottom: 2 }}>{pct}</div>}
      <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 10, color: '#9ca3af' }}>{sub}</div>
    </div>
  )
}

const SOCIAL_THRESHOLD = 20000

const MarkerLabel = ({ x, y, width, index, data }) => {
  const row = data?.[index]
  if (!row) return null
  const hasEvent  = row.eventCount > 0
  const hasPress  = row.pressRaw > 0
  const hasSocial = row.socialViews >= SOCIAL_THRESHOLD
  if (!hasEvent && !hasPress && !hasSocial) return null
  const cx = x + width / 2
  // space markers evenly
  const count  = [hasEvent, hasPress, hasSocial].filter(Boolean).length
  const spread = count === 3 ? 10 : count === 2 ? 7 : 0
  let offset = -spread
  const markers = []
  if (hasEvent) {
    markers.push(<text key="ev" x={cx + offset} y={y - 8} textAnchor="middle" fontSize={12} fill={COLORS.event} fontWeight="bold">★</text>)
    offset += spread
  }
  if (hasPress) {
    markers.push(<text key="pr" x={cx + offset} y={y - 8} textAnchor="middle" fontSize={12} fill={row.domColor} fontWeight="bold">◆</text>)
    offset += spread
  }
  if (hasSocial) {
    markers.push(<text key="so" x={cx + offset} y={y - 8} textAnchor="middle" fontSize={11} fill="#e1306c" fontWeight="bold">●</text>)
  }
  return <g>{markers}</g>
}

const makePromoDot = (color) => (props) => {
  const { cx, cy, payload } = props
  if (!cx || !cy) return null
  return payload.grPromo
    ? <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={6} fill={color} stroke="#166534" strokeWidth={2} />
    : <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={3} fill={color} />
}

const CustomTooltip = ({ active, payload, label, data, bulk }) => {
  if (!active || !payload?.length) return null
  const row = data?.find(d => d.week === label)
  const weekBulk = bulk?.filter(o => o.week === label) || []
  return (
    <div style={{
      background: 'white', border: '1px solid #e5e7eb', borderRadius: 10,
      padding: '12px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      minWidth: 240, maxWidth: 310
    }}>
      <div style={{ fontWeight: 700, color: '#1a1a2e', marginBottom: 2 }}>{label} · {row?.label}</div>
      {row?.bookscanNote && <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700, marginBottom: 4 }}>⚑ {row.bookscanNote}</div>}
      {row?.grPromo && <div style={{ fontSize: 10, color: '#166534', fontWeight: 700, marginBottom: 6 }}>📗 GR Paid Promo active (Nov 21–Dec 1)</div>}
      {row?.pending && <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, marginBottom: 6 }}>⏳ Bookscan data pending</div>}
      {payload.map(p => (
        <div key={p.name} style={{ fontSize: 12, color: p.color || p.fill, marginBottom: 2 }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
        </div>
      ))}
      {row?.press?.length > 0 && (
        <div style={{ marginTop: 8, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 6 }}>
            ◆ PRESS — {row.pressRaw} hits · {row.pressWt} weighted pts
          </div>
          {row.press.map((p, i) => (
            <div key={i} style={{ fontSize: 11, marginBottom: 5, display: 'flex', gap: 6 }}>
              <span style={{
                background: TIER_META[p.tier]?.color, color: 'white', fontSize: 9,
                fontWeight: 800, padding: '1px 5px', borderRadius: 4,
                whiteSpace: 'nowrap', alignSelf: 'flex-start', marginTop: 2
              }}>T{p.tier}</span>
              <span>
                <span style={{ fontWeight: 600, color: '#374151' }}>{p.outlet}</span>
                <span style={{ color: '#9ca3af' }}> · {p.date}</span><br />
                <span style={{ fontSize: 10, color: pressTypeColor(p.type), fontWeight: 600 }}>{p.type}</span>
                <span style={{ fontSize: 10, color: '#9ca3af' }}> · {TIER_META[p.tier]?.weight}pt</span>
              </span>
            </div>
          ))}
        </div>
      )}
      {row?.events?.length > 0 && (
        <div style={{ marginTop: 8, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.event, marginBottom: 4 }}>★ EVENTS</div>
          {row.events.map((e, i) => (
            <div key={i} style={{ fontSize: 11, marginBottom: 4 }}>
              <span style={{ fontWeight: 600, color: '#374151' }}>{e.name}</span>
              <span style={{ color: '#9ca3af' }}> · {e.date}</span><br />
              <span style={{ fontSize: 10, color: '#6b7280' }}>{e.type}{e.attendance ? ` · ${e.attendance.toLocaleString()} attendees` : ''}</span>
            </div>
          ))}
        </div>
      )}
      {row?.socialPosts?.filter(p => p.views >= SOCIAL_THRESHOLD).length > 0 && (
        <div style={{ marginTop: 8, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#e1306c', marginBottom: 4 }}>● BIG SOCIAL THIS WEEK</div>
          {row.socialPosts.filter(p => p.views >= SOCIAL_THRESHOLD).map((p, i) => (
            <div key={i} style={{ fontSize: 11, marginBottom: 3 }}>
              <span style={{ fontWeight: 600, color: '#374151' }}>{p.content}</span>
              <span style={{ color: '#9ca3af' }}> · {p.views.toLocaleString()} views</span><br />
              <span style={{ fontSize: 10, color: p.platform === 'Instagram' ? '#e1306c' : '#0077b5' }}>{p.platform}</span>
              {p.collab && <span style={{ fontSize: 10, color: '#7c3aed' }}> · Collab</span>}
            </div>
          ))}
        </div>
      )}
      {weekBulk.length > 0 && (
        <div style={{ marginTop: 8, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>BULK ORDERS</div>
          {weekBulk.map((o, i) => (
            <div key={i} style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>
              {o.buyer}: <strong style={{ color: '#6b7280' }}>{o.qty}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [rawData, setRawData]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [activeTab, setActiveTab] = useState('combined')
  const [pressView, setPressView] = useState('weighted')
  const [lastUpdated, setLastUpdated] = useState(null)

  const loadData = async () => {
    setLoading(true)
    const result = await fetchAllData()
    if (result.error) {
      setError(result.error)
    } else {
      setRawData(result)
      setLastUpdated(new Date())
      setError(null)
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const derived = useMemo(() => {
    if (!rawData) return []
    return deriveData(rawData.bookscan, rawData.press, rawData.events, rawData.bulk, rawData.social)
  }, [rawData])

  // ── TOTALS ──
  const totalSales      = derived.reduce((s, d) => s + d.sales, 0)
  const totalBulk       = derived.reduce((s, d) => s + d.bulk, 0)
  const totalOrganic    = totalSales - totalBulk
  const totalGRAdded    = rawData?.grSnapshot?.added      ?? derived.reduce((s, d) => s + d.grAdded, 0)
  const totalGRToRead   = rawData?.grSnapshot?.wantToRead  ?? derived.reduce((s, d) => s + d.grToRead, 0)
  const totalGRRatings  = rawData?.grSnapshot?.ratings     ?? derived.reduce((s, d) => s + d.grRatings, 0)
  const totalGRReviews  = rawData?.grSnapshot?.reviews     ?? derived.reduce((s, d) => s + (d.grReviews || 0), 0)
  const grAvgRating     = rawData?.grSnapshot?.avgRating      ?? null
  const grSnapshotDate  = rawData?.grSnapshot?.date           ?? null
  const amazonReviews   = rawData?.grSnapshot?.amazonReviews   ?? null
  const amazonAvgRating = rawData?.grSnapshot?.amazonAvgRating ?? null
  const amazon5Star     = rawData?.grSnapshot?.amazon5Star     ?? null
  const amazon4Star     = rawData?.grSnapshot?.amazon4Star     ?? null
  const amazon3Star     = rawData?.grSnapshot?.amazon3Star     ?? null
  const amazon2Star     = rawData?.grSnapshot?.amazon2Star     ?? null
  const amazon1Star     = rawData?.grSnapshot?.amazon1Star     ?? null
  const totalEvents     = rawData?.events?.length || 0
  const totalAttendance = rawData?.events?.reduce((s, e) => s + (e.attendance || 0), 0) || 0
  const totalPress      = rawData?.press?.length || 0
  const totalPressWt    = rawData?.press?.reduce((s, p) => s + (TIER_META[p.tier]?.weight || 1), 0) || 0
  const organicPct      = totalSales > 0 ? Math.round((totalOrganic / totalSales) * 100) : 0
  const bulkPct         = totalSales > 0 ? Math.round((totalBulk    / totalSales) * 100) : 0
  const totalCopiesSold = totalSales + 2000 + 200 // + Coach direct + Rotman Canada
  const allSocial       = rawData?.social || []
  const totalSocialViews = allSocial.reduce((s, p) => s + p.views, 0)
  const collabPosts     = allSocial.filter(p => p.collab)
  const noCollabPosts   = allSocial.filter(p => !p.collab)
  const collabAvg       = collabPosts.length ? Math.round(collabPosts.reduce((s,p) => s+p.views,0) / collabPosts.length) : 0
  const noCollabAvg     = noCollabPosts.length ? Math.round(noCollabPosts.reduce((s,p) => s+p.views,0) / noCollabPosts.length) : 0

  const tabStyle = (t) => ({
    padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontSize: 12, fontWeight: 600,
    background: activeTab === t ? '#16213e' : '#f3f4f6',
    color: activeTab === t ? 'white' : '#6b7280',
  })
  const toggleStyle = (v) => ({
    padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
    fontSize: 11, fontWeight: 600,
    background: pressView === v ? '#db2877' : '#f3f4f6',
    color: pressView === v ? 'white' : '#6b7280',
  })

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: '#16213e', color: 'white', borderRadius: 8, padding: '5px 14px', fontWeight: 800, fontSize: 18, letterSpacing: 2 }}>BAG MAN</div>
      <div style={{ color: '#9ca3af', fontSize: 13 }}>Loading campaign data…</div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ color: '#ef4444', fontSize: 14, fontWeight: 600 }}>Failed to load data</div>
      <div style={{ color: '#9ca3af', fontSize: 12, maxWidth: 400, textAlign: 'center' }}>{error}</div>
      <div style={{ color: '#6b7280', fontSize: 12 }}>Make sure your Google Sheet is published and the Sheet ID in sheets.js is correct.</div>
      <button onClick={loadData} style={{ padding: '8px 20px', borderRadius: 8, background: '#16213e', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13 }}>Retry</button>
    </div>
  )

  const weekSocial = derived.map(d => ({
    week: d.week,
    collabViews: d.collabViews,
    ownViews: d.ownViews,
    organic: d.organic,
  }))

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", background: '#f8f9fb', minHeight: '100vh', padding: '24px 28px' }}>

      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
          {/* Book Cover */}
          <img
            src="/cover.jpg"
            alt="Bag Man book cover"
            style={{
              width: 72, borderRadius: 6,
              boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
              flexShrink: 0
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
              <div style={{ background: '#16213e', color: 'white', borderRadius: 8, padding: '5px 14px', fontWeight: 800, fontSize: 18, letterSpacing: 2 }}>BAG MAN</div>
              <div style={{ color: '#6b7280', fontSize: 13 }}>by Lew Frankfort</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <button onClick={loadData} style={{
            padding: '6px 14px', borderRadius: 8, background: 'white', border: '1px solid #e5e7eb',
            fontSize: 11, fontWeight: 600, color: '#374151', cursor: 'pointer'
          }}>↻ Refresh</button>
          {lastUpdated && (
            <div style={{ fontSize: 10, color: '#9ca3af' }}>
              Updated {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <StatCard label="Total Copies Sold" value={totalCopiesSold.toLocaleString()} sub="Bookscan + Coach + Rotman 🇨🇦" color={COLORS.organicGreen} />
        <StatCard label="Bookscan"          value={totalSales.toLocaleString()}       sub="US Circana retail only (85%+ of all US book sales)"  color={COLORS.organic}      />
        <StatCard label="Organic Sales"     value={totalOrganic.toLocaleString()}     pct={`${organicPct}% of Bookscan`}  sub="Reader-driven retail"   color="#4b6a8a"            />
        <StatCard label="Bulk / Placement"  value={totalBulk.toLocaleString()}        pct={`${bulkPct}% of Bookscan`}     sub="Corporate & event / B&N" color="#94a3b8"           />
        <StatCard label="Press Hits"        value={totalPress}                        pct={`${totalPressWt} weighted pts`} sub="Across all media types"  color={COLORS.t1}         />
        <StatCard label="Events"            value={totalEvents}                       sub={`${totalAttendance.toLocaleString()} total attendees`} color={COLORS.event} />
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        {/* Amazon card with star breakdown */}
        <div style={{
          background: 'white', borderRadius: 14, padding: '16px 20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)', flex: '2 1 280px',
          borderTop: '4px solid #f59e0b'
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: 1, marginBottom: 10 }}>AMAZON CUSTOMER REVIEWS</div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center', minWidth: 80 }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>{amazonAvgRating ?? '—'}</div>
              <div style={{ color: '#f59e0b', fontSize: 16, margin: '4px 0' }}>★★★★★</div>
              <div style={{ fontSize: 10, color: '#9ca3af' }}>{amazonReviews ? `${amazonReviews} global ratings` : '—'}</div>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              {[
                { stars: 5, pct: amazon5Star },
                { stars: 4, pct: amazon4Star },
                { stars: 3, pct: amazon3Star },
                { stars: 2, pct: amazon2Star },
                { stars: 1, pct: amazon1Star },
              ].map(({ stars, pct }) => (
                <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <div style={{ fontSize: 10, color: '#6b7280', width: 32, textAlign: 'right', flexShrink: 0 }}>{stars} ★</div>
                  <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 4, height: 10, overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct ?? 0}%`, height: '100%', borderRadius: 4,
                      background: stars >= 4 ? '#f59e0b' : stars === 3 ? '#94a3b8' : '#ef4444',
                    }} />
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: stars >= 4 ? '#f59e0b' : '#9ca3af', width: 28, flexShrink: 0 }}>{pct ?? 0}%</div>
                </div>
              ))}
            </div>
          </div>
          {grSnapshotDate && <div style={{ fontSize: 9, color: '#c4c9d4', marginTop: 10 }}>As of {grSnapshotDate}</div>}
        </div>
        {/* Goodreads card */}
        <div style={{
          background: 'white', borderRadius: 14, padding: '16px 20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)', flex: '1 1 160px',
          borderTop: `4px solid ${COLORS.grRatings}`
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: 1, marginBottom: 10 }}>GOODREADS</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: COLORS.grRatings, lineHeight: 1 }}>{grAvgRating ?? '—'}</div>
          <div style={{ color: COLORS.grRatings, fontSize: 14, margin: '4px 0' }}>★★★★★</div>
          <div style={{ fontSize: 11, color: '#374151', fontWeight: 600, marginTop: 8 }}>{totalGRRatings.toLocaleString()} ratings · {totalGRReviews} reviews</div>
          <div style={{ fontSize: 11, color: COLORS.grToRead, fontWeight: 600, marginTop: 4 }}>{totalGRToRead.toLocaleString()} want to read</div>
          {grSnapshotDate && <div style={{ fontSize: 9, color: '#c4c9d4', marginTop: 8 }}>As of {grSnapshotDate}</div>}
        </div>
      </div>

      {/* COACH note */}
      <div style={{
        background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: 10,
        padding: '9px 14px', marginBottom: 12, fontSize: 11, color: '#3730a3',
        display: 'flex', alignItems: 'center', gap: 8
      }}>
        <span style={{ fontSize: 14 }}>📦</span>
        <span><strong>Sales outside Bookscan:</strong> COACH purchased 2,000 copies direct from the publisher 📦 · Rotman/U of Toronto event sold ~200 copies in Canada 🇨🇦 · Neither is captured in US Bookscan/retail figures above.</span>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, fontSize: 11, color: '#6b7280', flexWrap: 'wrap' }}>
        <span><span style={{ color: COLORS.organic, fontWeight: 700 }}>■</span> Organic</span>
        <span><span style={{ color: '#94a3b8',      fontWeight: 700 }}>■</span> Bulk</span>
        <span><span style={{ color: COLORS.event,   fontWeight: 700 }}>★</span> Event</span>
        <span><span style={{ color: '#e1306c',      fontWeight: 700 }}>●</span> Social 20K+ views</span>
        <span style={{ background: '#c9a84c22', color: '#c9a84c', border: '1px solid #c9a84c66', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>◆ T1 Gold ×3</span>
        <span style={{ background: '#9ca3af22', color: '#9ca3af', border: '1px solid #9ca3af66', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>◆ T2 Silver ×2</span>
        <span style={{ background: '#b4530922', color: '#b45309', border: '1px solid #b4530966', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>◆ T3 Bronze ×1</span>
        <span style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #86efac', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>📗 GR Promo</span>
      </div>

      {/* Methodology */}
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '9px 14px', marginBottom: 16, fontSize: 11, color: '#92400e' }}>
        ⚑ <strong>Methodology:</strong> Pre-pub bulk orders assigned to Wk 1. Bulk week assignments ±1 week. Events shown week they occurred; sales impact may appear following week. Press: T1=3pts · T2=2pts · T3=1pt. GR spikes in Wks 6–8 partly reflect publisher paid GR promotion (Nov 21–Dec 1). Pending weeks show events/GR only until Bookscan data arrives.
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['combined','Combined View'],['sales','Bookscan Sales'],['press','Press'],['events','Events'],['goodreads','Goodreads'],['social','Social Media'],['bulk','Bulk Orders']].map(([id, label]) => (
          <button key={id} style={tabStyle(id)} onClick={() => setActiveTab(id)}>{label}</button>
        ))}
      </div>

      {/* Chart Panel */}
      <div style={{ background: 'white', borderRadius: 16, padding: '24px 20px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: 20 }}>

        {/* COMBINED */}
        {activeTab === 'combined' && (<>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: '0 0 4px' }}>Weekly Bookscan + Events + Press</h2>
          <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>★ = event · ◆ = press tier · ● = social 20K+ views · GR adds on right axis. Hover for detail.</p>
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '6px 12px', marginBottom: 12, fontSize: 11, color: '#166534', display: 'flex', gap: 8 }}>
            <span>📗</span>
            <span>GR right axis capped at 100 for readability. Publisher paid promotions (Sep 17–24 and Nov 21–Dec 1) drove spikes well above this — see the Goodreads tab for the full picture.</span>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={derived} margin={{ top: 28, right: 40, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left"  tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} domain={[0, 100]} allowDataOverflow />
              <Tooltip content={<CustomTooltip data={derived} bulk={rawData?.bulk} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="organic" name="Organic Sales" stackId="a" fill={COLORS.organic}>
                <LabelList content={(props) => <MarkerLabel {...props} data={derived} />} />
              </Bar>
              <Bar yAxisId="left" dataKey="bulk" name="Bulk/Placement" stackId="a" fill={COLORS.bulk} radius={[4,4,0,0]} />
              <Line yAxisId="right" type="monotone" dataKey="grAdded" name="GR Added" stroke={COLORS.grAdded} strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </>)}

        {/* SALES */}
        {activeTab === 'sales' && (<>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: '0 0 4px' }}>Weekly Bookscan: Organic vs. Bulk</h2>
          <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 16 }}>★ = event · ◆ = press. Hover for detail.</p>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={derived} margin={{ top: 28, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip data={derived} bulk={rawData?.bulk} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="organic" name="Organic Sales" stackId="a" fill={COLORS.organic}>
                <LabelList content={(props) => <MarkerLabel {...props} data={derived} />} />
              </Bar>
              <Bar dataKey="bulk" name="Bulk/Placement" stackId="a" fill={COLORS.bulk} radius={[4,4,0,0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </>)}

        {/* PRESS */}
        {activeTab === 'press' && (<>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, gap: 8, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>Press Coverage vs. Organic Sales</h2>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={toggleStyle('weighted')} onClick={() => setPressView('weighted')}>Weighted</button>
              <button style={toggleStyle('raw')}      onClick={() => setPressView('raw')}>Raw Count</button>
            </div>
          </div>
          <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 16 }}>
            {pressView === 'weighted' ? 'Bar = weighted impact score. Color = dominant tier.' : 'Bar = raw hit count.'} Dark line = organic sales.
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={derived} margin={{ top: 16, right: 40, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip data={derived} bulk={rawData?.bulk} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey={pressView === 'weighted' ? 'pressWt' : 'pressRaw'}
                   name={pressView === 'weighted' ? 'Weighted Score' : 'Press Hits'} radius={[4,4,0,0]}>
                {derived.map((entry, i) => <Cell key={i} fill={entry.domColor} fillOpacity={0.5} />)}
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="organic" name="Organic Sales"
                    stroke={COLORS.organic} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.organic }} />
            </ComposedChart>
          </ResponsiveContainer>

          <div style={{ display: 'flex', gap: 10, marginTop: 16, marginBottom: 20 }}>
            {[1,2,3].map(t => {
              const count = rawData?.press?.filter(p => p.tier === t).length || 0
              return (
                <div key={t} style={{ background: TIER_META[t].color + '15', border: `1px solid ${TIER_META[t].color}44`, borderRadius: 10, padding: '8px 14px', flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: TIER_META[t].color }}>T{t} · {['Gold','Silver','Bronze'][t-1]}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: TIER_META[t].color }}>{count} <span style={{ fontSize: 11 }}>hits</span></div>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>{count * TIER_META[t].weight} pts · {TIER_META[t].desc}</div>
                </div>
              )
            })}
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>All Press ({totalPress} hits · {totalPressWt} pts)</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#f8f9fb' }}>
                {['Tier','Outlet','Type','Date','Week','Pts'].map(h => (
                  <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '2px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(rawData?.press || []).map((p, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '6px 10px' }}>
                    <span style={{ background: TIER_META[p.tier]?.color, color: 'white', padding: '2px 7px', borderRadius: 6, fontSize: 10, fontWeight: 800 }}>T{p.tier}</span>
                  </td>
                  <td style={{ padding: '6px 10px', fontWeight: 600, color: '#16213e' }}>{p.outlet}</td>
                  <td style={{ padding: '6px 10px' }}>
                    <span style={{ background: pressTypeColor(p.type) + '22', color: pressTypeColor(p.type), padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{p.type}</span>
                  </td>
                  <td style={{ padding: '6px 10px', color: '#6b7280' }}>{p.date}</td>
                  <td style={{ padding: '6px 10px', color: '#6b7280' }}>{p.week}</td>
                  <td style={{ padding: '6px 10px', fontWeight: 700, color: TIER_META[p.tier]?.color }}>{TIER_META[p.tier]?.weight}</td>
                </tr>
              ))}
              <tr style={{ background: '#f0f4ff', fontWeight: 700 }}>
                <td colSpan={4} style={{ padding: '8px 10px', color: '#16213e' }}>TOTAL</td>
                <td style={{ padding: '8px 10px', color: '#6b7280' }}>{totalPress} hits</td>
                <td style={{ padding: '8px 10px', color: COLORS.t1 }}>{totalPressWt} pts</td>
              </tr>
            </tbody>
          </table>
        </>)}

        {/* EVENTS */}
        {activeTab === 'events' && (<>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: '0 0 4px' }}>Events vs. Organic Sales</h2>
          <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 16 }}>Purple bars = attendance. Dark line = organic sales. Impact often visible the following week.</p>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={derived} margin={{ top: 16, right: 40, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left"  tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip data={derived} bulk={rawData?.bulk} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="totalAttendance" name="Event Attendance" fill={COLORS.event} fillOpacity={0.25} radius={[4,4,0,0]} />
              <Line yAxisId="right" type="monotone" dataKey="organic" name="Organic Sales" stroke={COLORS.organic} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.organic }} />
            </ComposedChart>
          </ResponsiveContainer>

          {/* Event Map */}
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', margin: '0 0 4px' }}>Event Locations</h3>
            <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 12 }}>Toronto to NYC · Circle size = attendance · Zoom in to see individual NYC venues</p>
            <EventMap events={rawData?.events || []} />
          </div>

          {/* Events table */}
          <div style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', margin: '0 0 10px' }}>All Events</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f8f9fb' }}>
                  {['Name','Week','Date','Type','Attendance'].map(h => (
                    <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '2px solid #e5e7eb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(rawData?.events || []).map((e, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '6px 10px', fontWeight: 600, color: '#16213e' }}>{e.name}</td>
                    <td style={{ padding: '6px 10px', color: '#6b7280' }}>{e.week}</td>
                    <td style={{ padding: '6px 10px', color: '#6b7280' }}>{e.date}</td>
                    <td style={{ padding: '6px 10px', color: '#6b7280' }}>{e.type}</td>
                    <td style={{ padding: '6px 10px', color: COLORS.event, fontWeight: 700 }}>{e.attendance?.toLocaleString() || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>)}

        {/* GOODREADS */}
        {activeTab === 'goodreads' && (<>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: '0 0 4px' }}>Goodreads Activity vs. Press Impact</h2>
          <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>GR lines = left axis · Press weighted score (bars) = right axis · Larger dots = GR paid promo weeks.</p>
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '7px 12px', marginBottom: 8, fontSize: 11, color: '#166534', display: 'flex', gap: 8 }}>
            <span>📗</span>
            <span><strong>Publisher GR Promo #1: Sep 17–24, 2025 (pre-launch)</strong> — ~2,400 adds driven by paid promotion. Falls before Wk 1 so not shown on chart below.</span>
          </div>
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '7px 12px', marginBottom: 14, fontSize: 11, color: '#166534', display: 'flex', gap: 8 }}>
            <span>📗</span>
            <span><strong>Publisher GR Promo #2: Nov 21–Dec 1, 2025 (Wks 6–8)</strong> — GR activity in this window is partly promotion-driven. Larger outlined dots mark affected weeks on the chart.</span>
          </div>
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={derived} margin={{ top: 16, right: 40, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left"  tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip data={derived} bulk={rawData?.bulk} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="right" dataKey="pressWt" name="Press Weighted Score" radius={[3,3,0,0]}>
                {derived.map((entry, i) => <Cell key={i} fill={entry.domColor} fillOpacity={0.25} />)}
              </Bar>
              <Line yAxisId="left" type="monotone" dataKey="grAdded"   name="GR Total Added"  stroke={COLORS.grAdded}   strokeWidth={2.5} dot={makePromoDot(COLORS.grAdded)} />
              <Line yAxisId="left" type="monotone" dataKey="grToRead"  name="GR Want to Read" stroke={COLORS.grToRead}  strokeWidth={2}   dot={makePromoDot(COLORS.grToRead)} />
              <Line yAxisId="left" type="monotone" dataKey="grRatings" name="GR Ratings"      stroke={COLORS.grRatings} strokeWidth={2}   dot={makePromoDot(COLORS.grRatings)} />
              <Line yAxisId="left" type="monotone" dataKey="grReviews" name="GR Reviews"      stroke="#6366f1"          strokeWidth={2}   dot={makePromoDot('#6366f1')} />
            </ComposedChart>
          </ResponsiveContainer>
        </>)}

        {/* SOCIAL */}
        {activeTab === 'social' && (() => {
          const igPosts = allSocial.filter(p => p.platform === 'Instagram')
          const liPosts = allSocial.filter(p => p.platform === 'LinkedIn')
          const igViews = igPosts.reduce((s,p) => s+p.views, 0)
          const liViews = liPosts.reduce((s,p) => s+p.views, 0)
          const top10   = [...allSocial].sort((a,b) => b.views - a.views).slice(0,10)
          return (<>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: '0 0 4px' }}>Social Media Performance</h2>
            <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 14 }}>
              {allSocial.length} posts · Collab posts averaged {collabAvg.toLocaleString()} views vs. {noCollabAvg.toLocaleString()} own posts — {collabAvg && noCollabAvg ? (Math.round(collabAvg/noCollabAvg * 10)/10) : '—'}× lift.
            </p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
              {[
                { label: 'Total Views',   value: totalSocialViews.toLocaleString(), color: '#16213e', sub: 'All platforms' },
                { label: 'Instagram',     value: igViews.toLocaleString(),           color: '#e1306c', sub: `${igPosts.length} posts` },
                { label: 'LinkedIn',      value: liViews.toLocaleString(),           color: '#0077b5', sub: `${liPosts.length} posts` },
                { label: 'Collab Avg',    value: collabAvg.toLocaleString(),         color: '#7c3aed', sub: `${collabPosts.length} collab posts` },
                { label: 'Own Post Avg',  value: noCollabAvg.toLocaleString(),       color: '#6b7280', sub: `${noCollabPosts.length} own posts` },
              ].map(c => (
                <div key={c.label} style={{ background: c.color + '10', border: `1px solid ${c.color}33`, borderRadius: 10, padding: '8px 14px', flex: '1 1 100px' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: c.color }}>{c.value}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{c.label}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>{c.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Weekly Social Views vs. Organic Sales</div>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={weekSocial} margin={{ top: 8, right: 40, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left"  tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                <Tooltip formatter={(val) => val.toLocaleString()} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="collabViews" name="Collab Views"   stackId="s" fill="#7c3aed" fillOpacity={0.7} />
                <Bar yAxisId="left" dataKey="ownViews"    name="Own Post Views" stackId="s" fill="#a8b4c8" fillOpacity={0.7} radius={[4,4,0,0]} />
                <Line yAxisId="right" type="monotone" dataKey="organic" name="Organic Sales" stroke={COLORS.organic} strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: '20px 0 10px' }}>Top 10 Posts by Views</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f8f9fb' }}>
                  {['Date','Platform','Content','Collab','Views','Collaborators'].map(h => (
                    <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {top10.map((p, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '6px 10px', color: '#6b7280', whiteSpace: 'nowrap' }}>{p.date}</td>
                    <td style={{ padding: '6px 10px' }}>
                      <span style={{ background: p.platform === 'Instagram' ? '#e1306c22' : '#0077b522', color: p.platform === 'Instagram' ? '#e1306c' : '#0077b5', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{p.platform}</span>
                    </td>
                    <td style={{ padding: '6px 10px', fontWeight: 600, color: '#16213e' }}>{p.content}</td>
                    <td style={{ padding: '6px 10px' }}>
                      {p.collab ? <span style={{ background: '#7c3aed22', color: '#7c3aed', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>✓ Collab</span> : <span style={{ color: '#9ca3af', fontSize: 10 }}>—</span>}
                    </td>
                    <td style={{ padding: '6px 10px', fontWeight: 800, color: '#16213e' }}>{p.views.toLocaleString()}</td>
                    <td style={{ padding: '6px 10px', color: '#6b7280', fontSize: 10 }}>{p.collaborators || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>)
        })()}

        {/* BULK */}
        {activeTab === 'bulk' && (<>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: '0 0 4px' }}>Bulk Order Detail</h2>
          <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 16 }}>{rawData?.bulk?.length || 0} orders via Barnes & Noble. Total: {totalBulk.toLocaleString()} copies.</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#f8f9fb' }}>
                {['Buyer','Order Date','Bookscan Week','Qty','Notes'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '2px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(rawData?.bulk || []).map((o, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 600, color: '#16213e' }}>{o.buyer}</td>
                  <td style={{ padding: '6px 10px', color: '#6b7280' }}>{o.date}</td>
                  <td style={{ padding: '6px 10px', color: '#6b7280' }}>{o.week}</td>
                  <td style={{ padding: '6px 10px', fontWeight: 700, color: '#94a3b8' }}>{o.qty}</td>
                  <td style={{ padding: '6px 10px', color: '#f59e0b', fontSize: 10 }}>{o.note || '—'}</td>
                </tr>
              ))}
              <tr style={{ background: '#f0f4ff', fontWeight: 700 }}>
                <td colSpan={3} style={{ padding: '8px 10px', color: '#16213e' }}>TOTAL</td>
                <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{totalBulk.toLocaleString()}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </>)}
      </div>

      {/* Weekly Detail Table */}
      <div style={{ background: 'white', borderRadius: 16, padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: '0 0 14px' }}>Weekly Detail</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#f8f9fb' }}>
                {['Week','Dates','Bookscan','Bulk','Organic','Press Hits','Press Pts','Events','Attendance','GR Added','Want to Read','Ratings','Reviews'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {derived.map((row, i) => (
                <tr key={row.week} style={{ background: row.grPromo ? '#f0fdf4' : row.pending ? '#fafafa' : i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 600, color: '#16213e' }}>
                    {row.week}{row.grPromo ? ' 📗' : ''}{row.pending ? ' ⏳' : ''}
                  </td>
                  <td style={{ padding: '6px 10px', color: '#6b7280', whiteSpace: 'nowrap' }}>{row.label}</td>
                  <td style={{ padding: '6px 10px', fontWeight: 600 }}>{row.pending ? '—' : row.sales.toLocaleString()}</td>
                  <td style={{ padding: '6px 10px', color: '#94a3b8' }}>{row.bulk > 0 ? row.bulk.toLocaleString() : '—'}</td>
                  <td style={{ padding: '6px 10px', color: COLORS.organicGreen, fontWeight: 700 }}>{row.pending ? '—' : row.organic.toLocaleString()}</td>
                  <td style={{ padding: '6px 10px', color: row.domColor, fontWeight: 700 }}>{row.pressRaw > 0 ? `◆ ${row.pressRaw}` : '—'}</td>
                  <td style={{ padding: '6px 10px', color: row.domColor, fontWeight: 700 }}>{row.pressWt > 0 ? `${row.pressWt}pt` : '—'}</td>
                  <td style={{ padding: '6px 10px', color: COLORS.event, fontWeight: 700 }}>{row.eventCount > 0 ? `★ ${row.eventCount}` : '—'}</td>
                  <td style={{ padding: '6px 10px', color: COLORS.event }}>{row.totalAttendance > 0 ? row.totalAttendance.toLocaleString() : '—'}</td>
                  <td style={{ padding: '6px 10px', color: COLORS.grAdded,   fontWeight: 600 }}>{row.grAdded || '—'}</td>
                  <td style={{ padding: '6px 10px', color: COLORS.grToRead,  fontWeight: 600 }}>{row.grToRead || '—'}</td>
                  <td style={{ padding: '6px 10px', color: COLORS.grRatings, fontWeight: 600 }}>{row.grRatings || '—'}</td>
                  <td style={{ padding: '6px 10px', color: '#6366f1',        fontWeight: 600 }}>{row.grReviews || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
        <img src="/mt_small.jpg" alt="Mike Taylor" style={{ width: 28, height: 28, borderRadius: 6 }} />
        <div style={{ fontSize: 11, color: '#9ca3af' }}>
          Powered by <strong style={{ color: '#6b7280' }}>Mike Taylor LLC</strong> · <a href="https://miketaylor.nyc" target="_blank" rel="noopener noreferrer" style={{ color: '#9ca3af', textDecoration: 'none' }}>miketaylor.nyc</a> · Internal use only
        </div>
      </div>
    </div>
  )
}
