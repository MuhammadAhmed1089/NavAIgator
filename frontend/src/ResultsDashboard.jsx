import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, ArrowLeft, Globe, X, ExternalLink,
  AlertTriangle, CheckCircle, HelpCircle, Clock,
  ChevronRight, Shield
} from 'lucide-react';
import UpcomingChangesMap from './UpcomingChangesMap';
import './ResultsDashboard.css';

const API = import.meta.env.PROD ? '/api' : 'http://127.0.0.1:8000/api';

/* ─── Helpers ──────────────────────────────────────────────── */
const getStatusMeta = (s, isSpanish) => {
  const META = {
    applies:           { label: isSpanish ? 'Aplica' : 'Applies',     icon: CheckCircle,    cls: 'applies',  summary: 'green' },
    exempt:            { label: isSpanish ? 'Exento' : 'Exempt',      icon: Shield,         cls: 'exempt',   summary: 'red'   },
    unknown:           { label: isSpanish ? 'Desconocido' : 'Unknown', icon: HelpCircle,    cls: 'unknown',  summary: 'yellow'},
    not_yet_effective: { label: isSpanish ? 'Pendiente' : 'Upcoming', icon: Clock,          cls: 'pending',  summary: 'gray'  },
    not_applicable:    { label: isSpanish ? 'N/A' : 'N/A',            icon: Shield,         cls: 'exempt',   summary: 'red'   },
  };
  return META[s] || META.applies;
};

const getCategoryLabel = (cat, isSpanish) => {
  const LABELS = {
    rent_increase_limits:      isSpanish ? 'Límites de Aumento de Renta' : 'Rent Increase Limits',
    just_cause_eviction:       isSpanish ? 'Causa Justa para Desalojo' : 'Just Cause for Eviction',
    relocation_assistance:     isSpanish ? 'Asistencia de Reubicación' : 'Relocation Assistance',
    notice_requirements:       isSpanish ? 'Requisitos de Notificación' : 'Notice Requirements',
    security_deposits:         isSpanish ? 'Depósitos de Seguridad' : 'Security Deposits',
    habitability:              isSpanish ? 'Estándares de Habitabilidad' : 'Habitability Standards',
    anti_harassment:           isSpanish ? 'Anti-Acoso' : 'Anti-Harassment',
    other:                     isSpanish ? 'Otras Protecciones' : 'Other Protections',
  };
  return LABELS[cat] || cat.replace(/_/g,' ');
};

const translateSystemText = (text, isSpanish) => {
  if (!isSpanish || !text) return text;
  if (text.includes("Superseded: A local city rule governs")) return "Sustituido: Una regla local rige sobre esta regla estatal porque las ordenanzas locales suelen ser más estrictas. La regla más estricta gana.";
  if (text.includes("Building satisfies known coverage conditions")) return "El edificio cumple con las condiciones de cobertura conocidas.";
  return text;
};


/* ─── Audit Modal ───────────────────────────────────────────── */
function AuditModal({ rule, onClose, isSpanish }) {
  const meta = getStatusMeta(rule.status, isSpanish);
  const StatusIcon = meta.icon;
  const r = rule.rule;
  const [translatedReq, setTranslatedReq] = useState('');

  useEffect(() => {
    if (isSpanish && !translatedReq) {
      setTranslatedReq('Traduciendo al español...');
      fetch(`${API}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: r.requirement })
      })
      .then(res => res.json())
      .then(data => setTranslatedReq(data.spanish_text))
      .catch(err => setTranslatedReq('Error en la traducción.'));
    }
  }, [isSpanish, r.requirement]);

  return (
    <AnimatePresence>
      <motion.div className="modal-overlay" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="modal-box" onClick={e => e.stopPropagation()}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.97 }}
          transition={{ duration: 0.22 }}
        >
          <button className="modal-close" onClick={onClose}><X size={16} /></button>

          <div className="modal-status-row">
            <span className={`rule-status-badge ${meta.cls}`}>
              <StatusIcon size={11} /> {meta.label}
            </span>
            {r.level && <span style={{ fontSize:11, color:'rgba(0,0,0,0.35)', fontWeight:800 }}>{r.level.toUpperCase()}</span>}
          </div>

          <div className="modal-title">{r.title}</div>
          {r.key_value && <div className="modal-key-value">{r.key_value}</div>}

          <div className="modal-section-label">{isSpanish ? 'Requisito' : 'Requirement'}</div>
          <div className="modal-requirement">{isSpanish ? translatedReq : r.requirement}</div>

          {r.quoted_span && <>
            <div className="modal-section-label">{isSpanish ? 'Texto Fuente Exacto' : 'Exact Source Text'}</div>
            <div className="modal-quote">{r.quoted_span}</div>
          </>}

          <div className="modal-section-label">{isSpanish ? 'Veredicto del Motor' : 'Engine Verdict'}</div>
          <div className="modal-reason">{rule.reason}</div>

          {r.coverage_conditions && <>
            <div className="modal-section-label">{isSpanish ? 'Condiciones de Cobertura' : 'Coverage Conditions'}</div>
            <div className="modal-reason">{r.coverage_conditions}</div>
          </>}

          {r.exemptions && <>
            <div className="modal-section-label">{isSpanish ? 'Exenciones' : 'Exemptions'}</div>
            <div className="modal-reason">{r.exemptions}</div>
          </>}

          {rule.conflict_flag && rule.conflict_note && <>
            <div className="modal-section-label">{isSpanish ? '⚠ Nota de Conflicto' : '⚠ Conflict Note'}</div>
            <div className="modal-conflict-box">{rule.conflict_note}</div>
          </>}

          <div className="modal-section-label">{isSpanish ? 'Citación y Fuente' : 'Citation & Source'}</div>
          <div style={{ fontSize:13, color:'#9ca3af', marginBottom:6, fontWeight:600 }}>{r.citation}</div>
          {r.source_url && (
            <a className="modal-source-link" href={r.source_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={13} /> {isSpanish ? 'Ver Fuente Original' : 'View Original Source'}
            </a>
          )}

          <div className="modal-legal-footer">
            <Shield size={13} style={{ color:'#00D4AA', flexShrink:0 }} />
            <span>
              {isSpanish 
                ? 'Solo informativo — no es asesoría legal. Cada veredicto cita el texto fuente y separa la ley promulgada de la pendiente.'
                : 'Informational only — not legal advice. Every verdict cites the source text and separates enacted from pending law.'}
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Rule Card ─────────────────────────────────────────────── */
function RuleCard({ item, onClick, isSpanish }) {
  const meta = getStatusMeta(item.status, isSpanish);
  const StatusIcon = meta.icon;
  const r = item.rule;

  const [tTitle, setTTitle] = useState('');
  const [tReq, setTReq] = useState('');

  useEffect(() => {
    if (isSpanish && !tTitle) {
      setTTitle('Traduciendo...');
      setTReq('Traduciendo requerimiento con IA...');
      
      const textToTranslate = `Título: ${r.title}\n\nRequisito: ${r.requirement}`;
      
      fetch(`${API}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToTranslate })
      })
      .then(res => res.json())
      .then(data => {
        const span = data.spanish_text || '';
        if (span.toLowerCase().includes('requisito:')) {
          const parts = span.split(/requisito:/i);
          setTTitle(parts[0].replace(/título:/i, '').trim());
          setTReq(parts[1].trim());
        } else {
          setTTitle(r.title); // fallback
          setTReq(span);
        }
      })
      .catch(err => {
        setTTitle(r.title);
        setTReq(r.requirement);
      });
    }
  }, [isSpanish, r.title, r.requirement, tTitle]);

  const displayTitle = isSpanish ? (tTitle || r.title) : r.title;
  const displayReq   = isSpanish ? (tReq || r.requirement) : r.requirement;
  const displayConflict = translateSystemText(item.conflict_note, isSpanish);
  const displayReason   = translateSystemText(item.reason, isSpanish);

  return (
    <motion.div
      className={`rule-card ${meta.cls}`}
      onClick={() => onClick(item)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      layout
    >
      <div className="rule-card-header">
        <div className="rule-title">{displayTitle}</div>
        <span className={`rule-status-badge ${meta.cls}`}>
          <StatusIcon size={10} /> {meta.label}
        </span>
      </div>

      {r.key_value && <div className="rule-key-value">{r.key_value}</div>}

      <div className="rule-requirement">{displayReq}</div>

      {item.status === 'unknown' && displayReason && (
        <div className="rule-unknown-prompt">⚠ {displayReason}</div>
      )}

      {item.conflict_flag && displayConflict && (
        <div className="conflict-banner">
          <AlertTriangle size={13} style={{ color:'#dc2626', flexShrink:0, marginTop:1 }} />
          <div className="conflict-banner-text">{displayConflict}</div>
        </div>
      )}

      <div className="rule-card-footer">
        <span className="rule-citation">{r.citation}</span>
        <button className="rule-source-btn" onClick={e => { e.stopPropagation(); onClick(item); }}>
          {isSpanish ? 'Trazabilidad' : 'Audit trace'} <ChevronRight size={11} />
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Changes View ──────────────────────────────────────────── */
function ChangesView({ asOfDate, isSpanish }) {
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/changes`)
      .then(res => res.json())
      .then(data => {
        setChanges(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching changes:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="changes-container">Loading...</div>;

  return (
    <div className="changes-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <div className="changes-title">{isSpanish ? 'Cambios de Ley Próximos y Recientes (T1-T6)' : 'Upcoming & Recent Law Changes (T1-T6)'}</div>
        <div className="changes-subtitle">
          {isSpanish 
            ? `Leyes promulgadas y propuestas pendientes en 9 ciudades — a partir del ${asOfDate}. Los elementos pendientes aún no son ley y se indican claramente.`
            : `Live Change Tracking results evaluating all 500 addresses against upcoming rules.`}
        </div>

        <div style={{ margin: '2rem 0', width: '100%' }}>
          <UpcomingChangesMap />
        </div>

        <div className="changes-list">
          {changes.map((c, i) => (
            <motion.div
              key={c.id}
              className={`change-card ${c.status}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <div className="change-card-row">
                <div>
                  <div className="change-card-title">{c.id}: {c.title}</div>
                  <div style={{ fontSize:11, color:'#9ca3af', marginBottom:6, fontWeight:700 }}>{c.jurisdiction}</div>
                  <div className="change-card-desc">{c.desc}</div>
                </div>
                <span className={`change-card-date ${c.status}`}>
                  {c.status === 'enacted' ? (isSpanish ? '✓ Promulgada' : '✓ Enacted') : (isSpanish ? '⏳ Pendiente' : '⏳ Pending')} — {c.date}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Dashboard ────────────────────────────────────────── */
export default function ResultsDashboard({ selection, onBack }) {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [activeRule, setActiveRule] = useState(null);
  const [isSpanish, setIsSpanish] = useState(false);
  const [yearBuilt, setYearBuilt] = useState('');
  const [units, setUnits]         = useState('');
  const [asOfDate, setAsOfDate]   = useState(selection?.asOfDate || '2026-10-01');
  const isChangesView             = selection?.view === 'changes';

  const fetchData = useCallback(async () => {
    if (isChangesView || !selection?.id) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      let url = `${API}/lookup/${selection.id}?`;
      if (yearBuilt) url += `year_built=${yearBuilt}&`;
      if (units) url += `units=${units}&`;
      if (asOfDate) url += `as_of=${asOfDate}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selection?.id, isChangesView, yearBuilt, units, asOfDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* Summary counts */
  const summaryCounts = { applies: 0, exempt: 0, unknown: 0, pending: 0 };
  if (data?.rules_by_category) {
    Object.values(data.rules_by_category).flat().forEach(item => {
      const k = item.status === 'not_yet_effective' ? 'pending' : (item.status === 'not_applicable' ? 'exempt' : item.status);
      if (k in summaryCounts) summaryCounts[k]++;
    });
  }

  const displayAddress = selection?.label || data?.street_address || '—';
  const displayDate    = selection?.asOfDate || data?.as_of_date || '—';

  return (
    <div className="results-root">
      {/* ── Top Bar ── */}
      <div className="results-topbar">
        <div className="topbar-logo" onClick={onBack}>
          Nav<span className="teal">AI</span>gator
        </div>

        {!isChangesView && (
          <div className="topbar-address">
            <div className="topbar-address-pill">
              <MapPin size={13} />
              <span>{displayAddress}</span>
            </div>
            <span className="topbar-date">{isSpanish ? 'A partir del' : 'As of'} {displayDate}</span>
          </div>
        )}

        <div className="topbar-right">
          <button className="topbar-back" onClick={onBack}>
            <ArrowLeft size={13} /> {isSpanish ? 'Nueva Búsqueda' : 'New Search'}
          </button>
          <button className="topbar-lang" onClick={() => setIsSpanish(s => !s)}>
            <Globe size={13} /> {isSpanish ? 'English' : 'Español'}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="results-body">

        {/* Sidebar */}
        {!isChangesView && (
          <aside className="results-sidebar">
            {/* Address */}
            <div className="sidebar-section">
              <div className="sidebar-label">{isSpanish ? 'Dirección' : 'Address'}</div>
              <div className="sidebar-card">
                <div className="sidebar-address-text">{displayAddress}</div>
                <div className="sidebar-city-state">{data?.legal_city}, {data?.state}</div>
              </div>
            </div>

            {/* Building Facts */}
            <div className="sidebar-section">
              <div className="sidebar-label">{isSpanish ? 'Datos del Edificio' : 'Building Facts'}</div>
              <div className="sidebar-card">
                {/* Year Built */}
                <div className="sidebar-fact-row">
                  <span className="sidebar-fact-key">{isSpanish ? 'Año de Constr.' : 'Year Built'}</span>
                  <input
                    className="sidebar-fact-input"
                    type="number"
                    placeholder={data?.year_built || (isSpanish ? 'Desc.' : 'Unknown')}
                    value={yearBuilt}
                    onChange={e => setYearBuilt(e.target.value)}
                  />
                </div>
                {/* Units */}
                <div className="sidebar-fact-row">
                  <span className="sidebar-fact-key">{isSpanish ? 'Unidades' : 'Units'}</span>
                  <input
                    className="sidebar-fact-input"
                    type="number"
                    placeholder={data?.units || (isSpanish ? 'Desc.' : 'Unknown')}
                    value={units}
                    onChange={e => setUnits(e.target.value)}
                  />
                </div>
                <div className="sidebar-fact-row">
                  <span className="sidebar-fact-key">{isSpanish ? 'Fecha Efectiva' : 'As Of Date'}</span>
                  <input
                    className="sidebar-fact-input"
                    type="date"
                    value={asOfDate}
                    onChange={e => setAsOfDate(e.target.value)}
                  />
                </div>
                <div className="sidebar-fact-row">
                  <span className="sidebar-fact-key">{isSpanish ? 'Estado' : 'State'}</span>
                  <span className="sidebar-fact-val">{data?.state || selection?.state || '—'}</span>
                </div>
                <div className="sidebar-fact-row">
                  <span className="sidebar-fact-key">{isSpanish ? 'Base de Datos' : 'Match'}</span>
                  <span className="sidebar-fact-val" style={{ color: data?.match_status === 'match' ? '#22c55e' : '#f59e0b' }}>
                    {data?.match_status || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Summary */}
            {!loading && !error && (
              <div className="sidebar-section">
                <div className="sidebar-label">{isSpanish ? 'Resumen de Reglas' : 'Rule Summary'}</div>
                <div className="sidebar-summary">
                  <div className="summary-chip green">
                    <span className="summary-chip-label"><CheckCircle size={13}/> {isSpanish ? 'Aplica' : 'Applies'}</span>
                    <span className="summary-chip-count">{summaryCounts.applies}</span>
                  </div>
                  <div className="summary-chip yellow">
                    <span className="summary-chip-label"><HelpCircle size={13}/> {isSpanish ? 'Desc.' : 'Unknown'}</span>
                    <span className="summary-chip-count">{summaryCounts.unknown}</span>
                  </div>
                  <div className="summary-chip red">
                    <span className="summary-chip-label"><Shield size={13}/> {isSpanish ? 'Exento' : 'Exempt'}</span>
                    <span className="summary-chip-count">{summaryCounts.exempt}</span>
                  </div>
                  <div className="summary-chip gray">
                    <span className="summary-chip-label"><Clock size={13}/> {isSpanish ? 'Pendiente' : 'Upcoming'}</span>
                    <span className="summary-chip-count">{summaryCounts.pending}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="sidebar-legal">
              {isSpanish 
                ? 'Solo informativo — no es asesoría legal. Cada respuesta cita el texto fuente y separa la ley promulgada de la pendiente.'
                : 'Informational only — not legal advice. Every answer cites the source text and separates enacted from pending law.'}
            </div>
          </aside>
        )}

        {/* Main */}
        <main className="results-main">
          {isChangesView ? (
            <ChangesView asOfDate={displayDate} isSpanish={isSpanish} />
          ) : loading ? (
            <div className="results-loading">
              <div className="loading-spinner" />
              <div className="loading-text">{isSpanish ? 'Cargando reglas para' : 'Loading rules for'} {displayAddress}…</div>
            </div>
          ) : error ? (
            <div className="results-error">
              <h3>{isSpanish ? 'No se pudieron cargar las reglas' : 'Could not load rules'}</h3>
              <p>{error}</p>
              <button
                style={{ marginTop:12, background:'#00D4AA', color:'#fff', border:'none', borderRadius:50, padding:'10px 28px', fontFamily:'Urbanist', fontWeight:800, fontSize:14, cursor:'pointer', boxShadow:'0 4px 16px rgba(0,212,170,0.3)' }}
                onClick={fetchData}
              >{isSpanish ? 'Reintentar' : 'Retry'}</button>
            </div>
          ) : data?.rules_by_category ? (
            Object.entries(data.rules_by_category).map(([cat, items]) => (
              <motion.div key={cat} className="category-group"
                initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.3 }}>
                <div className="category-title">
                  {getCategoryLabel(cat, isSpanish)}
                </div>
                <div className="rules-grid">
                  {items.map((item, i) => (
                    <RuleCard key={`${item.rule.team_rule_id || i}`} item={item} onClick={setActiveRule} isSpanish={isSpanish} />
                  ))}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="results-error">
              <h3>{isSpanish ? 'No se encontraron reglas' : 'No rules found'}</h3>
              <p>{isSpanish ? 'No hay datos de reglas disponibles para esta dirección.' : 'No rule data available for this address.'}</p>
            </div>
          )}
        </main>
      </div>

      {/* Audit Modal */}
      {activeRule && (
        <AuditModal rule={activeRule} onClose={() => setActiveRule(null)} isSpanish={isSpanish} />
      )}
    </div>
  );
}
