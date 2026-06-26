'use client';

import { useState } from 'react';
import Nav from '../components/Nav';

interface PickSlip {
  no: string;
  warehouse: string;
  status: 'locked' | 'ready';
  customer: string;
  address: string;
  contact: string;
  carrier: string;
  pickup: string;
  packing: string;
  shipDate: string;
  lotLine: string;
  note: string;
  lines: Array<{
    box: string;
    desc: string;
    lot: string;
    weight: string;
    partial?: boolean;
  }>;
}

export default function PickSlipsPage() {
  const [tab, setTab] = useState<'nobu' | 'mori' | 'roy'>('nobu');

  const slips: Record<'nobu' | 'mori' | 'roy', PickSlip> = {
    nobu: {
      no: 'PS-2213',
      warehouse: 'SFO',
      status: 'locked',
      customer: 'Nobu',
      address: '375 University Ave, Palo Alto CA',
      contact: 'Chef de cuisine · (650) 555-0142',
      carrier: 'Aloha Air Cargo',
      pickup: 'Jun 23 · 09:30',
      packing: 'Dry ice',
      shipDate: 'Jun 23',
      lotLine: 'LOT-2207 (Ahi Tuna)',
      note: 'Pack ahi in dry ice — long-haul air. Double-line cooler, 8 lb dry ice per box. Tape lid, mark THIS SIDE UP.',
      lines: [
        { box: 'B-4471', desc: 'Ahi Tuna · A+', lot: '2207', weight: '42.6 lb' },
        { box: 'B-4472', desc: 'Ahi Tuna · A+', lot: '2207', weight: '38.1 lb' },
        { box: 'B-4473', desc: 'Ahi Tuna · A+', lot: '2207', weight: '20.0 lb', partial: true },
      ],
    },
    mori: {
      no: 'PS-2214',
      warehouse: 'SFO',
      status: 'ready',
      customer: 'Morimoto',
      address: '88 Mission St, San Francisco CA',
      contact: 'Receiving · (415) 555-0178',
      carrier: 'Aloha Air Cargo',
      pickup: 'Jun 23 · 09:30',
      packing: 'Dry ice',
      shipDate: 'Jun 23',
      lotLine: 'LOT-2208 (Salmon)',
      note: 'Salmon for air freight. Dry ice, 6 lb per box. Keep upright, gel pack on top layer.',
      lines: [
        { box: 'B-4520', desc: 'Salmon · A', lot: '2208', weight: '31.2 lb' },
        { box: 'B-4521', desc: 'Salmon · A', lot: '2208', weight: '33.5 lb' },
      ],
    },
    roy: {
      no: 'PS-2215',
      warehouse: 'SFO',
      status: 'ready',
      customer: "Roy's",
      address: '226 Hamilton Ave, Palo Alto CA',
      contact: 'Kitchen mgr · (650) 555-0190',
      carrier: 'HNL Ground',
      pickup: 'Jun 23 · 11:00',
      packing: 'Gel ice',
      shipDate: 'Jun 23',
      lotLine: 'LOT-2209 (Ono)',
      note: 'Local ground delivery. Gel ice only — no dry ice for short haul. 4 packs per box, line bottom.',
      lines: [
        { box: 'B-4560', desc: 'Ono · A', lot: '2209', weight: '29.8 lb' },
        { box: 'B-4561', desc: 'Ono · A', lot: '2209', weight: '33.5 lb' },
      ],
    },
  };

  const slip = slips[tab];
  const statusMeta =
    slip.status === 'locked'
      ? {
          label: 'Locked',
          color: '#2E6347',
          bg: '#EAF1ED',
          dot: '#3F7D5B',
          stamp: 'LOCKED',
          stampColor: '#3F7D5B',
        }
      : {
          label: 'Ready to pull',
          color: '#2D5365',
          bg: '#EEF3F6',
          dot: '#3F6F86',
          stamp: 'READY',
          stampColor: '#3F6F86',
        };

  const totalWeight = slip.lines.reduce((a, l) => a + parseFloat(l.weight), 0);

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
        {/* TOOLBAR */}
        <header
          style={{
            flexBasis: '58px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            padding: '0 28px',
            borderBottom: '1px solid #E2E6E9',
            background: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              Pick Slips
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                background: '#F4F5F6',
                border: '1px solid #E2E6E9',
                borderRadius: '5px',
                padding: '3px',
              }}
            >
              {(
                [
                  ['nobu', 'Nobu · PS-2213'],
                  ['mori', 'Morimoto · PS-2214'],
                  ['roy', "Roy's · PS-2215"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  style={{
                    fontFamily: "'Archivo', sans-serif",
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    background: tab === k ? '#3F6F86' : 'none',
                    color: tab === k ? '#fff' : '#5A6670',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: statusMeta.color,
                background: statusMeta.bg,
                borderRadius: '4px',
                padding: '6px 11px',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: statusMeta.dot,
                }}
              ></span>
              {statusMeta.label}
            </span>
            <button
              onClick={() => window.print()}
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
              Print / Save PDF
            </button>
          </div>
        </header>

        {/* DOCUMENT */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '28px',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '760px',
              maxWidth: '100%',
              background: '#fff',
              border: '1px solid #E2E6E9',
              borderRadius: '6px',
              boxShadow: '0 4px 18px rgba(34, 42, 48, 0.07)',
              position: 'relative',
            }}
          >
            {/* MANIFEST HEADER */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: '36px 44px 24px',
                borderBottom: '2px solid #222A30',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
                <div
                  style={{
                    width: '80px',
                    height: '72px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 'none',
                  }}
                >
                  <img
                    src="/logo.png"
                    alt="MANA"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center',
                      transform: 'scale(1.2)',
                    }}
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      letterSpacing: '0.01em',
                      lineHeight: 1,
                    }}
                  >
                    MANA
                  </div>
                  <div
                    style={{
                      fontSize: '9px',
                      fontWeight: 600,
                      letterSpacing: '0.16em',
                      color: '#8A99A3',
                      marginTop: '4px',
                    }}
                  >
                    PERISHABLE · KEEP REFRIGERATED
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontFamily: "'Newsreader', serif",
                    fontSize: '26px',
                    fontWeight: 500,
                    letterSpacing: '-0.01em',
                    lineHeight: 1,
                  }}
                >
                  Pick Slip
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '12px',
                    color: '#5A6670',
                    marginTop: '6px',
                  }}
                >
                  {slip.no} · {slip.warehouse}
                </div>
              </div>
            </div>

            {/* META GRID */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 1fr 1fr',
                gap: 0,
                borderBottom: '1px solid #E2E6E9',
              }}
            >
              <div
                style={{
                  padding: '20px 44px 20px',
                  borderRight: '1px solid #E2E6E9',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    color: '#8A99A3',
                  }}
                >
                  SHIP TO
                </div>
                <div
                  style={{
                    fontSize: '17px',
                    fontWeight: 700,
                    marginTop: '6px',
                  }}
                >
                  {slip.customer}
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: '#5A6670',
                    marginTop: '3px',
                  }}
                >
                  {slip.address}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#8A99A3',
                    marginTop: '6px',
                  }}
                >
                  {slip.contact}
                </div>
              </div>
              <div
                style={{
                  padding: '20px 24px',
                  borderRight: '1px solid #E2E6E9',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    color: '#8A99A3',
                  }}
                >
                  CARRIER
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    marginTop: '6px',
                  }}
                >
                  {slip.carrier}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    color: '#8A99A3',
                    marginTop: '14px',
                  }}
                >
                  PICKUP
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '14px',
                    fontWeight: 600,
                    marginTop: '6px',
                  }}
                >
                  {slip.pickup}
                </div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    color: '#8A99A3',
                  }}
                >
                  PACKING
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#2D5365',
                    background: '#EEF3F6',
                    border: '1px solid #BBD0DB',
                    borderRadius: '3px',
                    padding: '3px 9px',
                  }}
                >
                  {slip.packing}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    color: '#8A99A3',
                    marginTop: '14px',
                  }}
                >
                  SHIP DATE
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '14px',
                    fontWeight: 600,
                    marginTop: '6px',
                  }}
                >
                  {slip.shipDate}
                </div>
              </div>
            </div>

            {/* BOXES TO PULL */}
            <div style={{ padding: '24px 44px 8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '11px',
                    letterSpacing: '0.1em',
                    color: '#5A6670',
                  }}
                >
                  BOXES TO PULL
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    color: '#8A99A3',
                  }}
                >
                  From {slip.lotLine}
                </span>
              </div>
              <div
                style={{
                  border: '1px solid #E2E6E9',
                  borderRadius: '5px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 110px 1fr 80px 110px',
                    gap: 0,
                    padding: '9px 16px',
                    background: '#FAFBFB',
                    borderBottom: '1px solid #E2E6E9',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: '#8A99A3',
                  }}
                >
                  <span>✓</span>
                  <span>BOX #</span>
                  <span>SPECIES · GRADE</span>
                  <span style={{ textAlign: 'right' }}>LOT</span>
                  <span style={{ textAlign: 'right' }}>WEIGHT</span>
                </div>

                {slip.lines.map((ln) => (
                  <div
                    key={ln.box}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 110px 1fr 80px 110px',
                      gap: 0,
                      alignItems: 'center',
                      padding: '11px 16px',
                      borderBottom: '1px solid #EDEFF1',
                    }}
                  >
                    <span
                      style={{
                        width: '15px',
                        height: '15px',
                        border: '1.5px solid #C2CAD0',
                        borderRadius: '3px',
                      }}
                    ></span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      {ln.box}
                    </span>
                    <span style={{ fontSize: '13px' }}>
                      {ln.desc}
                      {ln.partial && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#8A5A14',
                            background: '#F4EEE2',
                            borderRadius: '2px',
                            padding: '1px 6px',
                            marginLeft: '8px',
                          }}
                        >
                          SPLIT
                        </span>
                      )}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '12px',
                        color: '#8A99A3',
                        textAlign: 'right',
                      }}
                    >
                      {ln.lot}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '13px',
                        fontWeight: 600,
                        textAlign: 'right',
                      }}
                    >
                      {ln.weight}
                    </span>
                  </div>
                ))}

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 110px 1fr 80px 110px',
                    gap: 0,
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: '#FAFBFB',
                  }}
                >
                  <span></span>
                  <span></span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#5A6670',
                    }}
                  >
                    {slip.lines.length} boxes
                  </span>
                  <span></span>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '15px',
                      fontWeight: 700,
                      textAlign: 'right',
                    }}
                  >
                    {totalWeight.toFixed(1)} lb
                  </span>
                </div>
              </div>
            </div>

            {/* PACKING NOTE + SIGNATURE */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 0,
                padding: '20px 44px 36px',
              }}
            >
              <div style={{ paddingRight: '24px' }}>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    color: '#8A99A3',
                    marginBottom: '7px',
                  }}
                >
                  PACKING INSTRUCTION
                </div>
                <div
                  style={{
                    fontFamily: "'Newsreader', serif",
                    fontSize: '15px',
                    lineHeight: 1.5,
                    color: '#222A30',
                  }}
                >
                  {slip.note}
                </div>
              </div>
              <div
                style={{
                  paddingLeft: '24px',
                  borderLeft: '1px solid #E2E6E9',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                }}
              >
                <div
                  style={{
                    borderBottom: '1.5px solid #222A30',
                    height: '34px',
                  }}
                ></div>
                <div
                  style={{
                    fontSize: '11px',
                    color: '#8A99A3',
                    marginTop: '7px',
                  }}
                >
                  Packed by · signature / time
                </div>
              </div>
            </div>

            {/* STAMP */}
            <div
              style={{
                position: 'absolute',
                bottom: '128px',
                right: '70px',
                opacity: 0.9,
              }}
            >
              <div
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontWeight: 700,
                  fontSize: '22px',
                  letterSpacing: '0.12em',
                  color: statusMeta.stampColor,
                  border: `3px solid ${statusMeta.stampColor}`,
                  borderRadius: '6px',
                  padding: '8px 18px',
                  transform: 'rotate(-9deg)',
                }}
              >
                {statusMeta.stamp}
              </div>
              {slip.status === 'locked' && (
                <div
                  style={{
                    fontSize: '9px',
                    color: '#8A99A3',
                    marginTop: '8px',
                    textAlign: 'center',
                    fontWeight: 500,
                    transform: 'rotate(-9deg)',
                    transformOrigin: 'center',
                  }}
                >
                  Generated: Jun 23 06:14
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
