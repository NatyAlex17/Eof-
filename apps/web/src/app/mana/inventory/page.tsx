'use client';

import { useState } from 'react';
import Nav from '../components/Nav';

interface Box {
  n: string;
  idx: number;
  weight: number;
  tag?: string;
}

interface Lot {
  lot: string;
  species: string;
  vendor: string;
  grade: string;
  received: string;
  status: 'received' | 'available' | 'allocated' | 'shipped';
  boxes: Box[];
  expanded?: boolean;
}

export default function InventoryPage() {
  const [filter, setFilter] = useState<'all' | 'received' | 'available' | 'allocated' | 'shipped'>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ 'LOT-2207': true });
  const [importOpen, setImportOpen] = useState(false);

  const lotData: Lot[] = [
    {
      lot: 'LOT-2207',
      species: 'Ahi Tuna',
      vendor: 'Kona Fresh Catch',
      grade: 'A+',
      received: 'Jun 23 · 05:40',
      status: 'available',
      boxes: [
        { n: 'B-4471', idx: 1, weight: 42.6, tag: 'NOBU' },
        { n: 'B-4472', idx: 2, weight: 38.1, tag: 'NOBU' },
        { n: 'B-4473', idx: 3, weight: 40.2 },
        { n: 'B-4474', idx: 4, weight: 44.0 },
        { n: 'B-4475', idx: 5, weight: 39.5 },
        { n: 'B-4476', idx: 6, weight: 41.8 },
      ],
    },
    {
      lot: 'LOT-2208',
      species: 'Salmon',
      vendor: 'Pacific Blue Co.',
      grade: 'A',
      received: 'Jun 23 · 05:52',
      status: 'available',
      boxes: [
        { n: 'B-4520', idx: 1, weight: 31.2, tag: 'MORI' },
        { n: 'B-4521', idx: 2, weight: 33.5 },
        { n: 'B-4522', idx: 3, weight: 29.8 },
        { n: 'B-4523', idx: 4, weight: 34.1 },
        { n: 'B-4524', idx: 5, weight: 30.6 },
      ],
    },
    {
      lot: 'LOT-2209',
      species: 'Ono',
      vendor: 'Island Seafood',
      grade: 'A',
      received: 'Jun 23 · 06:05',
      status: 'received',
      boxes: [
        { n: 'B-4560', idx: 1, weight: 29.8 },
        { n: 'B-4561', idx: 2, weight: 33.5 },
        { n: 'B-4562', idx: 3, weight: 26.4 },
        { n: 'B-4563', idx: 4, weight: 28.9 },
      ],
    },
    {
      lot: 'LOT-2205',
      species: 'Hamachi',
      vendor: 'Kona Fresh Catch',
      grade: 'A+',
      received: 'Jun 22 · 06:10',
      status: 'shipped',
      boxes: [
        { n: 'B-4410', idx: 1, weight: 22.4, tag: 'ROY' },
        { n: 'B-4411', idx: 2, weight: 24.1, tag: 'ROY' },
        { n: 'B-4412', idx: 3, weight: 23.8, tag: 'WONG' },
      ],
    },
  ];

  const statusMeta: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    received: { label: 'Received', color: '#8A5A14', bg: '#F4EEE2', dot: '#B7791F' },
    available: { label: 'Available', color: '#2E6347', bg: '#EAF1ED', dot: '#3F7D5B' },
    allocated: { label: 'Allocated', color: '#2D5365', bg: '#EEF3F6', dot: '#3F6F86' },
    shipped: { label: 'Shipped', color: '#5A6670', bg: '#EEF0F2', dot: '#8A99A3' },
  };

  const filteredLots =
    filter === 'all' ? lotData : lotData.filter((l) => l.status === filter);

  const toggleExpanded = (lot: string) => {
    setExpanded((prev) => ({ ...prev, [lot]: !prev[lot] }));
  };

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
        {/* HEADER */}
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
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              Lots &amp; Inventory
            </span>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                color: '#8A99A3',
              }}
            >
              {filteredLots.reduce((a, l) => a + l.boxes.length, 0)} boxes total
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              {(['all', 'received', 'available', 'allocated', 'shipped'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    fontFamily: "'Archivo', sans-serif",
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    background: filter === f ? '#3F6F86' : 'none',
                    color: filter === f ? '#fff' : '#5A6670',
                  }}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={() => setImportOpen(true)}
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
                <path d="M12 16V4" />
                <path d="M7 9l5-5 5 5" />
                <path d="M5 20h14" />
              </svg>
              Import vendor file
            </button>
          </div>
        </header>

        {/* TABLE */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '22px 28px',
          }}
        >
          <div
            style={{
              background: '#fff',
              border: '1px solid #E2E6E9',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            {/* COLUMN HEAD */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '30px 128px 1fr 70px 90px 96px 110px 132px',
                gap: 0,
                alignItems: 'center',
                padding: '11px 18px',
                borderBottom: '1px solid #E2E6E9',
                background: '#FAFBFB',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.07em',
                color: '#8A99A3',
              }}
            >
              <span></span>
              <span>LOT</span>
              <span>SPECIES · VENDOR</span>
              <span>GRADE</span>
              <span style={{ textAlign: 'right' }}>BOXES</span>
              <span style={{ textAlign: 'right' }}>WEIGHT</span>
              <span>RECEIVED</span>
              <span>STATUS</span>
            </div>

            {/* LOT ROWS */}
            {filteredLots.map((lot) => {
              const isExpanded = !!expanded[lot.lot];
              const meta = statusMeta[lot.status];
              const totalWeight = lot.boxes.reduce((a, b) => a + b.weight, 0);

              return (
                <div key={lot.lot} style={{ borderBottom: '1px solid #EDEFF1' }}>
                  {/* LOT ROW */}
                  <div
                    onClick={() => toggleExpanded(lot.lot)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '30px 128px 1fr 70px 90px 96px 110px 132px',
                      gap: 0,
                      alignItems: 'center',
                      padding: '13px 18px',
                      cursor: 'pointer',
                      background: isExpanded ? '#FAFBFB' : 'transparent',
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLElement).style.background = '#FAFBFB';
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLElement).style.background = isExpanded ? '#FAFBFB' : 'transparent';
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '11px',
                        color: '#8A99A3',
                        transition: 'transform 0.12s',
                        transform: `rotate(${isExpanded ? 90 : 0}deg)`,
                      }}
                    >
                      ▸
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      {lot.lot}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>{lot.species}</span>
                      <span style={{ fontSize: '12px', color: '#8A99A3' }}> · {lot.vendor}</span>
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#5A6670' }}>
                      {lot.grade}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '13px',
                        textAlign: 'right',
                      }}
                    >
                      {lot.boxes.length}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '13px',
                        fontWeight: 600,
                        textAlign: 'right',
                      }}
                    >
                      {totalWeight.toFixed(1)} lb
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '12px',
                        color: '#5A6670',
                      }}
                    >
                      {lot.received}
                    </span>
                    <span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: meta.color,
                          background: meta.bg,
                          borderRadius: '3px',
                          padding: '3px 9px',
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: meta.dot,
                          }}
                        ></span>
                        {meta.label}
                      </span>
                    </span>
                  </div>

                  {/* EXPANDED BOXES */}
                  {isExpanded && (
                    <div style={{ padding: '4px 18px 18px 48px', background: '#FAFBFB' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))', gap: '8px' }}>
                        {lot.boxes.map((box) => (
                          <div
                            key={box.n}
                            style={{
                              background: '#fff',
                              border: '1px solid #E2E6E9',
                              borderLeft: `3px solid ${statusMeta[lot.status].dot}`,
                              borderRadius: '4px',
                              padding: '9px 11px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: "'IBM Plex Mono', monospace",
                                  fontSize: '12px',
                                  fontWeight: 600,
                                }}
                              >
                                {box.n}
                              </span>
                              {box.tag && (
                                <span
                                  style={{
                                    fontSize: '9px',
                                    fontWeight: 700,
                                    letterSpacing: '0.04em',
                                    color: '#fff',
                                    background: '#3F6F86',
                                    borderRadius: '2px',
                                    padding: '2px 6px',
                                  }}
                                >
                                  {box.tag}
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'baseline',
                                justifyContent: 'space-between',
                                marginTop: '7px',
                              }}
                            >
                              <span style={{ fontSize: '10px', color: '#8A99A3' }}>#{box.idx}</span>
                              <span
                                style={{
                                  fontFamily: "'IBM Plex Mono', monospace",
                                  fontSize: '15px',
                                  fontWeight: 600,
                                }}
                              >
                                {box.weight}
                                <span style={{ fontSize: '10px', color: '#8A99A3', fontWeight: 500 }}> lb</span>
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* IMPORT DRAWER */}
      {importOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(34, 42, 48, 0.32)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 50,
          }}
          onClick={() => setImportOpen(false)}
        >
          <div
            style={{
              width: '760px',
              maxWidth: '94vw',
              height: '100%',
              background: '#F4F5F6',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-12px 0 40px rgba(34, 42, 48, 0.18)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* DRAWER HEAD */}
            <div
              style={{
                flexBasis: 'auto',
                padding: '20px 24px',
                background: '#fff',
                borderBottom: '1px solid #E2E6E9',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
                    Review vendor import
                  </div>
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '12px',
                      color: '#8A99A3',
                      marginTop: '3px',
                    }}
                  >
                    kona_fresh_packlist_0623.csv · 24 rows
                  </div>
                </div>
                <button
                  onClick={() => setImportOpen(false)}
                  style={{
                    fontSize: '20px',
                    background: 'none',
                    border: 'none',
                    color: '#8A99A3',
                    cursor: 'pointer',
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* ROWS */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '18px 24px',
              }}
            >
              <p style={{ textAlign: 'center', color: '#8A99A3', fontSize: '14px' }}>
                Import preview - 24 rows ready to import
              </p>
            </div>

            {/* FOOTER */}
            <div
              style={{
                flexBasis: 'auto',
                padding: '16px 24px',
                background: '#fff',
                borderTop: '1px solid #E2E6E9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '13px', color: '#8A99A3' }}>Ready to import</span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setImportOpen(false)}
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
                  style={{
                    fontFamily: "'Archivo', sans-serif",
                    fontSize: '13px',
                    fontWeight: 600,
                    background: '#3F6F86',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '10px 16px',
                    cursor: 'pointer',
                  }}
                >
                  Confirm import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
