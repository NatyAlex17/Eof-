'use client';

import { useState } from 'react';
import Nav from '../components/Nav';

type TierKey = 'T1' | 'T2' | 'T3';

interface SpeciesRow {
  id: string;
  code: string;
  species: string;
  grade: string;
  basePrice: number; // $/lb
  // explicit per-tier price — beats the multiplier when set
  overrides: Partial<Record<TierKey, number>>;
  availableLb: number;
  incomingLb: number;
  boxes: number;
}

const TIERS: { key: TierKey; label: string; sub: string; mult: number }[] = [
  { key: 'T1', label: 'Tier 1', sub: 'Premium · 0.95×', mult: 0.95 },
  { key: 'T2', label: 'Tier 2', sub: 'Standard · 1.00×', mult: 1.0 },
  { key: 'T3', label: 'Tier 3', sub: 'COD · 1.08×', mult: 1.08 },
];

const SEED: SpeciesRow[] = [
  {
    id: 's1',
    code: 'AHI-A+',
    species: 'Ahi Tuna',
    grade: 'A+',
    basePrice: 28.5,
    overrides: {},
    availableLb: 81.5,
    incomingLb: 120,
    boxes: 2,
  },
  {
    id: 's2',
    code: 'AHI-A',
    species: 'Ahi Tuna',
    grade: 'A',
    basePrice: 26.0,
    overrides: {},
    availableLb: 10.0,
    incomingLb: 0,
    boxes: 1,
  },
  {
    id: 's3',
    code: 'ONO-A',
    species: 'Ono',
    grade: 'A',
    basePrice: 22.0,
    overrides: { T3: 25.0 },
    availableLb: 36.0,
    incomingLb: 40,
    boxes: 2,
  },
  {
    id: 's4',
    code: 'SAL-A',
    species: 'Salmon',
    grade: 'A',
    basePrice: 16.5,
    overrides: {},
    availableLb: 97.4,
    incomingLb: 0,
    boxes: 3,
  },
  {
    id: 's5',
    code: 'HAM-A+',
    species: 'Hamachi',
    grade: 'A+',
    basePrice: 26.0,
    overrides: {},
    availableLb: 4.0,
    incomingLb: 0,
    boxes: 1,
  },
  {
    id: 's6',
    code: 'KAN-A',
    species: 'Kanpachi',
    grade: 'A',
    basePrice: 24.0,
    overrides: {},
    availableLb: 0,
    incomingLb: 0,
    boxes: 0,
  },
  {
    id: 's7',
    code: 'MAHI-A',
    species: 'Mahi-Mahi',
    grade: 'A',
    basePrice: 18.0,
    overrides: {},
    availableLb: 0,
    incomingLb: 65,
    boxes: 0,
  },
];

const money = (n: number) => '$' + n.toFixed(2);

const round2 = (n: number) => Math.round(n * 100) / 100;

export default function PriceSheetPage() {
  const [rows, setRows] = useState<SpeciesRow[]>(SEED);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<{ rowId: string; col: 'base' | TierKey } | null>(null);
  const [draft, setDraft] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    code: '',
    species: '',
    grade: 'A',
    basePrice: '',
    availableLb: '',
    incomingLb: '',
  });

  const priceFor = (r: SpeciesRow, t: TierKey) => {
    const ov = r.overrides[t];
    if (ov !== undefined) return { price: ov, isOverride: true };
    const mult = TIERS.find((x) => x.key === t)!.mult;
    return { price: round2(r.basePrice * mult), isOverride: false };
  };

  const startEdit = (rowId: string, col: 'base' | TierKey, current: number) => {
    setEditing({ rowId, col });
    setDraft(current.toFixed(2));
  };

  const commitEdit = () => {
    if (!editing) return;
    const v = round2(parseFloat(draft));
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== editing.rowId) return r;
        if (!(v > 0)) return r; // ignore invalid input
        if (editing.col === 'base') return { ...r, basePrice: v };
        return { ...r, overrides: { ...r.overrides, [editing.col]: v } };
      })
    );
    setEditing(null);
  };

  const clearOverride = (rowId: string, t: TierKey) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const next = { ...r.overrides };
        delete next[t];
        return { ...r, overrides: next };
      })
    );
  };

  const canAdd = form.code.trim() && form.species.trim() && parseFloat(form.basePrice) > 0;

  const addSpecies = () => {
    if (!canAdd) return;
    const row: SpeciesRow = {
      id: 's' + Date.now(),
      code: form.code.trim().toUpperCase(),
      species: form.species.trim(),
      grade: form.grade.trim() || '—',
      basePrice: round2(parseFloat(form.basePrice)),
      overrides: {},
      availableLb: round2(parseFloat(form.availableLb) || 0),
      incomingLb: round2(parseFloat(form.incomingLb) || 0),
      boxes: 0,
    };
    setRows((prev) => [...prev, row]);
    setForm({ code: '', species: '', grade: 'A', basePrice: '', availableLb: '', incomingLb: '' });
    setAddOpen(false);
  };

  const availMeta = (r: SpeciesRow) => {
    if (r.availableLb <= 0 && r.incomingLb > 0)
      return { label: 'Incoming only', color: '#8A5A14', bg: '#F4EEE2', dot: '#B7791F' };
    if (r.availableLb <= 0)
      return { label: 'Out', color: '#A5362C', bg: '#FBF0EF', dot: '#C2453A' };
    if (r.availableLb < 25)
      return { label: 'Low', color: '#8A5A14', bg: '#F4EEE2', dot: '#B7791F' };
    return { label: 'In stock', color: '#2E6347', bg: '#EAF1ED', dot: '#3F7D5B' };
  };

  const filtered = rows.filter(
    (r) =>
      !query.trim() ||
      r.species.toLowerCase().includes(query.toLowerCase()) ||
      r.code.toLowerCase().includes(query.toLowerCase())
  );

  const totalAvailable = rows.reduce((a, r) => a + r.availableLb, 0);
  const totalIncoming = rows.reduce((a, r) => a + r.incomingLb, 0);
  const lowCount = rows.filter((r) => r.availableLb > 0 && r.availableLb < 25).length;
  const outCount = rows.filter((r) => r.availableLb <= 0).length;

  const inputStyle: React.CSSProperties = {
    fontFamily: "'Archivo', sans-serif",
    fontSize: '13px',
    border: '1px solid #D6DCE0',
    borderRadius: '5px',
    padding: '9px 12px',
    width: '100%',
    boxSizing: 'border-box',
    color: '#222A30',
    background: '#fff',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#8A99A3',
    display: 'block',
    marginBottom: '6px',
  };

  const cellInput: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '13px',
    fontWeight: 600,
    width: '76px',
    padding: '5px 7px',
    border: '1.5px solid #3F6F86',
    borderRadius: '4px',
    outline: 'none',
    textAlign: 'right',
    background: '#fff',
  };

  const grid = '92px 1fr 150px 110px 110px 110px 110px';

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        background: '#F4F5F6',
        fontFamily: "'Archivo', sans-serif",
        color: '#222A30',
        WebkitFontSmoothing: 'antialiased',
        overflow: 'hidden',
      }}
    >
      <div className="no-print" style={{ display: 'flex', flex: 'none' }}>
        <Nav />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        {/* HEADER */}
        <header
          style={{
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            padding: '0 28px',
            height: '58px',
            borderBottom: '1px solid #E2E6E9',
            background: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              Price Sheet
            </span>
            <span style={{ fontSize: '12px', color: '#8A99A3' }}>
              One source of truth · quotes use this page
            </span>
          </div>
          <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search species or SKU…"
              style={{
                fontFamily: "'Archivo', sans-serif",
                fontSize: '13px',
                border: '1px solid #D6DCE0',
                borderRadius: '5px',
                padding: '8px 12px',
                width: '210px',
                outline: 'none',
                background: '#fff',
              }}
            />
            <button
              onClick={() => window.print()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                fontFamily: "'Archivo', sans-serif",
                fontSize: '13px',
                fontWeight: 600,
                background: '#fff',
                color: '#5A6670',
                border: '1px solid #D6DCE0',
                borderRadius: '5px',
                padding: '9px 14px',
                cursor: 'pointer',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9V2h12v7" />
                <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print
            </button>
            <button
              onClick={() => setAddOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                fontFamily: "'Archivo', sans-serif",
                fontSize: '13px',
                fontWeight: 600,
                background: '#222A30',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                padding: '9px 15px',
                cursor: 'pointer',
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add species
            </button>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px' }}>
          {/* SUMMARY STRIP — what is left, at a glance */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4,1fr)',
              gap: '14px',
              marginBottom: '20px',
              maxWidth: '1100px',
            }}
          >
            {[
              {
                label: 'SPECIES LISTED',
                value: String(rows.length),
                sub: 'on the current sheet',
                accent: '#222A30',
                border: '#3F6F86',
              },
              {
                label: 'AVAILABLE NOW',
                value: totalAvailable.toFixed(1) + ' lb',
                sub: 'unallocated in warehouses',
                accent: '#2E6347',
                border: '#3F7D5B',
              },
              {
                label: 'INCOMING',
                value: totalIncoming.toFixed(1) + ' lb',
                sub: 'in the air · sellable ahead',
                accent: '#8A5A14',
                border: '#B7791F',
              },
              {
                label: 'LOW / OUT',
                value: `${lowCount} / ${outCount}`,
                sub: 'species needing a buy',
                accent: '#A5362C',
                border: '#C2453A',
              },
            ].map((k) => (
              <div
                key={k.label}
                style={{
                  background: '#fff',
                  border: '1px solid #E2E6E9',
                  borderLeft: `3px solid ${k.border}`,
                  borderRadius: '8px',
                  padding: '16px 18px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    color: '#8A99A3',
                  }}
                >
                  {k.label}
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '24px',
                    fontWeight: 600,
                    color: k.accent,
                    marginTop: '8px',
                  }}
                >
                  {k.value}
                </div>
                <div style={{ fontSize: '12px', color: '#5A6670', marginTop: '4px' }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* PRICE GRID */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #E2E6E9',
              borderRadius: '8px',
              overflow: 'hidden',
              maxWidth: '1100px',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: grid,
                padding: '11px 18px',
                background: '#FAFBFB',
                borderBottom: '1px solid #E2E6E9',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.07em',
                color: '#8A99A3',
              }}
            >
              <span>SKU</span>
              <span>SPECIES · GRADE</span>
              <span>WHAT&apos;S LEFT</span>
              <span style={{ textAlign: 'right' }}>BASE $/LB</span>
              {TIERS.map((t) => (
                <span key={t.key} style={{ textAlign: 'right' }}>
                  {t.label.toUpperCase()}
                  <span
                    style={{
                      display: 'block',
                      fontWeight: 500,
                      letterSpacing: 0,
                      textTransform: 'none',
                      color: '#B6BEC4',
                    }}
                  >
                    {t.sub}
                  </span>
                </span>
              ))}
            </div>

            {filtered.map((r) => {
              const am = availMeta(r);
              return (
                <div
                  key={r.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: grid,
                    alignItems: 'center',
                    padding: '12px 18px',
                    borderBottom: '1px solid #EDEFF1',
                    borderLeft: `3px solid ${am.dot}`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {r.code}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>{r.species}</span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: '#5A6670',
                        border: '1px solid #D6DCE0',
                        borderRadius: '2px',
                        padding: '1px 5px',
                        marginLeft: '8px',
                      }}
                    >
                      {r.grade}
                    </span>
                  </span>

                  {/* WHAT'S LEFT */}
                  <span>
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '14px',
                          fontWeight: 600,
                        }}
                      >
                        {r.availableLb.toFixed(1)}
                        <span style={{ fontSize: '10px', color: '#8A99A3', fontWeight: 500 }}>
                          {' '}
                          lb
                        </span>
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: am.color,
                          background: am.bg,
                          borderRadius: '3px',
                          padding: '2px 7px',
                        }}
                      >
                        <span
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            background: am.dot,
                          }}
                        />
                        {am.label}
                      </span>
                    </span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '10px',
                        color: '#8A99A3',
                        marginTop: '3px',
                      }}
                    >
                      {r.boxes > 0 ? `${r.boxes} box${r.boxes === 1 ? '' : 'es'}` : 'no boxes'}
                      {r.incomingLb > 0 ? ` · +${r.incomingLb.toFixed(0)} lb incoming` : ''}
                    </span>
                  </span>

                  {/* BASE PRICE — click to edit */}
                  <span style={{ textAlign: 'right' }}>
                    {editing?.rowId === r.id && editing.col === 'base' ? (
                      <input
                        autoFocus
                        type="number"
                        step="0.01"
                        min="0"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEdit();
                          if (e.key === 'Escape') setEditing(null);
                        }}
                        style={cellInput}
                      />
                    ) : (
                      <button
                        onClick={() => startEdit(r.id, 'base', r.basePrice)}
                        title="Click to edit base price"
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '14px',
                          fontWeight: 700,
                          background: 'none',
                          border: 'none',
                          borderBottom: '1px dashed #C2CAD0',
                          padding: '2px 0',
                          cursor: 'pointer',
                          color: '#222A30',
                        }}
                      >
                        {money(r.basePrice)}
                      </button>
                    )}
                  </span>

                  {/* TIER PRICES — computed from multiplier, or per-species override */}
                  {TIERS.map((t) => {
                    const { price, isOverride } = priceFor(r, t.key);
                    const isEditing = editing?.rowId === r.id && editing.col === t.key;
                    return (
                      <span key={t.key} style={{ textAlign: 'right' }}>
                        {isEditing ? (
                          <input
                            autoFocus
                            type="number"
                            step="0.01"
                            min="0"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEdit();
                              if (e.key === 'Escape') setEditing(null);
                            }}
                            style={cellInput}
                          />
                        ) : (
                          <span
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                          >
                            {isOverride && (
                              <button
                                className="no-print"
                                onClick={() => clearOverride(r.id, t.key)}
                                title="Remove species price — go back to tier multiplier"
                                style={{
                                  width: '15px',
                                  height: '15px',
                                  borderRadius: '3px',
                                  border: '1px solid #C5D8E2',
                                  background: '#EEF3F6',
                                  color: '#3F6F86',
                                  fontSize: '10px',
                                  lineHeight: 1,
                                  cursor: 'pointer',
                                  padding: 0,
                                }}
                              >
                                ×
                              </button>
                            )}
                            <button
                              onClick={() => startEdit(r.id, t.key, price)}
                              title={
                                isOverride
                                  ? 'Species-specific price for this tier — click to edit'
                                  : `Auto: base × ${t.mult.toFixed(2)} — click to set a species-specific price`
                              }
                              style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: '13px',
                                fontWeight: isOverride ? 700 : 500,
                                color: isOverride ? '#2D5365' : '#5A6670',
                                background: isOverride ? '#EEF3F6' : 'none',
                                border: isOverride ? '1px solid #C5D8E2' : 'none',
                                borderRadius: '4px',
                                padding: isOverride ? '3px 8px' : '3px 0',
                                cursor: 'pointer',
                              }}
                            >
                              {money(price)}
                            </button>
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div
                style={{
                  padding: '28px 18px',
                  textAlign: 'center',
                  fontSize: '13px',
                  color: '#8A99A3',
                }}
              >
                No species match &quot;{query}&quot;.
              </div>
            )}
          </div>

          <div
            className="no-print"
            style={{ fontSize: '11px', color: '#8A99A3', marginTop: '12px', maxWidth: '1100px' }}
          >
            Tier prices are computed from the base price × tier multiplier. Click any tier cell to
            set a <span style={{ fontWeight: 600, color: '#2D5365' }}>species-specific price</span>{' '}
            for that tier (shown highlighted); click × to return to the multiplier.
            Customer-specific overrides still win at order time (Customers page).
          </div>
        </div>
      </div>

      {/* ADD SPECIES MODAL */}
      {addOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(34,42,48,0.40)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
          }}
          onClick={() => setAddOpen(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '10px',
              padding: '26px',
              width: '440px',
              maxWidth: '94vw',
              boxShadow: '0 16px 48px rgba(34,42,48,0.22)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                marginBottom: '4px',
              }}
            >
              Add species to the price sheet
            </div>
            <div style={{ fontSize: '12px', color: '#8A99A3', marginBottom: '18px' }}>
              Tier prices start from base × multiplier — you can set species-specific tier prices
              after adding.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>SPECIES *</label>
                <input
                  style={inputStyle}
                  placeholder="Swordfish"
                  value={form.species}
                  onChange={(e) => setForm((f) => ({ ...f, species: e.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>GRADE</label>
                <input
                  style={inputStyle}
                  placeholder="A"
                  value={form.grade}
                  onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>SKU CODE *</label>
                <input
                  style={{
                    ...inputStyle,
                    fontFamily: "'IBM Plex Mono', monospace",
                    textTransform: 'uppercase',
                  }}
                  placeholder="SWD-A"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>BASE PRICE $/LB *</label>
                <input
                  style={{ ...inputStyle, fontFamily: "'IBM Plex Mono', monospace" }}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="21.50"
                  value={form.basePrice}
                  onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>AVAILABLE LB (optional)</label>
                <input
                  style={{ ...inputStyle, fontFamily: "'IBM Plex Mono', monospace" }}
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0"
                  value={form.availableLb}
                  onChange={(e) => setForm((f) => ({ ...f, availableLb: e.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>INCOMING LB (optional)</label>
                <input
                  style={{ ...inputStyle, fontFamily: "'IBM Plex Mono', monospace" }}
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0"
                  value={form.incomingLb}
                  onChange={(e) => setForm((f) => ({ ...f, incomingLb: e.target.value }))}
                />
              </div>
            </div>

            {/* live tier preview */}
            {parseFloat(form.basePrice) > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  marginTop: '16px',
                  background: '#F4F5F6',
                  border: '1px solid #E2E6E9',
                  borderRadius: '6px',
                  padding: '12px 14px',
                }}
              >
                {TIERS.map((t) => (
                  <div key={t.key} style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        color: '#8A99A3',
                      }}
                    >
                      {t.label.toUpperCase()}
                    </div>
                    <div
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '15px',
                        fontWeight: 600,
                        marginTop: '3px',
                      }}
                    >
                      {money(round2(parseFloat(form.basePrice) * t.mult))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '20px',
              }}
            >
              <button
                onClick={() => setAddOpen(false)}
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: '13px',
                  fontWeight: 600,
                  background: '#fff',
                  color: '#5A6670',
                  border: '1px solid #D6DCE0',
                  borderRadius: '5px',
                  padding: '10px 16px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={addSpecies}
                disabled={!canAdd}
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: '13px',
                  fontWeight: 600,
                  background: canAdd ? '#222A30' : '#E2E6E9',
                  color: canAdd ? '#fff' : '#A6AEB4',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '10px 18px',
                  cursor: canAdd ? 'pointer' : 'default',
                }}
              >
                Add to sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
