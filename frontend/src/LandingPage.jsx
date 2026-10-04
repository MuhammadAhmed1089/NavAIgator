import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, ChevronRight } from 'lucide-react';
import './LandingPage.css';

const API = import.meta.env.PROD ? '/api' : 'http://127.0.0.1:8000/api';

import laImg from '../public/img/la.jpg';
import sfImg from '../public/img/sf.jpg';
import sdImg from '../public/img/sd.jpg';

const CITIES = [
  { name: 'Los Angeles', src: laImg },
  { name: 'San Francisco', src: sfImg },
  { name: 'San Diego', src: sdImg },
];

export default function LandingPage({ onSearch }) {
  const [lang, setLang] = useState('en');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDrop, setShowDrop] = useState(false);
  const inputRef = useRef(null);
  const isEs = lang === 'es';

  /* Fetch all addresses from backend for search suggestions */
  useEffect(() => {
    fetch(`${API}/addresses`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setSuggestions(data.map(d => ({
            id: d.address_id,
            label: d.street_address,
            state: d.state || '',
            asOfDate: d.as_of_date || '2026-10-01',
          })));
        }
      })
      .catch(err => console.error('Failed to load addresses:', err));
  }, []);

  const filtered = query.trim().length > 1
    ? suggestions.filter(s => s.label.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  const handleSelect = item => {
    setShowDrop(false);
    setQuery(item.label);
    onSearch(item);
  };

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = e => {
      if (inputRef.current && !inputRef.current.closest('.search-wrap').contains(e.target)) {
        setShowDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="landing-root">
      
      {/* ── Background Grid ── */}
      <div className="slider-bg">
        <div className="city-panel">
          <img src={CITIES[0].src} alt={CITIES[0].name} className="hero-image" referrerPolicy="no-referrer" />
          <div className="city-label">{CITIES[0].name}</div>
        </div>
        <div className="city-divider" />
        <div className="city-panel">
          <img src={CITIES[1].src} alt={CITIES[1].name} className="hero-image" referrerPolicy="no-referrer" />
          <div className="city-label">{CITIES[1].name}</div>
        </div>
        <div className="city-divider" />
        <div className="city-panel">
          <img src={CITIES[2].src} alt={CITIES[2].name} className="hero-image" referrerPolicy="no-referrer" />
          <div className="city-label">{CITIES[2].name}</div>
        </div>
        <div className="scrim" />
      </div>

      {/* ── Navbar ── */}
      <nav className="navbar">
        <div className="navbar-logo">
          Nav<span className="teal">AI</span>gator
        </div>
        <button className="lang-toggle" onClick={() => setLang(l => l === 'en' ? 'es' : 'en')}>
          <Globe size={14} />
          {isEs ? 'English' : 'Español'}
        </button>
      </nav>

      {/* ── Hero Content ── */}
      <main className="hero">
        <div className="hero-content">
          
          <h1 className="hero-title">
            {isEs 
              ? <>Reglas de alquiler para <span className="teal">tu edificio.</span></>
              : <>Find exactly which rental rules apply to <span className="teal">your building.</span></>}
          </h1>
          
          <p className="hero-tagline">
            {isEs
              ? 'No más dudas. NavAIgator analiza las leyes locales y estatales contra los datos de tu edificio para decirte tus derechos al instante.'
              : 'No more guessing. NavAIgator analyzes local and state laws against your building\'s unique facts to tell you your rights instantly.'}
          </p>

          {/* ── Glassmorphic Hero Card ── */}
          <div className="hero-card">
            
            <div className="search-wrap" ref={inputRef}>
              <div className="search-bar">
                <Search className="search-icon" size={20} />
                <input
                  type="text"
                  placeholder={isEs ? 'Ingresa una dirección (ej. 123 Main St)' : 'Enter a building address (e.g. 123 Main St)'}
                  value={query}
                  onChange={e => { setQuery(e.target.value); setShowDrop(true); }}
                  onFocus={() => setShowDrop(true)}
                />
                <button 
                  className="search-btn"
                  onClick={() => { if (filtered[0]) handleSelect(filtered[0]); }}
                >
                  <Search size={18} />
                </button>
              </div>

              <AnimatePresence>
                {showDrop && query.trim().length > 1 && (
                  <motion.ul
                    className="dropdown"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    {filtered.length > 0 ? filtered.map(item => (
                      <li key={item.id} onClick={() => handleSelect(item)}>
                        <Search className="dd-icon" size={14} />
                        <div style={{ flex: 1 }}>{item.label}</div>
                        <div style={{ opacity: 0.5 }}>{item.state}</div>
                      </li>
                    )) : (
                      <li className="dd-empty">
                        {isEs ? 'No se encontraron edificios que coincidan.' : 'No known buildings match that address.'}
                      </li>
                    )}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            <div className="cta-row">
              <button className="btn-ghost" onClick={() => onSearch({ view: 'changes' })}>
                {isEs ? 'Ver cambios de ley próximos' : 'See upcoming law changes'} <ChevronRight size={16} />
              </button>
            </div>

            <div className="legal-notice">
              <div className="trust-line">{isEs ? 'Cubriendo más de 500 edificios en 9 ciudades principales.' : 'Covering 500+ buildings across 9 major cities.'}</div>
              <div>{isEs ? 'No es asesoría legal. Siempre verifica con fuentes oficiales.' : 'Not legal advice. Always verify with official sources.'}</div>
            </div>

          </div>

        </div>
      </main>

    </div>
  );
}
