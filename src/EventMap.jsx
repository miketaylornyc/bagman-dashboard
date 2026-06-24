import { useEffect, useRef } from 'react'

const ZIP_COORDS = {
  '10022': [40.7614, -73.9776],
  '10128': [40.7739, -73.9509],
  '10027': [40.8075, -73.9626],
  '10020': [40.7587, -73.9787],
  'M5S1A1': [43.6629, -79.3957],
  'M5S3E6': [43.6629, -79.3957], // Rotman School of Management
  '10036': [40.7580, -73.9855],
  '10012': [40.7248, -74.0019],
  '10001': [40.7484, -74.0023],
  '10011': [40.7402, -74.0006],
  '10021': [40.7706, -73.9597],
  '10010': [40.7401, -73.9833],
  '10065': [40.7654, -73.9637],
  '10017': [40.7529, -73.9729],
  '10018': [40.7559, -73.9904],
  '07670': [40.9176, -73.9549],
  '10029': [40.7958, -73.9442], // East Harlem / Gathering of Ghosts
  '10075': [40.7726, -73.9547], // Upper East Side
  '10002': [40.7157, -73.9863], // Lower East Side
  '10014': [40.7337, -74.0043], // West Village
}

const TYPE_COLOR = {
  'Public/Ticketed': '#7c3aed',
  'Public':          '#7c3aed',
  'Conference':      '#7c3aed',
  'Student Event':   '#7c3aed',
  'Private':         '#16213e',
  'Members Only':    '#16213e',
  'Gala':            '#c9a84c',
}

// Keep a ref to events outside React so the Leaflet callback can always access latest
let _eventsCache = []

function renderMarkers(L, map, markersRef) {
  markersRef.current.forEach(m => m.remove())
  markersRef.current = []

  const byZip = {}
  _eventsCache.forEach(e => {
    const zip = (e.zip || '').replace(/\s/g, '').toUpperCase()
    console.log('Event:', e.name, '| Raw zip:', JSON.stringify(e.zip), '| Normalized:', zip, '| Found:', !!ZIP_COORDS[zip])
    if (!zip || !ZIP_COORDS[zip]) return
    if (!byZip[zip]) byZip[zip] = []
    byZip[zip].push(e)
  })

  Object.entries(byZip).forEach(([zip, evts]) => {
    const [lat, lng] = ZIP_COORDS[zip]
    const totalAtt = evts.reduce((s, e) => s + (e.attendance || 0), 0)
    const radius   = Math.max(8, Math.min(32, Math.sqrt(totalAtt || 20) * 2.5))
    const color    = TYPE_COLOR[evts[0].type] || '#6b7280'

    const circle = L.circleMarker([lat, lng], {
      radius,
      fillColor:   color,
      fillOpacity: 0.75,
      color:       'white',
      weight:      1.5,
    }).addTo(map)

    const tooltipHtml = evts.map(e =>
      `<div style="margin-bottom:4px">
        <strong>${e.name}</strong><br/>
        ${e.date} · ${e.type}${e.attendance ? ` · ${e.attendance.toLocaleString()} attendees` : ''}
      </div>`
    ).join('<hr style="margin:4px 0;border-color:#e5e7eb"/>')

    circle.bindTooltip(tooltipHtml, { permanent: false, direction: 'top' })
    markersRef.current.push(circle)
  })
}

export default function EventMap({ events }) {
  const mapRef     = useRef(null)
  const leafletRef = useRef(null)
  const markersRef = useRef([])

  // Always keep the module-level cache in sync
  _eventsCache = events

  useEffect(() => {
    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    function initMap() {
      const L = window.L
      if (!mapRef.current || leafletRef.current) return

      const map = L.map(mapRef.current, {
        center: [42.5, -76.0],
        zoom: 6,
        maxBounds: [[44.5, -81], [40.2, -71]],
        maxBoundsViscosity: 0.8,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 16,
      }).addTo(map)

      const legend = L.control({ position: 'bottomright' })
      legend.onAdd = () => {
        const div = L.DomUtil.create('div')
        div.style.cssText = 'background:white;padding:10px 12px;border-radius:8px;font-size:11px;box-shadow:0 2px 8px rgba(0,0,0,0.12);line-height:1.8'
        div.innerHTML = `
          <div style="font-weight:700;color:#374151;margin-bottom:6px">Event Type</div>
          <div><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#7c3aed;margin-right:6px"></span>Public / Conference</div>
          <div><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#16213e;margin-right:6px"></span>Private / Members</div>
          <div><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#c9a84c;margin-right:6px"></span>Gala</div>
          <div style="margin-top:6px;color:#9ca3af">Circle size = attendance</div>
        `
        return div
      }
      legend.addTo(map)

      leafletRef.current = map
      renderMarkers(L, map, markersRef)
    }

    if (window.L) {
      initMap()
    } else if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script')
      script.id  = 'leaflet-js'
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = initMap
      document.head.appendChild(script)
    } else {
      // Script tag exists but hasn't loaded yet — wait
      document.getElementById('leaflet-js').addEventListener('load', initMap)
    }

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove()
        leafletRef.current = null
        markersRef.current = []
      }
    }
  }, [])

  // Re-render markers whenever events data updates
  useEffect(() => {
    if (leafletRef.current && window.L && events.length > 0) {
      renderMarkers(window.L, leafletRef.current, markersRef)
    }
  }, [events])

  return (
    <div
      ref={mapRef}
      style={{
        height: 440,
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid #e5e7eb',
        boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
      }}
    />
  )
}
