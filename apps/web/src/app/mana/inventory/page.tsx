'use client';

import { useState } from 'react';
import Nav from '../components/Nav';

interface Content {
  species: string;
  grade: string;
  weight: number;
}

interface Box {
  n: string;
  idx: number;
  contents: Content[];
  tag?: string;
}

interface Lot {
  lot: string;
  vendor: string;
  received: string;
  status: 'received' | 'available' | 'allocated' | 'shipped';
  boxes: Box[];
  expanded?: boolean;
}

export default function InventoryPage() {
  const [filter, setFilter] = useState<'all' | 'received' | 'available' | 'allocated' | 'shipped'>(
    'all'
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ 'LOT-2207': true });
  const [importOpen, setImportOpen] = useState(false);

  const lotData: Lot[] = [
    {
      lot: 'LOT-2207',
      vendor: 'Kona Fresh Catch',
      received: 'Jun 23 · 05:40',
      status: 'available',
      boxes: [
        {
          n: 'B-4471',
          idx: 1,
          tag: 'NOBU',
          contents: [{ species: 'Ahi Tuna', grade: 'A+', weight: 42.6 }],
        },
        // Vendor packed two species in one box
        {
          n: 'B-4472',
          idx: 2,
          tag: 'NOBU',
          contents: [
            { species: 'Ahi Tuna', grade: 'A+', weight: 38.1 },
            { species: 'Ono', grade: 'A', weight: 6.0 },
          ],
        },
        { n: 'B-4473', idx: 3, contents: [{ species: 'Ahi Tuna', grade: 'A+', weight: 40.2 }] },
        {
          n: 'B-4474',
          idx: 4,
          contents: [
            { species: 'Ono', grade: 'A', weight: 30.0 },
            { species: 'Ahi Tuna', grade: 'A', weight: 10.0 },
          ],
        },
        { n: 'B-4475', idx: 5, contents: [{ species: 'Ahi Tuna', grade: 'A+', weight: 39.5 }] },
        { n: 'B-4476', idx: 6, contents: [{ species: 'Ahi Tuna', grade: 'A+', weight: 41.8 }] },
      ],
    },
    {
      lot: 'LOT-2208',
      vendor: 'Pacific Blue Co.',
      received: 'Jun 23 · 05:52',
      status: 'available',
      boxes: [
        {
          n: 'B-4520',
          idx: 1,
          tag: 'MORI',
          contents: [{ species: 'Salmon', grade: 'A', weight: 31.2 }],
        },
        {
          n: 'B-4521',
          idx: 2,
          contents: [
            { species: 'Salmon', grade: 'A', weight: 33.5 },
            { species: 'Hamachi', grade: 'A+', weight: 4.0 },
          ],
        },
        { n: 'B-4522', idx: 3, contents: [{ species: 'Salmon', grade: 'A', weight: 29.8 }] },
        { n: 'B-4523', idx: 4, contents: [{ species: 'Salmon', grade: 'A', weight: 34.1 }] },
      ],
    },
    {
      lot: 'LOT-2209',
      vendor: 'Island Seafood',
      received: 'Jun 23 · 06:05',
      status: 'received',
      boxes: [
        { n: 'B-4560', idx: 1, contents: [{ species: 'Ono', grade: 'A', weight: 29.8 }] },
        {
          n: 'B-4561',
          idx: 2,
          contents: [
            { species: 'Ono', grade: 'A', weight: 20.0 },
            { species: 'Mahi-Mahi', grade: 'A', weight: 13.5 },
          ],
        },
        { n: 'B-4562', idx: 3, contents: [{ species: 'Ono', grade: 'A', weight: 26.4 }] },
      ],
    },
    {
      lot: 'LOT-2205',
      vendor: 'Kona Fresh Catch',
      received: 'Jun 22 · 06:10',
      status: 'shipped',
      boxes: [
        {
          n: 'B-4410',
          idx: 1,
          tag: 'ROY',
          contents: [{ species: 'Hamachi', grade: 'A+', weight: 22.4 }],
        },
        {
          n: 'B-4411',
          idx: 2,
          tag: 'ROY',
          contents: [{ species: 'Hamachi', grade: 'A+', weight: 24.1 }],
        },
        {
          n: 'B-4412',
          idx: 3,
          tag: 'WONG',
          contents: [{ species: 'Hamachi', grade: 'A+', weight: 23.8 }],
        },
      ],
    },
  ];

  const statusMeta: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    received: { label: 'Received', color: '#8A5A14', bg: '#F4EEE2', dot: '#B7791F' },
    available: { label: 'Available', color: '#2E6347', bg: '#EAF1ED', dot: '#3F7D5B' },
    allocated: { label: 'Allocated', color: '#2D5365', bg: '#EEF3F6', dot: '#3F6F86' },
    shipped: { label: 'Shipped', color: '#5A6670', bg: '#EEF0F2', dot: '#8A99A3' },
  };

  const boxWeight = (b: Box) => b.contents.reduce((a, c) => a + c.weight, 0);
  const lotSpecies = (lot: Lot) =>
    Array.from(new Set(lot.boxes.flatMap((b) => b.contents.map((c) => c.species))));

  const filteredLots = filter === 'all' ? lotData : lotData.filter((l) => l.status === filter);

  const toggleExpanded = (lot: string) => setExpanded((prev) => ({ ...prev, [lot]: !prev[lot] }));

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
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px' }}>
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
                gridTemplateColumns: '30px 128px 1fr 90px 96px 110px 132px',
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
              <span style={{ textAlign: 'right' }}>BOXES</span>
              <span style={{ textAlign: 'right' }}>WEIGHT</span>
              <span>RECEIVED</span>
              <span>STATUS</span>
            </div>

            {/* LOT ROWS */}
            {filteredLots.map((lot) => {
              const isExpanded = !!expanded[lot.lot];
              const meta = statusMeta[lot.status];
              const totalWeight = lot.boxes.reduce((a, b) => a + boxWeight(b), 0);
              const species = lotSpecies(lot);

              return (
                <div key={lot.lot} style={{ borderBottom: '1px solid #EDEFF1' }}>
                  {/* LOT ROW */}
                  <div
                    onClick={() => toggleExpanded(lot.lot)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '30px 128px 1fr 90px 96px 110px 132px',
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
                      (e.currentTarget as HTMLElement).style.background = isExpanded
                        ? '#FAFBFB'
                        : 'transparent';
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
                    <span
                      style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>
                        {species.length > 1 ? `Mixed · ${species.length} species` : species[0]}
                      </span>
                      {species.length > 1 && (
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            color: '#8A5A14',
                            background: '#F4EEE2',
                            border: '1px solid #E4D2A8',
                            borderRadius: '2px',
                            padding: '1px 6px',
                          }}
                        >
                          MIXED
                        </span>
                      )}
                      <span style={{ fontSize: '12px', color: '#8A99A3' }}> · {lot.vendor}</span>
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
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                          gap: '8px',
                        }}
                      >
                        {lot.boxes.map((box) => {
                          const mixed = new Set(box.contents.map((c) => c.species)).size > 1;
                          return (
                            <div
                              key={box.n}
                              style={{
                                background: '#fff',
                                border: '1px solid #E2E6E9',
                                borderLeft: `3px solid ${meta.dot}`,
                                borderRadius: '4px',
                                padding: '9px 11px',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '6px',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span
                                    style={{
                                      fontFamily: "'IBM Plex Mono', monospace",
                                      fontSize: '12px',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {box.n}
                                  </span>
                                  {mixed && (
                                    <span
                                      style={{
                                        fontSize: '8px',
                                        fontWeight: 700,
                                        letterSpacing: '0.04em',
                                        color: '#8A5A14',
                                        background: '#F4EEE2',
                                        border: '1px solid #E4D2A8',
                                        borderRadius: '2px',
                                        padding: '1px 5px',
                                      }}
                                    >
                                      MIXED
                                    </span>
                                  )}
                                </div>
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

                              {/* species breakdown within the box */}
                              <div
                                style={{
                                  marginTop: '8px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '5px',
                                }}
                              >
                                {box.contents.map((c, i) => (
                                  <div
                                    key={i}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: '8px',
                                    }}
                                  >
                                    <span
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        minWidth: 0,
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: '12px',
                                          fontWeight: 500,
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                        }}
                                      >
                                        {c.species}
                                      </span>
                                      <span
                                        style={{
                                          fontSize: '9px',
                                          fontWeight: 700,
                                          color: '#5A6670',
                                          border: '1px solid #D6DCE0',
                                          borderRadius: '2px',
                                          padding: '0 4px',
                                        }}
                                      >
                                        {c.grade}
                                      </span>
                                    </span>
                                    <span
                                      style={{
                                        fontFamily: "'IBM Plex Mono', monospace",
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        flex: 'none',
                                      }}
                                    >
                                      {c.weight}
                                      <span
                                        style={{
                                          fontSize: '9px',
                                          color: '#8A99A3',
                                          fontWeight: 500,
                                        }}
                                      >
                                        {' '}
                                        lb
                                      </span>
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {mixed && (
                                <div
                                  style={{
                                    marginTop: '8px',
                                    paddingTop: '7px',
                                    borderTop: '1px solid #EDEFF1',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '10px',
                                    color: '#8A99A3',
                                  }}
                                >
                                  <span>#{box.idx} · box total</span>
                                  <span
                                    style={{
                                      fontFamily: "'IBM Plex Mono', monospace",
                                      fontWeight: 600,
                                      color: '#5A6670',
                                    }}
                                  >
                                    {boxWeight(box).toFixed(1)} lb
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
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
            <div
              style={{
                padding: '20px 24px',
                background: '#fff',
                borderBottom: '1px solid #E2E6E9',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
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
                    kona_fresh_packlist_0623.csv · 24 rows · multi-species boxes detected
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

            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px' }}>
              <p style={{ textAlign: 'center', color: '#8A99A3', fontSize: '14px' }}>
                Import preview — 24 rows ready. Rows sharing a box number are grouped into one
                multi-species box.
              </p>
            </div>

            <div
              style={{
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
                  onClick={() => setImportOpen(false)}
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
