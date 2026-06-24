'use client';

import { useState } from 'react';
import Nav from '../components/Nav';

type VendorTab = 'kona' | 'pacific' | 'island';

interface DocData {
  no: string;
  period: string;
  vendor: string;
  vendorSub: string;
  lot: string;
  species: string;
  sellThrough: string;
  boxesLine: string;
  soldLines: Array<{ label: string; weight: string; rate: string; ext: string }>;
  gross: string;
  credits: Array<{ box: string; reason: string; amount: string }>;
  creditTotal: string;
  net: string;
  terms: string;
  note: string;
}

export default function VendorReconciliationPage() {
  const [tab, setTab] = useState<VendorTab>('kona');

  const print = () => {
    window.print();
  };

  const docs: Record<VendorTab, DocData> = {
    kona: {
      no: 'VR-2207',
      period: 'Jun 16–22, 2026',
      vendor: 'Kona Fresh Catch',
      vendorSub: 'Honolulu, HI · vendor #KFC-01',
      lot: 'LOT-2207',
      species: 'Ahi Tuna · Grade A+',
      sellThrough: '100% · 6/6 boxes',
      boxesLine: '246.2 lb received',
      soldLines: [
        { label: 'Nobu · A+', weight: '80.7 lb', rate: '$18.50', ext: '$1,492.95' },
        { label: 'Morimoto · A+', weight: '78.3 lb', rate: '$18.50', ext: '$1,448.55' },
        { label: "Roy's · A", weight: '44.6 lb', rate: '$16.00', ext: '$713.60' },
        { label: "Alan Wong's · A", weight: '42.6 lb', rate: '$16.00', ext: '$681.60' },
      ],
      gross: '$4,336.70',
      credits: [
        { box: 'B-4472', reason: 'Short weight — 2.1 lb under stated', amount: '−$38.85' },
        { box: 'B-4474', reason: 'Temp abuse on arrival — grade drop', amount: '−$45.00' },
      ],
      creditTotal: '−$83.85',
      net: '$4,252.85',
      terms: 'Net 14',
      note: 'Net of agreed cost basis less documented quality downgrades. Credit memos CM-117, CM-119 attached. Remit via Bill.com on file.',
    },
    pacific: {
      no: 'VR-2208',
      period: 'Jun 16–22, 2026',
      vendor: 'Pacific Blue Co.',
      vendorSub: 'Seattle, WA · vendor #PBC-04',
      lot: 'LOT-2208',
      species: 'Salmon · Grade A',
      sellThrough: '80% · 4/5 boxes',
      boxesLine: '159.2 lb received',
      soldLines: [
        { label: 'Morimoto · A', weight: '64.7 lb', rate: '$11.50', ext: '$744.05' },
        { label: "Tiki's Grill · A", weight: '30.6 lb', rate: '$10.50', ext: '$321.30' },
        { label: 'Counter sales · A', weight: '33.5 lb', rate: '$11.00', ext: '$368.50' },
      ],
      gross: '$1,433.85',
      credits: [
        { box: 'B-4521', reason: 'Color downgrade — A graded, arrived B', amount: '−$145.00' },
      ],
      creditTotal: '−$145.00',
      net: '$1,288.85',
      terms: 'Net 14',
      note: 'One box unsold and rolled to next lot. Credit memo CM-118 attached for color downgrade. Remit via Bill.com on file.',
    },
    island: {
      no: 'VR-2209',
      period: 'Jun 16–22, 2026',
      vendor: 'Island Seafood',
      vendorSub: 'Hilo, HI · vendor #ISF-02',
      lot: 'LOT-2209',
      species: 'Ono · Grade A',
      sellThrough: 'In progress · 0/4 boxes',
      boxesLine: '118.6 lb received',
      soldLines: [{ label: 'Awaiting allocation', weight: '— —', rate: '$14.00', ext: '$0.00' }],
      gross: '$0.00',
      credits: [{ box: '—', reason: 'No credits recorded yet', amount: '$0.00' }],
      creditTotal: '$0.00',
      net: '$0.00',
      terms: 'Net 14',
      note: 'Lot received this morning, not yet sold through. Reconciliation finalizes at lot closeout.',
    },
  };

  const tabs = [
    ['kona', 'Kona Fresh · VR-2207'],
    ['pacific', 'Pacific Blue · VR-2208'],
    ['island', 'Island · VR-2209'],
  ].map(([k, label]) => {
    const on = tab === k;
    return {
      label: label as string,
      onClick: () => setTab(k as VendorTab),
      style: on
        ? {
            fontFamily: "'Archivo',sans-serif",
            fontSize: '12px',
            fontWeight: 600,
            border: 'none',
            borderRadius: '4px',
            padding: '6px 12px',
            cursor: 'pointer',
            background: '#3F6F86',
            color: '#fff',
          }
        : {
            fontFamily: "'Archivo',sans-serif",
            fontSize: '12px',
            fontWeight: 600,
            border: 'none',
            borderRadius: '4px',
            padding: '6px 12px',
            cursor: 'pointer',
            background: 'none',
            color: '#5A6670',
          },
    };
  });

  const doc = docs[tab];

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

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: 0,
        }}
      >
        <header
          className="no-print"
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span
              style={{
                fontSize: '16px',
                fontWeight: 700,
                letterSpacing: '-0.01em',
              }}
            >
              Vendor Reconciliation
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
              {tabs.map((t, i) => (
                <button key={i} onClick={t.onClick} style={t.style as React.CSSProperties}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
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
                <path d="M4 6l8 6 8-6" />
                <rect x="3" y="5" width="18" height="14" rx="2" />
              </svg>
              Email vendor
            </button>
            <button
              onClick={print}
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
              Print / PDF
            </button>
          </div>
        </header>

        <div
          className="mana-scroll"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '28px',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            className="recon-doc"
            style={{
              width: '780px',
              maxWidth: '100%',
              background: '#fff',
              border: '1px solid #E2E6E9',
              borderRadius: '6px',
              boxShadow: '0 4px 18px rgba(34,42,48,0.07)',
              position: 'relative',
            }}
          >
            {/* header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: '36px 44px 24px',
                borderBottom: '2px solid #222A30',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    border: '2px solid #222A30',
                    borderRadius: '3px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '13px',
                      height: '13px',
                      border: '2px solid #3F6F86',
                      borderRadius: '1px',
                    }}
                  ></div>
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
                    SEAFOOD DISTRIBUTION · SFO
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
                  Vendor Reconciliation
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '12px',
                    color: '#5A6670',
                    marginTop: '6px',
                  }}
                >
                  {doc.no} · {doc.period}
                </div>
              </div>
            </div>

            {/* vendor + lot meta */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.3fr 1fr 1fr',
                gap: 0,
                borderBottom: '1px solid #E2E6E9',
              }}
            >
              <div
                style={{
                  padding: '20px 44px',
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
                  SETTLEMENT TO
                </div>
                <div
                  style={{
                    fontSize: '17px',
                    fontWeight: 700,
                    marginTop: '6px',
                  }}
                >
                  {doc.vendor}
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: '#5A6670',
                    marginTop: '3px',
                  }}
                >
                  {doc.vendorSub}
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
                  LOT
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '14px',
                    fontWeight: 600,
                    marginTop: '6px',
                  }}
                >
                  {doc.lot}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#8A99A3',
                    marginTop: '3px',
                  }}
                >
                  {doc.species}
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
                  SELL-THROUGH
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '14px',
                    fontWeight: 600,
                    marginTop: '6px',
                  }}
                >
                  {doc.sellThrough}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#8A99A3',
                    marginTop: '3px',
                  }}
                >
                  {doc.boxesLine}
                </div>
              </div>
            </div>

            {/* settlement table */}
            <div style={{ padding: '26px 44px 8px' }}>
              {/* sold */}
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '11px',
                  letterSpacing: '0.1em',
                  color: '#5A6670',
                  marginBottom: '12px',
                }}
              >
                SOLD THIS LOT
              </div>
              <div
                style={{
                  border: '1px solid #E2E6E9',
                  borderRadius: '5px',
                  overflow: 'hidden',
                  marginBottom: '22px',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 90px 110px 120px',
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
                  <span>CUSTOMER · GRADE</span>
                  <span style={{ textAlign: 'right' }}>WEIGHT</span>
                  <span style={{ textAlign: 'right' }}>$/LB</span>
                  <span style={{ textAlign: 'right' }}>EXTENDED</span>
                </div>
                {doc.soldLines.map((ln, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 90px 110px 120px',
                      gap: 0,
                      alignItems: 'center',
                      padding: '10px 16px',
                      borderBottom: '1px solid #EDEFF1',
                    }}
                  >
                    <span style={{ fontSize: '13px' }}>{ln.label}</span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '13px',
                        textAlign: 'right',
                      }}
                    >
                      {ln.weight}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '13px',
                        color: '#5A6670',
                        textAlign: 'right',
                      }}
                    >
                      {ln.rate}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '13px',
                        fontWeight: 600,
                        textAlign: 'right',
                      }}
                    >
                      {ln.ext}
                    </span>
                  </div>
                ))}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 120px',
                    gap: 0,
                    alignItems: 'center',
                    padding: '11px 16px',
                    background: '#FAFBFB',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#5A6670',
                    }}
                  >
                    Vendor cost basis · gross
                  </span>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '14px',
                      fontWeight: 700,
                      textAlign: 'right',
                    }}
                  >
                    {doc.gross}
                  </span>
                </div>
              </div>

              {/* credits */}
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '11px',
                  letterSpacing: '0.1em',
                  color: '#8A5A14',
                  marginBottom: '12px',
                }}
              >
                LESS · QUALITY DOWNGRADE CREDITS
              </div>
              <div
                style={{
                  border: '1px solid #E4D2A8',
                  borderRadius: '5px',
                  overflow: 'hidden',
                  marginBottom: '8px',
                  background: '#FDFAF3',
                }}
              >
                {doc.credits.map((cr, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '120px 1fr 120px',
                      gap: 0,
                      alignItems: 'center',
                      padding: '11px 16px',
                      borderBottom: '1px solid #F0E4C8',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      {cr.box}
                    </span>
                    <span style={{ fontSize: '13px', color: '#5A6670' }}>
                      {cr.reason}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '13px',
                        fontWeight: 600,
                        textAlign: 'right',
                        color: '#A5362C',
                      }}
                    >
                      {cr.amount}
                    </span>
                  </div>
                ))}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 120px',
                    gap: 0,
                    alignItems: 'center',
                    padding: '11px 16px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#8A5A14',
                    }}
                  >
                    Total credits
                  </span>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '14px',
                      fontWeight: 700,
                      textAlign: 'right',
                      color: '#A5362C',
                    }}
                  >
                    {doc.creditTotal}
                  </span>
                </div>
              </div>
            </div>

            {/* net + stamp */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                gap: '20px',
                padding: '18px 44px 36px',
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    color: '#8A99A3',
                    marginBottom: '7px',
                  }}
                >
                  REMIT NOTE
                </div>
                <div
                  style={{
                    fontFamily: "'Newsreader', serif",
                    fontSize: '14px',
                    lineHeight: 1.5,
                    color: '#222A30',
                    maxWidth: '300px',
                  }}
                >
                  {doc.note}
                </div>
              </div>
              <div
                style={{
                  flex: 'none',
                  alignSelf: 'center',
                  paddingBottom: '6px',
                }}
              >
                <div
                  style={{
                    fontFamily: "'Archivo', sans-serif",
                    fontWeight: 700,
                    fontSize: '17px',
                    letterSpacing: '0.1em',
                    color: '#B7791F',
                    border: '3px solid #B7791F',
                    borderRadius: '6px',
                    padding: '6px 13px',
                    transform: 'rotate(-8deg)',
                    opacity: 0.9,
                  }}
                >
                  CREDITS APPLIED
                </div>
              </div>
              <div style={{ textAlign: 'right', flex: 'none' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: '#8A99A3',
                  }}
                >
                  NET DUE TO VENDOR
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '34px',
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    marginTop: '6px',
                  }}
                >
                  {doc.net}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#8A99A3',
                    marginTop: '4px',
                  }}
                >
                  Terms · {doc.terms}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
