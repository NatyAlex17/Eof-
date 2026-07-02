'use client';

import { useState, useEffect } from 'react';
import Nav from '../components/Nav';

interface Customer {
  tier: 'T1' | 'T2' | 'T3';
  carrier: string;
  terms: string;
}

interface LineItem {
  id: number;
  species: string;
  qty: number;
}

// Pricing tiers — single source of truth (mirrors pricing_tiers table)
const TIERS: Record<Customer['tier'], { label: string; mult: number }> = {
  T1: { label: 'Tier 1', mult: 0.95 },
  T2: { label: 'Tier 2', mult: 1.0 },
  T3: { label: 'Tier 3', mult: 1.08 },
};

const customers: Record<string, Customer> = {
  Nobu: { tier: 'T1', carrier: 'Air Cargo', terms: 'Net 15' },
  Morimoto: { tier: 'T1', carrier: 'Air Cargo', terms: 'Net 15' },
  "Roy's": { tier: 'T2', carrier: 'Ground', terms: 'Net 30' },
  "Alan Wong's": { tier: 'T2', carrier: 'Ground', terms: 'Net 30' },
  "Hy's Steakhouse": { tier: 'T2', carrier: 'Ground', terms: 'Net 30' },
  "Tiki's Grill": { tier: 'T3', carrier: 'Will Call', terms: 'COD' },
};

// SKU master — species base price per lb (mirrors skus table)
const SKUS: Record<string, { code: string; basePrice: number }> = {
  'Ahi Tuna': { code: 'AHI-A+', basePrice: 28.5 },
  Ono: { code: 'ONO-A', basePrice: 22.0 },
  Salmon: { code: 'SAL-A', basePrice: 16.5 },
  Hamachi: { code: 'HAM-A+', basePrice: 26.0 },
  Kanpachi: { code: 'KAN-A', basePrice: 24.0 },
};

// Customer-specific price overrides — beat tier pricing (mirrors price_overrides)
const PRICE_OVERRIDES: Record<string, Record<string, number>> = {
  Nobu: { 'Ahi Tuna': 24.5 },
  "Roy's": { Ono: 17.0 },
};

export default function OrderIntakePage() {
  const [customerQuery, setCustomerQuery] = useState('');
  const [customer, setCustomer] = useState<string | null>(null);
  const [lines, setLines] = useState<LineItem[]>([{ id: 1, species: 'Ahi Tuna', qty: 50 }]);
  const [seq, setSeq] = useState(2);
  const [shipDate, setShipDate] = useState('');
  const [today, setToday] = useState('');
  const [tomorrow, setTomorrow] = useState('');
  const [created, setCreated] = useState(false);
  const [createdTime, setCreatedTime] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [t0, setT0] = useState(Date.now());

  useEffect(() => {
    const iv = setInterval(() => {
      if (!created) {
        setElapsed(Math.floor((Date.now() - t0) / 1000));
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [created, t0]);

  // Seed ship-date defaults from the real calendar (on mount, to avoid SSR mismatch)
  useEffect(() => {
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const now = new Date();
    const tmr = new Date();
    tmr.setDate(now.getDate() + 1);
    setToday(iso(now));
    setTomorrow(iso(tmr));
    setShipDate(iso(now));
  }, []);

  const onCustomerInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    const exact = Object.keys(customers).find((n) => n.toLowerCase() === q.toLowerCase());
    setCustomerQuery(q);
    setCustomer(exact || (customer && q === customer ? customer : null));
  };

  const pickCustomer = (name: string) => {
    setCustomer(name);
    setCustomerQuery(name);
  };

  // --- Multi-species line handling ---
  const toggleSpecies = (s: string) => {
    setLines((prev) => {
      const exists = prev.find((l) => l.species === s);
      if (exists) return prev.filter((l) => l.species !== s);
      const next = [...prev, { id: seq, species: s, qty: 50 }];
      setSeq((n) => n + 1);
      return next;
    });
  };

  const removeLine = (id: number) => setLines((prev) => prev.filter((l) => l.id !== id));

  const setLineQty = (id: number, v: number) =>
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, qty: Math.max(0, Math.round(v)) } : l))
    );

  const adjustLineQty = (id: number, delta: number) =>
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, qty: Math.max(0, Math.round(l.qty + delta)) } : l))
    );

  const reset = () => {
    setT0(Date.now());
    setCustomerQuery('');
    setCustomer(null);
    setLines([{ id: seq, species: 'Ahi Tuna', qty: 50 }]);
    setSeq((n) => n + 1);
    setShipDate(today);
    setCreated(false);
    setElapsed(0);
  };

  const money = (n: number) =>
    '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatShip = (iso: string) => {
    if (!iso) return { label: '—', sub: '', full: '—' };
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const md = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    let label = dt.toLocaleDateString('en-US', { weekday: 'short' });
    if (iso === today) label = 'Today';
    else if (iso === tomorrow) label = 'Tomorrow';
    return { label, sub: md, full: `${label} · ${md}` };
  };

  const typedName = customerQuery.trim();
  const isNewCustomer = !customer && typedName.length > 0;
  const hasSelection = !!customer || isNewCustomer;
  const hasLines = lines.length > 0 && lines.some((l) => l.qty > 0);
  const canCreate = hasSelection && hasLines;
  const customerName = customer || typedName;
  const cust = customer ? customers[customer] : null;
  const hasCustomer = !!cust;
  const tierMeta = cust ? TIERS[cust.tier] : TIERS.T2; // new customers = standard tier
  const mult = tierMeta.mult;

  // Priced lines: customer override wins, else SKU base × tier multiplier
  const pricedLines = lines.map((l) => {
    const sku = SKUS[l.species];
    const base = sku?.basePrice || 0;
    const override = customer ? PRICE_OVERRIDES[customer]?.[l.species] : undefined;
    const price = override ?? base * mult;
    return {
      ...l,
      price,
      subtotal: price * l.qty,
      skuCode: sku?.code || '—',
      hasOverride: override !== undefined,
    };
  });
  const grandTotal = pricedLines.reduce((a, l) => a + l.subtotal, 0);
  const totalLb = lines.reduce((a, l) => a + l.qty, 0);

  const createOrder = () => {
    if (!canCreate) return;
    const mm = Math.floor(elapsed / 60);
    const ss = elapsed % 60;
    setCreated(true);
    setCreatedTime(`${mm}:${String(ss).padStart(2, '0')}`);
  };

  const customerChips = Object.keys(customers)
    .slice(0, 5)
    .map((n) => ({
      name: n,
      onClick: () => pickCustomer(n),
      style: (customer === n
        ? {
            fontFamily: "'Archivo',sans-serif",
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '6px',
            padding: '8px 15px',
            cursor: 'pointer',
            border: '1px solid #3F6F86',
            background: '#3F6F86',
            color: '#fff',
          }
        : {
            fontFamily: "'Archivo',sans-serif",
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '6px',
            padding: '8px 15px',
            cursor: 'pointer',
            border: '1px solid #D6DCE0',
            background: '#fff',
            color: '#5A6670',
          }) as React.CSSProperties,
    }));

  const overTarget = elapsed > 30 && !created;
  const mm = Math.floor(elapsed / 60);
  const ss = elapsed % 60;

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
      <Nav />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        {/* header */}
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
              Order Intake
            </span>
            <span style={{ fontSize: '12px', color: '#8A99A3' }}>New phone order</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                borderRadius: '20px',
                padding: '5px 12px',
                ...(overTarget
                  ? { background: '#F4EEE2', color: '#8A5A14', border: '1px solid #E4D2A8' }
                  : { background: '#EAF1ED', color: '#2E6347', border: '1px solid #BFD8C9' }),
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="13" r="8" />
                <line x1="12" y1="13" x2="12" y2="9" />
                <line x1="9" y1="2" x2="15" y2="2" />
              </svg>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
                {mm}:{String(ss).padStart(2, '0')}
              </span>
            </div>
            <span style={{ fontSize: '12px', color: '#8A99A3' }}>Target · under 0:30</span>
          </div>
        </header>

        <div className="mana-scroll" style={{ flex: 1, overflowY: 'auto' }}>
          <div
            style={{
              display: 'flex',
              gap: '28px',
              maxWidth: '1080px',
              margin: '0 auto',
              padding: '28px',
              alignItems: 'flex-start',
            }}
          >
            {/* ENTRY */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '22px',
              }}
            >
              {/* customer */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '9px',
                  }}
                >
                  <label
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: '#5A6670',
                    }}
                  >
                    CUSTOMER
                  </label>
                  <span style={{ fontSize: '11px', color: '#8A99A3' }}>Recent</span>
                </div>
                <input
                  value={customerQuery}
                  onChange={onCustomerInput}
                  placeholder="Type a customer name…"
                  style={{
                    width: '100%',
                    fontFamily: "'Archivo', sans-serif",
                    fontSize: '17px',
                    fontWeight: 500,
                    padding: '14px 16px',
                    border: '1.5px solid #C2CAD0',
                    borderRadius: '6px',
                    outline: 'none',
                    background: '#fff',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3F6F86';
                    e.target.style.boxShadow = '0 0 0 3px rgba(63,111,134,0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#C2CAD0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                  {customerChips.map((c, i) => (
                    <button key={i} onClick={c.onClick} style={c.style}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* auto-filled defaults */}
              {hasCustomer && (
                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                    padding: '14px 16px',
                    background: '#EEF3F6',
                    border: '1px solid #BBD0DB',
                    borderRadius: '6px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        color: '#5A7A8A',
                      }}
                    >
                      PRICING TIER
                    </div>
                    <div
                      style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        marginTop: '4px',
                        color: '#2D5365',
                      }}
                    >
                      {tierMeta.label} · {mult.toFixed(2)}×
                    </div>
                  </div>
                  <div style={{ width: '1px', background: '#BBD0DB' }}></div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        color: '#5A7A8A',
                      }}
                    >
                      DEFAULT CARRIER
                    </div>
                    <div
                      style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        marginTop: '4px',
                        color: '#2D5365',
                      }}
                    >
                      {cust?.carrier}
                    </div>
                  </div>
                  <div style={{ width: '1px', background: '#BBD0DB' }}></div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        color: '#5A7A8A',
                      }}
                    >
                      TERMS
                    </div>
                    <div
                      style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        marginTop: '4px',
                        color: '#2D5365',
                      }}
                    >
                      {cust?.terms}
                    </div>
                  </div>
                  <span
                    style={{
                      alignSelf: 'center',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: '#3F6F86',
                      background: '#fff',
                      border: '1px solid #BBD0DB',
                      borderRadius: '3px',
                      padding: '3px 8px',
                    }}
                  >
                    AUTO-FILLED
                  </span>
                </div>
              )}

              {/* new customer note */}
              {isNewCustomer && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    background: '#F4EEE2',
                    border: '1px solid #E4D2A8',
                    borderRadius: '6px',
                  }}
                >
                  <span
                    style={{
                      flex: 'none',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: '#8A5A14',
                      background: '#fff',
                      border: '1px solid #E4D2A8',
                      borderRadius: '3px',
                      padding: '3px 8px',
                    }}
                  >
                    NEW
                  </span>
                  <span style={{ fontSize: '13px', color: '#8A5A14', lineHeight: 1.4 }}>
                    New customer — will be created with standard pricing. Set their tier &amp;
                    defaults later in Customers.
                  </span>
                </div>
              )}

              {/* species — tap to add/remove lines */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '9px',
                  }}
                >
                  <label
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: '#5A6670',
                    }}
                  >
                    SPECIES
                  </label>
                  <span style={{ fontSize: '11px', color: '#8A99A3' }}>
                    Tap to add · one order, multiple species
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '9px' }}>
                  {Object.keys(SKUS).map((s) => {
                    const on = lines.some((l) => l.species === s);
                    return (
                      <button
                        key={s}
                        onClick={() => toggleSpecies(s)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '7px',
                          fontFamily: "'Archivo',sans-serif",
                          fontSize: '14px',
                          fontWeight: 600,
                          borderRadius: '6px',
                          padding: '11px 16px',
                          cursor: 'pointer',
                          border: on ? '1.5px solid #3F6F86' : '1.5px solid #D6DCE0',
                          background: on ? '#EEF3F6' : '#fff',
                          color: on ? '#2D5365' : '#5A6670',
                        }}
                      >
                        <span
                          style={{
                            width: '15px',
                            height: '15px',
                            borderRadius: '4px',
                            flex: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: on ? 'none' : '1.5px solid #C2CAD0',
                            background: on ? '#3F6F86' : '#fff',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          {on ? '✓' : '+'}
                        </span>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* line items — independent quantities */}
              <div>
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: '#5A6670',
                    display: 'block',
                    marginBottom: '9px',
                  }}
                >
                  LINE ITEMS &amp; QUANTITIES
                </label>
                {lines.length === 0 ? (
                  <div
                    style={{
                      border: '1.5px dashed #D6DCE0',
                      borderRadius: '8px',
                      padding: '24px',
                      textAlign: 'center',
                      fontSize: '13px',
                      color: '#8A99A3',
                      background: '#fff',
                    }}
                  >
                    Tap a species above to add it to this order.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {pricedLines.map((l) => (
                      <div
                        key={l.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          background: '#fff',
                          border: '1px solid #E2E6E9',
                          borderRadius: '8px',
                          padding: '13px 14px',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <span style={{ fontSize: '15px', fontWeight: 700 }}>{l.species}</span>
                            <span
                              style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: '9px',
                                fontWeight: 600,
                                color: '#8A99A3',
                                border: '1px solid #E2E6E9',
                                borderRadius: '2px',
                                padding: '1px 5px',
                              }}
                            >
                              {l.skuCode}
                            </span>
                            {l.hasOverride && (
                              <span
                                style={{
                                  fontSize: '9px',
                                  fontWeight: 700,
                                  letterSpacing: '0.04em',
                                  color: '#2D5365',
                                  background: '#EEF3F6',
                                  border: '1px solid #BBD0DB',
                                  borderRadius: '2px',
                                  padding: '1px 6px',
                                }}
                              >
                                OVERRIDE
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#8A99A3', marginTop: '2px' }}>
                            @ {money(l.price)}/lb
                            {l.hasOverride
                              ? ' (customer price)'
                              : ` (base × ${mult.toFixed(2)})`} · {money(l.subtotal)}
                          </div>
                        </div>
                        {/* compact stepper */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flex: 'none',
                          }}
                        >
                          <button
                            onClick={() => adjustLineQty(l.id, -5)}
                            style={{
                              width: '34px',
                              height: '38px',
                              fontSize: '20px',
                              fontWeight: 500,
                              background: '#fff',
                              border: '1.5px solid #C2CAD0',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              color: '#222A30',
                            }}
                          >
                            –
                          </button>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'baseline',
                              gap: '4px',
                              width: '86px',
                              justifyContent: 'center',
                              border: '1.5px solid #C2CAD0',
                              borderRadius: '6px',
                              padding: '7px 6px',
                            }}
                          >
                            <input
                              value={l.qty}
                              onChange={(e) =>
                                setLineQty(
                                  l.id,
                                  parseInt(e.target.value.replace(/\D/g, '') || '0', 10)
                                )
                              }
                              style={{
                                width: '48px',
                                border: 'none',
                                outline: 'none',
                                textAlign: 'right',
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: '20px',
                                fontWeight: 600,
                                color: '#222A30',
                                background: 'transparent',
                                padding: 0,
                              }}
                            />
                            <span style={{ fontSize: '12px', color: '#8A99A3' }}>lb</span>
                          </div>
                          <button
                            onClick={() => adjustLineQty(l.id, 5)}
                            style={{
                              width: '34px',
                              height: '38px',
                              fontSize: '20px',
                              fontWeight: 500,
                              background: '#fff',
                              border: '1.5px solid #C2CAD0',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              color: '#222A30',
                            }}
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => removeLine(l.id)}
                          title="Remove"
                          style={{
                            flex: 'none',
                            width: '30px',
                            height: '30px',
                            borderRadius: '6px',
                            border: '1px solid #E2E6E9',
                            background: '#fff',
                            color: '#8A99A3',
                            cursor: 'pointer',
                            fontSize: '16px',
                            lineHeight: 1,
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {/* running total */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        padding: '10px 14px',
                        background: '#F4F5F6',
                        border: '1px solid #E2E6E9',
                        borderRadius: '8px',
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#5A6670' }}>
                        {lines.length} {lines.length === 1 ? 'species' : 'species'} · {totalLb} lb
                        total
                      </span>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '16px',
                          fontWeight: 700,
                        }}
                      >
                        {money(grandTotal)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* ship date */}
              <div>
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: '#5A6670',
                    display: 'block',
                    marginBottom: '9px',
                  }}
                >
                  SHIP DATE
                </label>
                <div style={{ display: 'flex', gap: '9px', alignItems: 'stretch' }}>
                  {[
                    { label: 'Today', value: today },
                    { label: 'Tomorrow', value: tomorrow },
                  ].map((q) => {
                    const on = !!q.value && shipDate === q.value;
                    return (
                      <button
                        key={q.label}
                        onClick={() => setShipDate(q.value)}
                        style={{
                          textAlign: 'center',
                          borderRadius: '6px',
                          padding: '11px 16px',
                          cursor: 'pointer',
                          fontFamily: "'Archivo', sans-serif",
                          fontSize: '14px',
                          fontWeight: 600,
                          border: on ? '1.5px solid #3F6F86' : '1.5px solid #D6DCE0',
                          background: on ? '#EEF3F6' : '#fff',
                          color: on ? '#2D5365' : '#5A6670',
                        }}
                      >
                        {q.label}
                      </button>
                    );
                  })}
                  <input
                    type="date"
                    value={shipDate}
                    min={today}
                    onChange={(e) => setShipDate(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '14px',
                      fontWeight: 500,
                      padding: '11px 14px',
                      border: '1.5px solid #C2CAD0',
                      borderRadius: '6px',
                      outline: 'none',
                      background: '#fff',
                      color: '#222A30',
                      cursor: 'pointer',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3F6F86';
                      e.target.style.boxShadow = '0 0 0 3px rgba(63,111,134,0.12)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#C2CAD0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                <div style={{ fontSize: '11px', color: '#8A99A3', marginTop: '8px' }}>
                  {shipDate ? `Shipping ${formatShip(shipDate).full}` : 'Pick a ship date'}
                </div>
              </div>
            </div>

            {/* LIVE TICKET */}
            <div style={{ width: '336px', flex: 'none', position: 'sticky', top: 0 }}>
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #E2E6E9',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 14px rgba(34,42,48,0.06)',
                }}
              >
                <div
                  style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid #E2E6E9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '11px',
                      letterSpacing: '0.12em',
                      color: '#5A6670',
                    }}
                  >
                    ORDER TICKET
                  </span>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '11px',
                      color: '#8A99A3',
                    }}
                  >
                    #2213
                  </span>
                </div>
                <div style={{ padding: '18px' }}>
                  <div
                    style={{
                      fontSize: '19px',
                      fontWeight: 700,
                      letterSpacing: '-0.01em',
                      ...(customerName ? {} : { color: '#B6BEC4' }),
                    }}
                  >
                    {customerName || 'Select customer'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#8A99A3', marginTop: '3px' }}>
                    {cust
                      ? `${tierMeta.label} · ${cust.terms}`
                      : isNewCustomer
                        ? 'New customer · standard pricing'
                        : 'Tier & carrier auto-fill on select'}
                  </div>

                  <div
                    style={{
                      marginTop: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    {/* line items */}
                    {pricedLines.length === 0 ? (
                      <div
                        style={{
                          fontSize: '13px',
                          color: '#B6BEC4',
                          paddingBottom: '11px',
                          borderBottom: '1px solid #EDEFF1',
                        }}
                      >
                        No species added yet
                      </div>
                    ) : (
                      pricedLines.map((l) => (
                        <div
                          key={l.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            borderBottom: '1px solid #EDEFF1',
                            paddingBottom: '10px',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600 }}>{l.species}</div>
                            <div
                              style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: '11px',
                                color: '#8A99A3',
                                marginTop: '2px',
                              }}
                            >
                              {l.qty} lb @ {money(l.price)}
                            </div>
                          </div>
                          <span
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '14px',
                              fontWeight: 600,
                            }}
                          >
                            {money(l.subtotal)}
                          </span>
                        </div>
                      ))
                    )}

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        borderBottom: '1px solid #EDEFF1',
                        paddingBottom: '11px',
                      }}
                    >
                      <span style={{ fontSize: '13px', color: '#5A6670' }}>Ship date</span>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>
                        {formatShip(shipDate).full}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        borderBottom: '1px solid #EDEFF1',
                        paddingBottom: '11px',
                      }}
                    >
                      <span style={{ fontSize: '13px', color: '#5A6670' }}>Carrier</span>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>
                        {cust?.carrier || '—'}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                      }}
                    >
                      <span style={{ fontSize: '13px', color: '#5A6670' }}>
                        Total · {totalLb} lb
                      </span>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '20px',
                          fontWeight: 600,
                        }}
                      >
                        {money(grandTotal)}
                      </span>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    padding: '0 18px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '9px',
                  }}
                >
                  <button
                    onClick={createOrder}
                    style={{
                      fontFamily: "'Archivo', sans-serif",
                      fontSize: '15px',
                      fontWeight: 700,
                      border: 'none',
                      borderRadius: '6px',
                      padding: '14px',
                      cursor: canCreate ? 'pointer' : 'default',
                      ...(canCreate
                        ? { background: '#222A30', color: '#fff' }
                        : { background: '#E2E6E9', color: '#A6AEB4' }),
                    }}
                  >
                    {!hasSelection
                      ? 'Enter a customer name'
                      : !hasLines
                        ? 'Add at least one species'
                        : 'Create order →'}
                  </button>
                  <button
                    onClick={reset}
                    style={{
                      fontFamily: "'Archivo', sans-serif",
                      fontSize: '13px',
                      fontWeight: 600,
                      background: '#fff',
                      color: '#5A6670',
                      border: '1px solid #D6DCE0',
                      borderRadius: '6px',
                      padding: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    Save &amp; start new
                  </button>
                </div>
              </div>

              {created && (
                <div
                  style={{
                    marginTop: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '9px',
                    background: '#EAF1ED',
                    border: '1px solid #BFD8C9',
                    borderRadius: '6px',
                    padding: '12px 14px',
                  }}
                >
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: '#3F7D5B',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ✓
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#2E6347' }}>
                    Order #2213 created in {createdTime} — {lines.length}-species order sent to the
                    board.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
