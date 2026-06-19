// ─────────────────────────────────────────────────────────────────────────────
// Google Sheets Data Fetcher
//
// HOW TO SET UP YOUR SHEET:
// 1. Create a Google Sheet with these tab names (exact spelling):
//    - Bookscan
//    - Press
//    - Events
//    - Bulk Orders
//    - Social
//
// 2. Publish the sheet:
//    File → Share → Publish to web → select "Entire Document" → CSV → Publish
//    (Do this for each tab, or use the Sheet ID approach below)
//
// 3. Get your Sheet ID from the URL:
//    https://docs.google.com/spreadsheets/d/SHEET_ID_IS_HERE/edit
//
// 4. Paste your Sheet ID into SHEET_ID below.
// ─────────────────────────────────────────────────────────────────────────────

const SHEET_ID = '1BRt8jvoQCGUvr0fw3sZYXSb8pCBwHakLNbmr3mNY98E'

// Tab GIDs — get these from each tab's URL (?gid=XXXXXXXX)
const TABS = {
  bookscan:    '0',
  press:       '206487436',
  events:      '1780461214',
  bulk:        '1893799877',
  social:      '552142358',
}

const csvUrl = (gid) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`

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
    const [bookscanCSV, pressCSV, eventsCSV, bulkCSV, socialCSV] = await Promise.all([
      fetch(csvUrl(TABS.bookscan)).then(r => r.text()),
      fetch(csvUrl(TABS.press)).then(r => r.text()),
      fetch(csvUrl(TABS.events)).then(r => r.text()),
      fetch(csvUrl(TABS.bulk)).then(r => r.text()),
      fetch(csvUrl(TABS.social)).then(r => r.text()),
    ])

    // ── BOOKSCAN ──────────────────────────────────────────────────────────────
    // Columns: Week | Label | Sales | GR Added | GR To Read | GR Ratings | GR Promo | Pending
    const bookscan = parseCSV(bookscanCSV).map(r => ({
      week:      r['Week'],
      label:     r['Label'],
      sales:     num(r['Sales']),
      grAdded:   num(r['GR Added']),
      grToRead:  num(r['GR To Read']),
      grRatings: num(r['GR Ratings']),
      grPromo:   bool(r['GR Promo']),
      pending:   bool(r['Pending']),
      bookscanNote: r['Note'] || '',
    }))

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

    return { bookscan, press, events, bulk, social, error: null }
  } catch (err) {
    console.error('Failed to fetch sheet data:', err)
    return { bookscan: [], press: [], events: [], bulk: [], social: [], error: err.message }
  }
}
