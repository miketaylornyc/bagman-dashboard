// ─────────────────────────────────────────────────────────────────────────────
// Google Sheets Data Fetcher
// Using the published CSV URL format
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Google Sheets Data Fetcher
// Using the published CSV URL format
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRwsaaVpf7MVmOmJOubDD9lFyD6diQZ4DapZ1RPgOZzK0_AlOIzywJpavEx0xIUHyvkqkJp-3NqjgMD/pub'

const TABS = {
  bookscan:    '0',
  press:       '206487436',
  events:      '1780461214',
  bulk:        '1893799877',
  social:      '552142358',
  goodreads:   '434944970',
  grSnapshot:  '827853497',
}

const csvUrl = (gid) => `${BASE_URL}?output=csv&gid=${gid}`

const parseCSV = (text) => {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map(line => {
    // Handle quoted fields with commas inside
    const values = []
    let current = ''
    let inQuotes = false
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes }
      else if (char === ',' && !inQuotes) { values.push(current.trim()); current = '' }
      else { current += char }
    }
    values.push(current.trim())
    return Object.fromEntries(headers.map((h, i) => [h, values[i] || '']))
  }).filter(row => Object.values(row).some(v => v !== ''))
}

const num = (v) => parseFloat((v || '0').replace(/,/g, '')) || 0
const bool = (v) => v?.toString().toUpperCase() === 'TRUE'

export async function fetchAllData() {
  try {
    const [bookscanCSV, pressCSV, eventsCSV, bulkCSV, socialCSV, goodreadsCSV, grSnapshotCSV] = await Promise.all([
      fetch(csvUrl(TABS.bookscan)).then(r => r.text()),
      fetch(csvUrl(TABS.press)).then(r => r.text()),
      fetch(csvUrl(TABS.events)).then(r => r.text()),
      fetch(csvUrl(TABS.bulk)).then(r => r.text()),
      fetch(csvUrl(TABS.social)).then(r => r.text()),
      fetch(csvUrl(TABS.goodreads)).then(r => r.text()),
      fetch(csvUrl(TABS.grSnapshot)).then(r => r.text()),
    ])

    // ── GOODREADS (daily → weekly aggregation) ────────────────────────────────
    // Columns: Date | Added | Ratings | Reviews | To-Read
    // Wk 1 starts Oct 13, 2025 (Monday before Oct 14 launch)
    const WK1_START = new Date('2025-10-13T00:00:00')
    const grWeekly = {}
    parseCSV(goodreadsCSV).forEach(r => {
      const d = new Date(r['Date'])
      if (isNaN(d)) return
      const diffDays = Math.floor((d - WK1_START) / 86400000)
      const key = `Wk ${Math.floor(diffDays / 7) + 1}`
      if (!grWeekly[key]) grWeekly[key] = { grAdded: 0, grRatings: 0, grReviews: 0, grToRead: 0 }
      grWeekly[key].grAdded   += num(r['Added'])
      grWeekly[key].grRatings += num(r['Ratings'])
      grWeekly[key].grReviews += num(r['Reviews'])
      grWeekly[key].grToRead  += num(r['To-Read'])
    })

    // ── BOOKSCAN ──────────────────────────────────────────────────────────────
    // Columns: Week | Label | Sales | GR Promo | Pending | Note
    // GR values come from daily Goodreads tab; Bookscan sheet values used as fallback
    const bookscan = parseCSV(bookscanCSV).map(r => {
      const week = r['Week']
      const grFromDaily = grWeekly[week] || { grAdded: 0, grRatings: 0, grReviews: 0, grToRead: 0 }
      return {
        week,
        label:        r['Label'],
        sales:        num(r['Sales']),
        grAdded:      grFromDaily.grAdded,
        grToRead:     grFromDaily.grToRead,
        grRatings:    grFromDaily.grRatings,
        grReviews:    grFromDaily.grReviews,
        grPromo:      bool(r['GR Promo']),
        pending:      bool(r['Pending']),
        bookscanNote: r['Note'] || '',
      }
    })

    // ── PRESS ─────────────────────────────────────────────────────────────────
    // Columns: Outlet | Type | Date | Week | Tier
    const press = parseCSV(pressCSV).map(r => ({
      outlet: r['Outlet'],
      type:   r['Type'],
      date:   r['Date'],
      week:   r['Week'],
      tier:   num(r['Tier']),
    }))

    // ── EVENTS ────────────────────────────────────────────────────────────────
    // Columns: Name | Week | Date | Type | Attendance
    const events = parseCSV(eventsCSV).map(r => ({
      name:       r['Name'],
      week:       r['Week'],
      date:       r['Date'],
      type:       r['Type'],
      attendance: r['Attendance'] ? num(r['Attendance']) : null,
      zip:        r['Zip'] || '',
    }))

    // ── BULK ORDERS ───────────────────────────────────────────────────────────
    // Columns: Buyer | Date | Qty | Week | Note
    const bulk = parseCSV(bulkCSV).map(r => ({
      buyer: r['Buyer'],
      date:  r['Date'],
      qty:   num(r['Qty']),
      week:  r['Week'],
      note:  r['Note'] || '',
    }))

    // ── SOCIAL ────────────────────────────────────────────────────────────────
    // Columns: Date | Platform | Content | Collab | Views | Collaborators | Week
    const social = parseCSV(socialCSV).map(r => ({
      date:          r['Date'],
      platform:      r['Platform'],
      content:       r['Content'],
      collab:        bool(r['Collab']),
      views:         num(r['Views']),
      collaborators: r['Collaborators'] || '',
      week:          r['Week'],
    }))

    // ── GR SNAPSHOT (live totals from Goodreads page) ─────────────────────────
    // Columns: Date | Added | Ratings | Reviews | WantToRead | AvgRating
    // Single row updated manually whenever you check the GR stats page
    const grSnapshotRows = parseCSV(grSnapshotCSV)
    const grSnapshot = grSnapshotRows.length > 0 ? {
      date:            grSnapshotRows[0]['Date'] || '',
      added:           num(grSnapshotRows[0]['Added']),
      ratings:         num(grSnapshotRows[0]['Ratings']),
      reviews:         num(grSnapshotRows[0]['Reviews']),
      wantToRead:      num(grSnapshotRows[0]['Want to Read']),
      avgRating:       parseFloat(grSnapshotRows[0]['Avg Rating']) || null,
      amazonReviews:   num(grSnapshotRows[0]['Amazon Reviews']),
      amazonAvgRating: parseFloat(grSnapshotRows[0]['Amazon Avg Rating']) || null,
      amazon5Star:     num(grSnapshotRows[0]['Amazon 5 Star']),
      amazon4Star:     num(grSnapshotRows[0]['Amazon 4 Star']),
      amazon3Star:     num(grSnapshotRows[0]['Amazon 3 Star']),
      amazon2Star:     num(grSnapshotRows[0]['Amazon 2 Star']),
      amazon1Star:     num(grSnapshotRows[0]['Amazon 1 Star']),
    } : null

    return { bookscan, press, events, bulk, social, grSnapshot, error: null }
  } catch (err) {
    console.error('Failed to fetch sheet data:', err)
    return { bookscan: [], press: [], events: [], bulk: [], social: [], grSnapshot: null, error: err.message }
  }
}
