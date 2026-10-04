import React, { useState } from 'react';
import './index.css';
import LandingPage from './LandingPage';

export default function App() {
  const [selection, setSelection] = useState(null);

  return (
    <div>
      {!selection ? (
        <LandingPage onSearch={setSelection} />
      ) : (
        // Results page placeholder — will be built next
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100vh', fontFamily: 'Urbanist, sans-serif',
          background: '#f9fafb', flexDirection: 'column', gap: 16
        }}>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#111827' }}>
            Nav<span style={{ color: '#00D4AA' }}>AI</span>gator
          </h2>
          <p style={{ color: '#6b7280', fontSize: 16 }}>
            Fetching rules for: <strong>{selection.label || 'Upcoming Changes'}</strong>
          </p>
          <button
            style={{
              marginTop: 12, background: '#00D4AA', color: '#fff',
              border: 'none', borderRadius: 50, padding: '12px 28px',
              fontFamily: 'Urbanist', fontWeight: 700, fontSize: 15, cursor: 'pointer'
            }}
            onClick={() => setSelection(null)}
          >
            ← Back to Search
          </button>
        </div>
      )}
    </div>
  );
}
