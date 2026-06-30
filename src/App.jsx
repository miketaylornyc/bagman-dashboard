import { useState } from 'react'
import Dashboard from './Dashboard.jsx'

// Change this password to whatever you want
const PASSWORD = 'bagman2026'

export default function App() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem('bm_auth') === '1'
  )
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input === PASSWORD) {
      sessionStorage.setItem('bm_auth', '1')
      setAuthed(true)
    } else {
      setError(true)
      setInput('')
      setTimeout(() => setError(false), 2000)
    }
  }

  if (authed) return <Dashboard />

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f8f9fb'
    }}>
      <div style={{
        background: 'white', borderRadius: 16, padding: '40px 48px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)', width: 360, textAlign: 'center'
      }}>
        <div style={{
          background: '#16213e', color: 'white', borderRadius: 8,
          padding: '6px 18px', fontWeight: 800, fontSize: 20,
          letterSpacing: 3, display: 'inline-block', marginBottom: 8
        }}>BAG MAN</div>
        <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>
          Campaign Dashboard
        </div>
        <img
          src="/cover.jpg"
          alt="Bag Man book cover"
          style={{ width: 120, borderRadius: 8, boxShadow: '0 6px 24px rgba(0,0,0,0.18)', marginBottom: 24 }}
        />
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Password"
            autoFocus
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 8,
              border: error ? '2px solid #ef4444' : '2px solid #e5e7eb',
              fontSize: 14, outline: 'none', marginBottom: 12,
              transition: 'border-color 0.2s'
            }}
          />
          <button type="submit" style={{
            width: '100%', padding: '10px 0', borderRadius: 8,
            background: '#16213e', color: 'white', border: 'none',
            fontSize: 14, fontWeight: 700, cursor: 'pointer'
          }}>
            Enter
          </button>
          {error && (
            <div style={{ color: '#ef4444', fontSize: 12, marginTop: 10 }}>
              Incorrect password
            </div>
          )}
        </form>
        {/* Mike Taylor branding */}
        <div style={{ marginTop: 28, paddingTop: 18, borderTop: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <img src="/mt_medium.jpg" alt="Mike Taylor" style={{ width: 36, height: 36, borderRadius: 8 }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>Powered by Mike Taylor LLC</div>
            <div style={{ fontSize: 10, color: '#9ca3af' }}>miketaylor.nyc</div>
          </div>
        </div>
      </div>
    </div>
  )
}
