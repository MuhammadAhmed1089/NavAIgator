import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, Calendar, ChevronDown } from 'lucide-react';
import './LandingPage.css';

const SAMPLE_ADDRESSES = [
  { id: 'A0001', label: '6238 DE LONGPRE AVE, Los Angeles, CA', state: 'CA' },
  { id: 'A0002', label: '1234 MISSION ST, San Francisco, CA', state: 'CA' },
  { id: 'A0003', label: '450 FREMONT ST, San Diego, CA', state: 'CA' },
  { id: 'A0004', label: '882 TELEGRAPH AVE, Berkeley, CA', state: 'CA' },
  { id: 'A0005', label: '200 N MAIN ST, Santa Ana, CA', state: 'CA' },
  { id: 'A0006', label: '88 WASHINGTON ST, Hoboken, NJ', state: 'NJ' },
  { id: 'A0007', label: '100 GROVE ST, Jersey City, NJ', state: 'NJ' },
  { id: 'A0008', label: '55 MARKET ST, Newark, NJ', state: 'NJ' },
  { id: 'A0009', label: '24 BEACON ST, Boston, MA', state: 'MA' },
  { id: 'A0010', label: '10 GARDEN ST, Cambridge, MA', state: 'MA' },
];

export default function LandingPage({ onSearch }) {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSpanish, setIsSpanish] = useState(false);

  const filtered = SAMPLE_ADDRESSES.filter(a =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (addr) => {
    setQuery(addr.label);
    setShowDropdown(false);
    setTimeout(() => onSearch({ ...addr, asOfDate }), 800);
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString + 'T00:00:00');
    if (isNaN(d)) return dateString;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const T = {
    title1: 'Nav',
    title2: 'AI',
    title3: 'gator',
    tagline: isSpanish
      ? '¿Qué reglas aplican hoy aquí — y qué está por cambiar?'
      : 'Which rules apply here today — and what is about to change?',
    placeholder: isSpanish
      ? 'Seleccione de 500 direcciones verificadas...'
      : 'Select from 500 verified apartment addresses...',
    legal: isSpanish ? 'Solo informativo — no es asesoramiento legal.' : 'Informational only — not legal advice.',
    trust: isSpanish
      ? 'Cada respuesta cita el texto fuente y separa leyes vigentes de las pendientes.'
      : 'Every answer cites the source text and separates enacted from pending law.',
    lookup: isSpanish ? 'Buscar Dirección' : 'Lookup an Address',
    changes: isSpanish ? 'Ver cambios próximos →' : 'See upcoming law changes →',
  };

  return (
    <div className="landing-root">
      {/* ─── Background Grid ─── */}
      <div className="slider-bg">
        <div className="city-panel">
          <img 
            src="/images/hero/la.webp" 
            alt="Los Angeles skyline" 
            className="hero-image"
            onError={(e) => e.target.style.display = 'none'}
          />
          <div className="city-label">LOS ANGELES, CA</div>
        </div>
        <div className="city-divider"></div>
        <div className="city-panel">
          <img 
            src="/images/hero/nj.webp" 
            alt="Hoboken New Jersey skyline" 
            className="hero-image"
            onError={(e) => e.target.style.display = 'none'}
          />
          <div className="city-label">HOBOKEN, NJ</div>
        </div>
        <div className="city-divider"></div>
        <div className="city-panel">
          <img 
            src="/images/hero/ma.webp" 
            alt="Boston skyline" 
            className="hero-image"
            onError={(e) => e.target.style.display = 'none'}
          />
          <div className="city-label">BOSTON, MA</div>
        </div>
        <div className="scrim"></div>
      </div>

      {/* ─── Navbar ─── */}
      <nav className="navbar">
        <div className="navbar-logo">
          {T.title1}<span className="teal">{T.title2}</span>{T.title3}
        </div>
        <button className="lang-toggle" onClick={() => setIsSpanish(s => !s)}>
          <Globe size={16} strokeWidth={2} />
          {isSpanish ? 'English' : 'Español'}
        </button>
      </nav>

      {/* ─── Hero ─── */}
      <main className="hero">
        <div className="hero-content">
          <motion.h1
            className="hero-title"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            {T.title1}<span className="teal">{T.title2}</span>{T.title3}
          </motion.h1>

          <motion.p
            className="hero-tagline"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.22 }}
          >
            {T.tagline}
          </motion.p>

          <motion.div
            className="hero-card"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <div className="search-wrap">
              <div className="search-bar">
                <Search size={20} className="search-icon" strokeWidth={2.5} />
                <input
                  type="text"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder={T.placeholder}
                />
                <button className="search-btn" onClick={() => filtered[0] && handleSelect(filtered[0])}>
                  <Search size={18} strokeWidth={2.5} color="#ffffff" />
                </button>
              </div>

              <AnimatePresence>
                {showDropdown && query.length > 0 && (
                  <motion.ul
                    className="dropdown"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    {filtered.length > 0
                      ? filtered.map(addr => (
                          <li key={addr.id} onClick={() => handleSelect(addr)}>
                            <Search size={13} className="dd-icon" />
                            {addr.label}
                          </li>
                        ))
                      : <li className="dd-empty">No addresses match — try a city name</li>
                    }
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            <p className="legal-notice">{T.legal}</p>
            <p className="trust-line"><em>{T.trust}</em></p>

            <div className="date-pill">
              <Calendar size={15} />
              <span>As of:</span>
              <div className="date-input-wrapper">
                <span className="formatted-date">{formatDate(asOfDate)}</span>
                <input
                  type="date"
                  className="hidden-date-input"
                  value={asOfDate}
                  onChange={e => setAsOfDate(e.target.value)}
                />
              </div>
              <ChevronDown size={14} />
            </div>

            <div className="cta-row">
              <button className="btn-primary" onClick={() => filtered[0] && handleSelect(filtered[0])}>
                {T.lookup}
              </button>
              <button className="btn-ghost" onClick={() => onSearch({ view: 'changes', asOfDate })}>
                {T.changes}
              </button>
            </div>

            <div className="stat-chips">
              {['500 Real Buildings', '9 Cities', '3 States', '105 Rules'].map(s => (
                <span key={s} className="chip">{s}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
