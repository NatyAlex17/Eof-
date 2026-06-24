'use client';

import { useState, useEffect } from 'react';
import Nav from '../components/Nav';

interface Customer {
  tier: string;
  mult: number;
  carrier: string;
  terms: string;
}

const customers: Record<string, Customer> = {
  Nobu: { tier: 'Tier 1', mult: 0.95, carrier: 'Air Cargo', terms: 'Net 15' },
  Morimoto: { tier: 'Tier 1', mult: 0.95, carrier: 'Air Cargo', terms: 'Net 15' },
  "Roy's": { tier: 'Tier 2', mult: 1.0, carrier: 'Ground', terms: 'Net 30' },
  "Alan Wong's": { tier: 'Tier 2', mult: 1.0, carrier: 'Ground', terms: 'Net 30' },
  "Hy's Steakhouse": {
    tier: 'Tier 2',
    mult: 1.0,
    carrier: 'Ground',
    terms: 'Net 30',
  },
  "Tiki's Grill": {
    tier: 'Tier 3',
    mult: 1.08,
    carrier: 'Will Call',
    terms: 'COD',
  },
};

const speciesBase: Record<string, number> = {
  'Ahi Tuna': 28.5,
  Ono: 22.0,
  Salmon: 16.5,
  Hamachi: 26.0,
  Kanpachi: 24.0,
};

type DateOption = 'today' | 'tomorrow' | 'other';

export default function OrderIntakePage() {
  const [customerQuery, setCustomerQuery] = useState('');
  const [customer, setCustomer] = useState<string | null>(null);
  const [species, setSpecies] = useState('Ahi Tuna');
  const [qty, setQty] = useState(50);
  const [date, setDate] = useState<DateOption>('today');
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

  const onCustomerInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    const exact = Object.keys(customers).find(
      (n) => n.toLowerCase() === q.toLowerCase()
    );
    setCustomerQuery(q);
    setCustomer(exact || (customer && q === customer ? customer : null));
  };

  const pickCustomer = (name: string) => {
    setCustomer(name);
    setCustomerQuery(name);
  };

  const pickSpecies = (s: string) => {
    setSpecies(s);
  };

  const setQuantity = (v: number) => {
    setQty(Math.max(0, Math.round(v)));
  };

  const pickDate = (d: DateOption) => {
    setDate(d);
  };

  const reset = () => {
    setT0(Date.now());
    setCustomerQuery('');
    setCustomer(null);
    setSpecies('Ahi Tuna');
    setQty(50);
    setDate('today');
    setCreated(false);
    setElapsed(0);
  };

  const createOrder = () => {
    if (!customer) return;
    const mm = Math.floor(elapsed / 60);
    const ss = elapsed % 60;
    setCreated(true);
    setCreatedTime(`${mm}:${String(ss).padStart(2, '0')}`);
  };

  const money = (n: number) =>
    '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const dateMeta = (d: DateOption) => {
    if (d === 'today') return { label: 'Today', sub: 'Jun 23', full: 'Today · Jun 23' };
    if (d === 'tomorrow')
      return { label: 'Tomorrow', sub: 'Jun 24', full: 'Tomorrow · Jun 24' };
    return { label: 'Thu', sub: 'Jun 26', full: 'Thu · Jun 26' };
  };

  const cust = customer ? customers[customer] : null;
  const hasCustomer = !!cust;
  const base = speciesBase[species] || 0;
  const price = cust ? base * cust.mult : base;
  const total = price * qty;

  const customerChips = Object.keys(customers)
    .slice(0, 5)
    .map((n) => ({
      name: n,
      onClick: () => pickCustomer(n),
      style:
        customer === n
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
            },
    }));

  const speciesChips = Object.keys(speciesBase).map((n) => {
    const on = species === n;
    return {
      name: n,
      onClick: () => pickSpecies(n),
      style: on
        ? {
            fontFamily: "'Archivo',sans-serif",
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '6px',
            padding: '11px 18px',
            cursor: 'pointer',
            border: '1.5px solid #3F6F86',
            background: '#EEF3F6',
            color: '#2D5365',
          }
        : {
            fontFamily: "'Archivo',sans-serif",
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '6px',
            padding: '11px 18px',
            cursor: 'pointer',
            border: '1.5px solid #D6DCE0',
            background: '#fff',
            color: '#5A6670',
          },
    };
  });

  const qtyChips = [25, 50, 75, 100].map((v) => ({
    label: v + ' lb',
    onClick: () => setQuantity(v),
    style:
      qty === v
        ? {
            flex: 1,
            fontFamily: "'IBM Plex Mono',monospace",
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '6px',
            padding: '9px',
            cursor: 'pointer',
            border: '1.5px solid #3F6F86',
            background: '#EEF3F6',
            color: '#2D5365',
          }
        : {
            flex: 1,
            fontFamily: "'IBM Plex Mono',monospace",
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '6px',
            padding: '9px',
            cursor: 'pointer',
            border: '1px solid #D6DCE0',
            background: '#fff',
            color: '#5A6670',
          },
  }));

  const dateChips = [
    'today',
    'tomorrow',
    'other',
  ].map((d) => {
    const m = dateMeta(d as DateOption);
    const on = date === d;
    return {
      label: m.label,
      sub: m.sub,
      onClick: () => pickDate(d as DateOption),
      style: on
        ? {
            flex: 1,
            textAlign: 'center' as const,
            borderRadius: '6px',
            padding: '11px 8px',
            cursor: 'pointer',
            border: '1.5px solid #3F6F86',
            background: '#EEF3F6',
            color: '#2D5365',
          }
        : {
            flex: 1,
            textAlign: 'center' as const,
            borderRadius: '6px',
            padding: '11px 8px',
            cursor: 'pointer',
            border: '1.5px solid #D6DCE0',
            background: '#fff',
            color: '#5A6670',
          },
    };
  });

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

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: 0,
        }}
      >
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
            <span
              style={{
                fontSize: '16px',
                fontWeight: 700,
                letterSpacing: '-0.01em',
              }}
            >
              Order Intake
            </span>
            <span style={{ fontSize: '12px', color: '#8A99A3' }}>
              New phone order
            </span>
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
                  ? {
                      background: '#F4EEE2',
                      color: '#8A5A14',
                      border: '1px solid #E4D2A8',
                    }
                  : {
                      background: '#EAF1ED',
                      color: '#2E6347',
                      border: '1px solid #BFD8C9',
                    }),
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
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontWeight: 600,
                }}
              >
                {mm}:{String(ss).padStart(2, '0')}
              </span>
            </div>
            <span style={{ fontSize: '12px', color: '#8A99A3' }}>
              Target · under 0:30
            </span>
          </div>
        </header>

        <div
          className="mana-scroll"
          style={{ flex: 1, overflowY: 'auto' }}
        >
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
                  <span style={{ fontSize: '11px', color: '#8A99A3' }}>
                    Recent
                  </span>
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
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginTop: '10px',
                  }}
                >
                  {customerChips.map((c, i) => (
                    <button key={i} onClick={c.onClick} style={c.style as React.CSSProperties}>
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
                    animation: 'none',
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
                      {cust?.tier}
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

              {/* species */}
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
                  SPECIES
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '9px' }}>
                  {speciesChips.map((sp, i) => (
                    <button key={i} onClick={sp.onClick} style={sp.style as React.CSSProperties}>
                      {sp.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* quantity */}
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
                  QUANTITY
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    gap: '10px',
                  }}
                >
                  <button
                    onClick={() => setQuantity(qty - 5)}
                    style={{
                      width: '54px',
                      flex: 'none',
                      fontSize: '24px',
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
                      flex: 1,
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'center',
                      gap: '8px',
                      border: '1.5px solid #C2CAD0',
                      borderRadius: '6px',
                      background: '#fff',
                      padding: '10px',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '34px',
                        fontWeight: 600,
                      }}
                    >
                      {qty}
                    </span>
                    <span
                      style={{
                        fontSize: '15px',
                        color: '#8A99A3',
                        fontWeight: 500,
                      }}
                    >
                      lb
                    </span>
                  </div>
                  <button
                    onClick={() => setQuantity(qty + 5)}
                    style={{
                      width: '54px',
                      flex: 'none',
                      fontSize: '24px',
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
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  {qtyChips.map((q, i) => (
                    <button key={i} onClick={q.onClick} style={q.style as React.CSSProperties}>
                      {q.label}
                    </button>
                  ))}
                </div>
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
                <div style={{ display: 'flex', gap: '9px' }}>
                  {dateChips.map((d, i) => (
                    <button key={i} onClick={d.onClick} style={d.style as React.CSSProperties}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '14px',
                          fontWeight: 600,
                        }}
                      >
                        {d.label}
                      </span>
                      <span
                        style={{
                          display: 'block',
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '11px',
                          opacity: 0.7,
                          marginTop: '2px',
                        }}
                      >
                        {d.sub}
                      </span>
                    </button>
                  ))}
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
                      ...(customer ? {} : { color: '#B6BEC4' }),
                    }}
                  >
                    {customer || 'Select customer'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#8A99A3', marginTop: '3px' }}>
                    {cust
                      ? `${cust.tier} · ${cust.terms}`
                      : 'Tier & carrier auto-fill on select'}
                  </div>

                  <div
                    style={{
                      marginTop: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '11px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        borderBottom: '1px solid #EDEFF1',
                        paddingBottom: '11px',
                      }}
                    >
                      <span style={{ fontSize: '13px', color: '#5A6670' }}>
                        Species
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>
                        {species}
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
                      <span style={{ fontSize: '13px', color: '#5A6670' }}>
                        Quantity
                      </span>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '14px',
                          fontWeight: 600,
                        }}
                      >
                        {qty} lb
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
                      <span style={{ fontSize: '13px', color: '#5A6670' }}>
                        Ship date
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>
                        {dateMeta(date).full}
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
                      <span style={{ fontSize: '13px', color: '#5A6670' }}>
                        Carrier
                      </span>
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
                        Est. @ {money(price)}/lb
                      </span>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '20px',
                          fontWeight: 600,
                        }}
                      >
                        {money(total)}
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
                      cursor: customer ? 'pointer' : 'default',
                      ...(customer
                        ? { background: '#222A30', color: '#fff' }
                        : { background: '#E2E6E9', color: '#A6AEB4' }),
                    }}
                  >
                    {customer ? 'Create order →' : 'Select a customer first'}
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
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#2E6347',
                    }}
                  >
                    Order #2213 created in {createdTime} — sent to the board.
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
