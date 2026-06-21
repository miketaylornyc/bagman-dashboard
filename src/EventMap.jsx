import { useEffect, useRef } from 'react'

// Static zip → [lat, lng] lookup
const ZIP_COORDS = {
  '10022': [40.7614, -73.9776],
  '10128': [40.7739, -73.9509],
  '10027': [40.8075, -73.9626],
  '10020': [40.7587, -73.9787],
  'M5S1A1': [43.6629, -79.3957],
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

export default function EventMap({ events }) {
  const mapRef    = useRef(null)
  const leafletRef = useRef(null)

  useEffect(() => {
    if (leafletRef.current) return // already initialized

    // Dynamically load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id   = 'leaflet-css'
      link.rel  = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    // Dynamically load Leaflet JS
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => initMap()
    document.head.appendChild(script)

    function initMap() {
      const L = window.L
      if (!mapRef.current || leafletRef.current) return

      // Bounds: Toronto (top) to southern NJ (bottom)
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

      // Plot events with zips
      const mappable = events.filter(e => {
        const zip = (e.zip || '').replace(/\s/g, '').toUpperCase()
        return zip && ZIP_COORDS[zip]
      })

      // Group by zip to stack tooltip if multiple events at same location
      const byZip = {}
      mappable.forEach(e => {
        const zip = (e.zip || '').replace(/\s/g, '').toUpperCase()
        if (!byZip[zip]) byZip[zip] = []
        byZip[zip].push(e)
      })

      Object.entries(byZip).forEach(([zip, evts]) => {
        const [lat, lng] = ZIP_COORDS[zip]
        const totalAtt = evts.reduce((s, e) => s + (e.attendance || 0), 0)
        const radius   = Math.max(8, Math.min(32, Math.sqrt(totalAtt || 20) * 2.5))
        const color    = TYPE_COLOR[evts[0].type] || '#6b7280'
        const isCanada = zip === 'M5S1A1'

        const circle = L.circleMarker([lat, lng], {
          radius,
          fillColor:   color,
          fillOpacity: 0.75,
          color:       isCanada ? '#166534' : 'white',
          weight:      isCanada ? 3 : 1.5,
        }).addTo(map)

        const tooltipHtml = evts.map(e =>
          `<div style="margin-bottom:4px">
            <strong>${e.name}</strong><br/>
            ${e.date} · ${e.type}${e.attendance ? ` · ${e.attendance.toLocaleString()} attendees` : ''}
          </div>`
        ).join('<hr style="margin:4px 0;border-color:#e5e7eb"/>')

        circle.bindTooltip(tooltipHtml, {
          permanent: false,
          direction: 'top',
          className: 'event-map-tooltip',
        })
      })

      // Legend
      const legend = L.control({ position: 'bottomright' })
      legend.onAdd = () => {
        const div = L.DomUtil.create('div')
        div.style.cssText = 'background:white;padding:10px 12px;border-radius:8px;font-size:11px;box-shadow:0 2px 8px rgba(0,0,0,0.12);line-height:1.8'
        div.innerHTML = `
          <div style="font-weight:700;color:#374151;margin-bottom:6px">Event Type</div>
          <div><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#7c3aed;margin-right:6px"></span>Public / Conference</div>
          <div><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#16213e;margin-right:6px"></span>Private / Members</div>
          <div><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#c9a84c;margin-right:6px"></span>Gala</div>
          <div style="margin-top:6px;color:#9ca3af">Circle size = attendance<br/>🇨🇦 Green border = Canada</div>
        `
        return div
      }
      legend.addTo(map)

      leafletRef.current = map
    }

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove()
        leafletRef.current = null
      }
    }
  }, [])

  // Re-render markers when events data changes
  useEffect(() => {
    if (!leafletRef.current || !window.L) return
    // markers are added on init; for live data updates a full re-init handles it
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
