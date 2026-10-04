import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, ArrowLeft, Globe, X, ExternalLink,
  AlertTriangle, CheckCircle, HelpCircle, Clock,
  ChevronRight, Shield
} from 'lucide-react';
import './ResultsDashboard.css';

const API = 'http://127.0.0.1:8000/api';

/* ─── Helpers ──────────────────────────────────────────────── */
const STATUS_META = {
  applies:           { label: 'Applies',     icon: CheckCircle,    cls: 'applies',  summary: 'green' },
  exempt:            { label: 'Exempt',      icon: Shield,         cls: 'exempt',   summary: 'red'   },
  unknown:           { label: 'Unknown',     icon: HelpCircle,     cls: 'unknown',  summary: 'yellow'},
  not_yet_effective: { label: 'Upcoming',    icon: Clock,          cls: 'pending',  summary: 'gray'  },
  not_applicable:    { label: 'N/A',         icon: Shield,         cls: 'exempt',   summary: 'red'   },
};
const getStatus = (s) => STATUS_META[s] || STATUS_META.applies;

const CATEGORY_LABELS = {
  rent_increase_limits:      'Rent Increase Limits',
  just_cause_eviction:       'Just Cause for Eviction',
  relocation_assistance:     'Relocation Assistance',
  notice_requirements:       'Notice Requirements',
  security_deposits:         'Security Deposits',
  habitability:              'Habitability Standards',
  anti_harassment:           'Anti-Harassment',
  other:                     'Other Protections',
};

const CHANGES_MOCK = [
  { id:'c1', title:'AB 1482 CPI Adjustment 2025–2026', status:'enacted', date:'2025-08-01', jurisdiction:'CA (Statewide)', desc:'New CPI figure sets the maximum rent increase ceiling at 8.2% for the August 2025 – July 2026 period.' },
  { id:'c2', title:'Los Angeles Tenant Anti-Harassment Ordinance', status:'enacted', date:'2025-01-01', jurisdiction:'Los Angeles, CA', desc:'Expands anti-harassment protections to include unlawful removal of appliances and repeated unnecessary inspections.' },
  { id:'c3', title:'NJ FAIR Act — Statewide Preemption Ruling (Pending)', status:'pending', date:'TBD', jurisdiction:'New Jersey', desc:'NJ Supreme Court review could preempt local bans in Hoboken and Jersey City. Status unknown; local bans remain effective until ruling.' },
  { id:'c4', title:'Boston Just-Cause Eviction Proposal', status:'pending', date:'2026 Legislative Session', jurisdiction:'Boston, MA', desc:'Proposed ordinance would require documented just cause for all non-renewal terminations. Has not yet passed city council.' },
  { id:'c5', title:'Cambridge Rent Stabilization Ordinance', status:'enacted', date:'2023-10-01', jurisdiction:'Cambridge, MA', desc:'Caps rent increases to 10% or the Boston-Cambridge CPI, whichever is lower, for units built before 1995 with 6+ units.' },
];

/* ─── Audit Modal ───────────────────────────────────────────── */
function AuditModal({ rule, onClose, isSpanish }) {
  const meta = getStatus(rule.status);
  const StatusIcon = meta.icon;
  const r = rule.rule;

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
            {r.level && <span style={{ fontSize:11, color:'rgba(255,255,255,0.35)', fontWeight:700 }}>{r.level.toUpperCase()}</span>}
          </div>

          <div className="modal-title">{r.title}</div>
          {r.key_value && <div className="modal-key-value">{r.key_value}</div>}

          <div className="modal-section-label">Requirement</div>
          <div className="modal-requirement">{r.requirement}</div>

          {r.quoted_span && <>
            <div className="modal-section-label">Exact Source Text</div>
            <div className="modal-quote">{r.quoted_span}</div>
          </>}

          <div className="modal-section-label">Engine Verdict</div>
          <div className="modal-reason">{rule.reason}</div>

          {r.coverage_conditions && <>
            <div className="modal-section-label">Coverage Conditions</div>
            <div className="modal-reason">{r.coverage_conditions}</div>
          </>}

          {r.exemptions && <>
            <div className="modal-section-label">Exemptions</div>
            <div className="modal-reason">{r.exemptions}</div>
          </>}

          {rule.conflict_flag && rule.conflict_note && <>
            <div className="modal-section-label">⚠ Conflict Note</div>
            <div className="modal-conflict-box">{rule.conflict_note}</div>
          </>}

          <div className="modal-section-label">Citation &amp; Source</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', marginBottom:6 }}>{r.citation}</div>
          {r.source_url && (
            <a className="modal-source-link" href={r.source_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={13} /> View Original Source
            </a>
          )}

          <div className="modal-legal-footer">
            <Shield size={13} style={{ color:'#00D4AA', flexShrink:0 }} />
            <span>
              Informational only — not legal advice. Every verdict cites the source text and separates enacted from pending law.
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Rule Card ─────────────────────────────────────────────── */
function RuleCard({ item, onClick }) {
  const meta = getStatus(item.status);
  const StatusIcon = meta.icon;
  const r = item.rule;

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
        <div className="rule-title">{r.title}</div>
        <span className={`rule-status-badge ${meta.cls}`}>
          <StatusIcon size={10} /> {meta.label}
        </span>
      </div>

      {r.key_value && <div className="rule-key-value">{r.key_value}</div>}

      <div className="rule-requirement">{r.requirement}</div>

      {item.status === 'unknown' && item.reason && (
        <div className="rule-unknown-prompt">⚠ {item.reason}</div>
      )}

      {item.conflict_flag && item.conflict_note && (
        <div className="conflict-banner">
          <AlertTriangle size={13} style={{ color:'#f87171', flexShrink:0, marginTop:1 }} />
          <div className="conflict-banner-text">{item.conflict_note}</div>
        </div>
      )}

      <div className="rule-card-footer">
        <span className="rule-citation">{r.citation}</span>
        <button className="rule-source-btn" onClick={e => { e.stopPropagation(); onClick(item); }}>
          Audit trace <ChevronRight size={11} />
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Changes View ──────────────────────────────────────────── */
function ChangesView({ asOfDate }) {
  return (
    <div className="changes-container">
      <div className="changes-title">Upcoming & Recent Law Changes</div>
      <div className="changes-subtitle">
        Enacted laws and pending proposals across all 9 cities — as of {asOfDate}.
        Pending items are not yet law and are flagged clearly.
      </div>
      {CHANGES_MOCK.map((c, i) => (
        <motion.div
          key={c.id}
          className={`change-card ${c.status}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
        >
          <div className="change-card-row">
            <div>
              <div className="change-card-title">{c.title}</div>
              <div style={{ fontSize:11, color:'#9ca3af', marginBottom:6, fontWeight:700 }}>{c.jurisdiction}</div>
              <div className="change-card-desc">{c.desc}</div>
            </div>
            <span className={`change-card-date ${c.status}`}>
              {c.status === 'enacted' ? '✓ Enacted' : '⏳ Pending'} — {c.date}
            </span>
          </div>
        </motion.div>
      ))}
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
  const isChangesView             = selection?.view === 'changes';

  const fetchData = useCallback(async () => {
    if (isChangesView || !selection?.id) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API}/lookup/${selection.id}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selection?.id, isChangesView]);

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
            <span className="topbar-date">As of {displayDate}</span>
          </div>
        )}

        <div className="topbar-right">
          <button className="topbar-back" onClick={onBack}>
            <ArrowLeft size={13} /> New Search
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
              <div className="sidebar-label">Address</div>
              <div className="sidebar-card">
                <div className="sidebar-address-text">{displayAddress}</div>
                <div className="sidebar-city-state">{data?.legal_city}, {data?.state}</div>
              </div>
            </div>

            {/* Building Facts */}
            <div className="sidebar-section">
              <div className="sidebar-label">Building Facts</div>
              <div className="sidebar-card">
                {/* Year Built */}
                <div className="sidebar-fact-row">
                  <span className="sidebar-fact-key">Year Built</span>
                  {yearBuilt
                    ? <span className="sidebar-fact-val">{yearBuilt}</span>
                    : <input
                        className="sidebar-fact-input"
                        type="number"
                        placeholder="Unknown"
                        value={yearBuilt}
                        onChange={e => setYearBuilt(e.target.value)}
                      />
                  }
                </div>
                {/* Units */}
                <div className="sidebar-fact-row">
                  <span className="sidebar-fact-key">Units</span>
                  {units
                    ? <span className="sidebar-fact-val">{units}</span>
                    : <input
                        className="sidebar-fact-input"
                        type="number"
                        placeholder="Unknown"
                        value={units}
                        onChange={e => setUnits(e.target.value)}
                      />
                  }
                </div>
                <div className="sidebar-fact-row">
                  <span className="sidebar-fact-key">State</span>
                  <span className="sidebar-fact-val">{data?.state || selection?.state || '—'}</span>
                </div>
                <div className="sidebar-fact-row">
                  <span className="sidebar-fact-key">Match</span>
                  <span className="sidebar-fact-val" style={{ color: data?.match_status === 'match' ? '#22c55e' : '#f59e0b' }}>
                    {data?.match_status || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Summary */}
            {!loading && !error && (
              <div className="sidebar-section">
                <div className="sidebar-label">Rule Summary</div>
                <div className="sidebar-summary">
                  <div className="summary-chip green">
                    <span className="summary-chip-label"><CheckCircle size={13}/> Applies</span>
                    <span className="summary-chip-count">{summaryCounts.applies}</span>
                  </div>
                  <div className="summary-chip yellow">
                    <span className="summary-chip-label"><HelpCircle size={13}/> Unknown</span>
                    <span className="summary-chip-count">{summaryCounts.unknown}</span>
                  </div>
                  <div className="summary-chip red">
                    <span className="summary-chip-label"><Shield size={13}/> Exempt</span>
                    <span className="summary-chip-count">{summaryCounts.exempt}</span>
                  </div>
                  <div className="summary-chip gray">
                    <span className="summary-chip-label"><Clock size={13}/> Upcoming</span>
                    <span className="summary-chip-count">{summaryCounts.pending}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="sidebar-legal">
              Informational only — not legal advice. Every answer cites the source text and separates enacted from pending law.
            </div>
          </aside>
        )}

        {/* Main */}
        <main className="results-main">
          {isChangesView ? (
            <ChangesView asOfDate={displayDate} />
          ) : loading ? (
            <div className="results-loading">
              <div className="loading-spinner" />
              <div className="loading-text">Loading rules for {displayAddress}…</div>
            </div>
          ) : error ? (
            <div className="results-error">
              <h3>Could not load rules</h3>
              <p>{error}</p>
              <button
                style={{ marginTop:12, background:'#00D4AA', color:'#fff', border:'none', borderRadius:50, padding:'10px 28px', fontFamily:'Urbanist', fontWeight:800, fontSize:14, cursor:'pointer', boxShadow:'0 4px 16px rgba(0,212,170,0.3)' }}
                onClick={fetchData}
              >Retry</button>
            </div>
          ) : data?.rules_by_category ? (
            Object.entries(data.rules_by_category).map(([cat, items]) => (
              <motion.div key={cat} className="category-group"
                initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.3 }}>
                <div className="category-title">
                  {CATEGORY_LABELS[cat] || cat.replace(/_/g,' ')}
                </div>
                <div className="rules-grid">
                  {items.map((item, i) => (
                    <RuleCard key={`${item.rule.team_rule_id || i}`} item={item} onClick={setActiveRule} />
                  ))}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="results-error">
              <h3>No rules found</h3>
              <p>No rule data available for this address.</p>
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
