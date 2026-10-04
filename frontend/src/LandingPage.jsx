import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, ChevronRight } from 'lucide-react';
import './LandingPage.css';

const API = 'http://127.0.0.1:8000/api';

const HERO_IMAGES = [
  'https://upload.wikimedia.org/wikipedia/commons/3/30/Echo_Park_Lake_with_Downtown_Los_Angeles_Skyline.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/San_Francisco_in_2022.jpg/1280px-San_Francisco_in_2022.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/San_Diego_skyline_from_Coronado_island_in_August_2021.jpg/1280px-San_Diego_skyline_from_Coronado_island_in_August_2021.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Boston_Mass_-_aerial.jpg/1280px-Boston_Mass_-_aerial.jpg'
];

export default function LandingPage({ onSearch }) {
  const [slide, setSlide] = useState(0);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSpanish, setIsSpanish] = useState(false);

  // Background slideshow
  useEffect(() => {
    const timer = setInterval(() => setSlide(s => (s + 1) % HERO_IMAGES.length), 5000);
    return () => clearInterval(timer);
  }, []);

  // Fetch lookups list
  useEffect(() => {
    const loadMock = async () => {
      try {
        const res = await fetch(`${API}/lookup/`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setSuggestions(data.map(item => ({
            id: item.id,
            label: item.street_address || item.id,
            state: item.state,
            asOfDate: item.as_of_date || '2025-08-01'
          })));
        }
      } catch (err) {
        console.error("Failed to load lookups:", err);
      }
    };
    loadMock();
  }, []);

  const filtered = query.length > 1
    ? suggestions.filter(s => s.label.toLowerCase().includes(query.toLowerCase()))
    : [];

  const handleSelect = (item) => {
    setShowDropdown(false);
    onSearch(item);
  };

  return (
    <div className="landing-root">
      
      <div className="landing-bg">
        <AnimatePresence initial={false}>
          <motion.div
            key={slide}
            className="landing-bg-img"
            style={{ backgroundImage: `url(${HERO_IMAGES[slide]})` }}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
          />
        </AnimatePresence>
        <div className="landing-scrim" />
      </div>

      <div className="landing-topbar">
        <div className="landing-logo">Nav<span className="teal">AI</span>gator</div>
        <button className="landing-lang-btn" onClick={() => setIsSpanish(!isSpanish)}>
          <Globe size={13} /> {isSpanish ? 'English' : 'Español'}
        </button>
      </div>

      <main className="landing-hero">
        <div className="landing-hero-content">
          
          <div className="landing-hero-text">
            <motion.h1 
              initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6 }}
            >
              {isSpanish 
                ? <>Encuentra exactamente qué reglas de alquiler aplican a <span className="teal">tu edificio.</span></>
                : <>Find exactly which rental rules apply to <span className="teal">your specific building.</span></>}
            </motion.h1>
            
            <motion.p 
              initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6, delay:0.1 }}
            >
              {isSpanish
                ? "Se acabaron las dudas. NavAIgator analiza las leyes locales y estatales contra los datos de tu edificio para decirte tus derechos al instante."
                : "No more guessing. NavAIgator analyzes local and state laws against your building's unique facts to tell you your rights instantly."}
            </motion.p>
          </div>

          <motion.div 
            className="landing-search-wrapper"
            initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6, delay:0.2 }}
          >
            <div className="landing-search-box">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder={isSpanish ? "Ingresa una dirección (ej. 123 Main St, Los Angeles)" : "Enter a building address (e.g. 123 Main St, Los Angeles)"}
                value={query}
                onChange={e => { setQuery(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
              />
              <button className="search-btn">{isSpanish ? 'Analizar' : 'Analyze'}</button>
            </div>

            <AnimatePresence>
              {showDropdown && query.length > 1 && (
                <motion.div 
                  className="search-dropdown"
                  initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }}
                >
                  {filtered.length > 0 ? (
                    filtered.map(item => (
                      <div key={item.id} className="suggestion-item" onClick={() => handleSelect(item)}>
                        <div className="suggestion-icon"><Search size={14} /></div>
                        <div className="suggestion-text">
                          <div className="suggestion-label">{item.label}</div>
                          <div className="suggestion-type">{isSpanish ? 'Edificio Residencial' : 'Residential Building'}</div>
                        </div>
                        <div className="suggestion-tag">{item.state}</div>
                      </div>
                    ))
                  ) : (
                    <div className="suggestion-empty">{isSpanish ? 'No hay edificios conocidos que coincidan.' : 'No known buildings match that address.'}</div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <button className="landing-changes-btn" onClick={() => onSearch({ view: 'changes' })}>
            {isSpanish ? 'Ver cambios de ley próximos' : 'See upcoming law changes'} <ChevronRight size={14} />
          </button>
        </div>
      </main>

      <footer className="landing-footer">
        <div>{isSpanish ? 'Cubriendo más de 500 edificios en 9 ciudades principales.' : 'Covering 500+ buildings across 9 major cities.'}</div>
        <div>{isSpanish ? 'No es asesoría legal. Siempre verifica con fuentes oficiales.' : 'Not legal advice. Always verify with official sources.'}</div>
      </footer>
    </div>
  );
}
