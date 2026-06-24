'use client';

import { useState } from 'react';
import Nav from '../components/Nav';

interface Invoice {
  no: string;
  customer: string;
  terms: string;
  order: string;
  amount: number;
  status: 'pending' | 'failed' | 'synced';
  errMsg?: string;
  qboRef?: string;
}

interface Claim {
  id: string;
  customer: string;
  reason: string;
  ref: string;
  lot: string;
  amount: number;
  status: 'open' | 'approved' | 'countered';
  resolvedNote?: string;
}

export default function FinanceQueuePage() {
  const [tab, setTab] = useState<'invoices' | 'claims'>('invoices');
  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      no: 'INV-2208',
      customer: 'Nobu',
      terms: 'Tier 1 · Net 15',
      order: '#2208',
      amount: 2814.2,
      status: 'pending',
    },
    {
      no: 'INV-2207',
      customer: 'Morimoto',
      terms: 'Tier 1 · Net 15',
      order: '#2207',
      amount: 1640.5,
      status: 'pending',
    },
    {
      no: 'INV-2205',
      customer: "Roy's",
      terms: 'Tier 2 · Net 30',
      order: '#2205',
      amount: 1320.0,
      status: 'failed',
      errMsg: 'QBO: customer not mapped',
    },
    {
      no: 'INV-2204',
      customer: "Alan Wong's",
      terms: 'Tier 2 · Net 30',
      order: '#2204',
      amount: 980.75,
      status: 'pending',
    },
    {
      no: 'INV-2201',
      customer: 'Nobu',
      terms: 'Tier 1 · Net 15',
      order: '#2201',
      amount: 3120.0,
      status: 'synced',
      qboRef: 'QBO #4471',
    },
    {
      no: 'INV-2200',
      customer: "Tiki's Grill",
      terms: 'Tier 3 · COD',
      order: '#2200',
      amount: 642.3,
      status: 'synced',
      qboRef: 'QBO #4470',
    },
  ]);

  const [claims, setClaims] = useState<Claim[]>([
    {
      id: 'c1',
      customer: "Roy's",
      reason: 'Temp abuse on arrival — 2 boxes Ono above 40°F',
      ref: 'LOT-2209 · B-4560, B-4561',
      lot: 'LOT-2209',
      amount: -380.0,
      status: 'open',
    },
    {
      id: 'c2',
      customer: 'Morimoto',
      reason: 'Color downgrade — salmon graded A, arrived B',
      ref: 'LOT-2208 · B-4521',
      lot: 'LOT-2208',
      amount: -145.0,
      status: 'open',
    },
    {
      id: 'c3',
      customer: 'Nobu',
      reason: 'Short weight — box under stated by 2.1 lb',
      ref: 'LOT-2207 · B-4472',
      lot: 'LOT-2207',
      amount: -59.8,
      status: 'approved',
      resolvedNote:
        'Approved by Blanca · QBO credit memo CM-118 issued · vendor recon updated.',
    },
  ]);

  const syncInvoice = (no: string) => {
    setInvoices((prev) =>
      prev.map((i) =>
        i.no === no
          ? {
              ...i,
              status: 'synced',
              qboRef: 'QBO #' + (4480 + Math.floor(Math.random() * 40)),
              errMsg: undefined,
            }
          : i
      )
    );
  };

  const approveClaim = (id: string) => {
    setClaims((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: 'approved',
              resolvedNote:
                'Approved · QBO credit memo issued · vendor recon updated.',
            }
          : c
      )
    );
  };

  const counterClaim = (id: string) => {
    setClaims((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: 'countered',
              resolvedNote: 'Countered — offer sent to customer for review.',
            }
          : c
      )
    );
  };

  const money = (n: number) => {
    const v = Math.abs(n).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return (n < 0 ? '−$' : '$') + v;
  };

  const invMeta = (st: Invoice['status']) => {
    return {
      pending: { label: 'Pending review', color: '#5A6670', bg: '#EEF0F2', dot: '#8A99A3' },
      failed: { label: 'Failed sync', color: '#A5362C', bg: '#FBF0EF', dot: '#C2453A' },
      synced: { label: 'Synced', color: '#2E6347', bg: '#EAF1ED', dot: '#3F7D5B' },
    }[st];
  };

  const tabStyle = (on: boolean): React.CSSProperties => ({
    fontFamily: "'Archivo',sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '4px',
    padding: '6px 13px',
    cursor: 'pointer',
    background: on ? '#3F6F86' : 'none',
    color: on ? '#fff' : '#5A6670',
  });

  const pending = invoices.filter((i) => i.status === 'pending');
  const failed = invoices.filter((i) => i.status === 'failed');
  const synced = invoices.filter((i) => i.status === 'synced');
  const sumAmt = (arr: Invoice[]) => money(arr.reduce((a, i) => a + i.amount, 0));

  const invoicesList = invoices.map((i) => {
    const m = invMeta(i.status);
    const isPending = i.status === 'pending';
    const isFailed = i.status === 'failed';
    const isSynced = i.status === 'synced';
    const left = isFailed ? '#C2453A' : isSynced ? '#3F7D5B' : '#8A99A3';
    return {
      no: i.no,
      customer: i.customer,
      terms: i.terms,
      order: i.order,
      amount: money(i.amount),
      rowStyle: {
        display: 'grid',
        gridTemplateColumns: '120px 1fr 96px 130px 150px 168px',
        gap: 0,
        alignItems: 'center',
        padding: '13px 18px',
        borderBottom: '1px solid #EDEFF1',
        borderLeft: `3px solid ${left}`,
        background: isFailed ? '#FDF7F6' : 'transparent',
      } as React.CSSProperties,
      statusLabel: m.label,
      statusStyle: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '11px',
        fontWeight: 600,
        color: m.color,
        background: m.bg,
        borderRadius: '3px',
        padding: '3px 9px',
      } as React.CSSProperties,
      dotStyle: {
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: m.dot,
      } as React.CSSProperties,
      errMsg: i.errMsg || null,
      actionable: isPending || isFailed,
      synced: isSynced,
      qboRef: i.qboRef || '',
      actionLabel: isFailed ? 'Fix & retry' : 'Approve & sync',
      actionStyle: {
        fontFamily: "'Archivo',sans-serif",
        fontSize: '12px',
        fontWeight: 600,
        borderRadius: '5px',
        padding: '8px 14px',
        cursor: 'pointer',
        background: isFailed ? '#fff' : '#222A30',
        color: isFailed ? '#A5362C' : '#fff',
        border: isFailed ? '1px solid #E3B6B1' : 'none',
      } as React.CSSProperties,
      onAction: () => syncInvoice(i.no),
    };
  });

  const claimMeta = (st: Claim['status']) => ({
    open: { label: 'Open', color: '#8A5A14', bg: '#F4EEE2' },
    approved: { label: 'Approved', color: '#2E6347', bg: '#EAF1ED' },
    countered: { label: 'Countered', color: '#5A6670', bg: '#EEF0F2' },
  })[st];

  const claimsList = claims.map((c) => {
    const m = claimMeta(c.status);
    const open = c.status === 'open';
    return {
      customer: c.customer,
      reason: c.reason,
      ref: c.ref,
      lot: c.lot,
      amount: money(c.amount),
      amtStyle: { color: '#A5362C' } as React.CSSProperties,
      icon: '!',
      iconStyle: {
        flex: 'none',
        width: '30px',
        height: '30px',
        borderRadius: '6px',
        background: '#F4EEE2',
        color: '#B7791F',
        fontSize: '16px',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      } as React.CSSProperties,
      statusLabel: m.label,
      statusStyle: {
        fontSize: '11px',
        fontWeight: 600,
        color: m.color,
        background: m.bg,
        borderRadius: '3px',
        padding: '2px 9px',
      } as React.CSSProperties,
      cardStyle: {
        background: '#fff',
        border: '1px solid #E2E6E9',
        borderLeft: `3px solid ${open ? '#B7791F' : c.status === 'approved' ? '#3F7D5B' : '#8A99A3'}`,
        borderRadius: '8px',
        padding: '18px 20px',
      } as React.CSSProperties,
      open,
      resolved: !open,
      resolvedNote: c.resolvedNote,
      onApprove: () => approveClaim(c.id),
      onCounter: () => counterClaim(c.id),
    };
  });

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span
              style={{
                fontSize: '16px',
                fontWeight: 700,
                letterSpacing: '-0.01em',
              }}
            >
              Finance Queue
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
              <button
                onClick={() => setTab('invoices')}
                style={tabStyle(tab === 'invoices')}
              >
                Invoices · QBO
              </button>
              <button
                onClick={() => setTab('claims')}
                style={tabStyle(tab === 'claims')}
              >
                Credit claims
              </button>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '11px',
              color: '#8A99A3',
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3F7D5B"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="9" />
              <path
                d="M8 12l3 3 5-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>QuickBooks connected · last sync 06:02</span>
          </div>
        </header>

        <div
          className="mana-scroll"
          style={{ flex: 1, overflowY: 'auto', padding: '22px 28px' }}
        >
          {/* INVOICES */}
          {tab === 'invoices' && (
            <div>
              {/* summary strip */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3,1fr)',
                  gap: '14px',
                  marginBottom: '20px',
                }}
              >
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid #E2E6E9',
                    borderLeft: '3px solid #8A99A3',
                    borderRadius: '6px',
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
                    PENDING APPROVAL
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '8px',
                      marginTop: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '24px',
                        fontWeight: 600,
                      }}
                    >
                      {pending.length}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '14px',
                        color: '#5A6670',
                      }}
                    >
                      {sumAmt(pending)}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid #E3B6B1',
                    borderLeft: '3px solid #C2453A',
                    borderRadius: '6px',
                    padding: '16px 18px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      color: '#A5362C',
                    }}
                  >
                    FAILED SYNC — NEEDS ATTENTION
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '8px',
                      marginTop: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '24px',
                        fontWeight: 600,
                        color: '#A5362C',
                      }}
                    >
                      {failed.length}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '14px',
                        color: '#A5362C',
                      }}
                    >
                      {sumAmt(failed)}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid #BFD8C9',
                    borderLeft: '3px solid #3F7D5B',
                    borderRadius: '6px',
                    padding: '16px 18px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      color: '#2E6347',
                    }}
                  >
                    SYNCED TODAY
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '8px',
                      marginTop: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '24px',
                        fontWeight: 600,
                        color: '#2E6347',
                      }}
                    >
                      {synced.length}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '14px',
                        color: '#2E6347',
                      }}
                    >
                      {sumAmt(synced)}
                    </span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: '#fff',
                  border: '1px solid #E2E6E9',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '120px 1fr 96px 130px 150px 168px',
                    gap: 0,
                    padding: '11px 18px',
                    background: '#FAFBFB',
                    borderBottom: '1px solid #E2E6E9',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    color: '#8A99A3',
                  }}
                >
                  <span>INVOICE</span>
                  <span>CUSTOMER</span>
                  <span>ORDER</span>
                  <span style={{ textAlign: 'right' }}>AMOUNT</span>
                  <span style={{ paddingLeft: '18px' }}>QBO STATUS</span>
                  <span style={{ textAlign: 'right' }}>ACTION</span>
                </div>
                {invoicesList.map((iv, i) => (
                  <div key={i} style={iv.rowStyle}>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      {iv.no}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>
                        {iv.customer}
                      </span>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '11px',
                          color: '#8A99A3',
                          marginTop: '1px',
                        }}
                      >
                        {iv.terms}
                      </span>
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '12px',
                        color: '#5A6670',
                      }}
                    >
                      {iv.order}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '14px',
                        fontWeight: 600,
                        textAlign: 'right',
                      }}
                    >
                      {iv.amount}
                    </span>
                    <span style={{ paddingLeft: '18px' }}>
                      <span style={iv.statusStyle}>
                        <span style={iv.dotStyle}></span>
                        {iv.statusLabel}
                      </span>
                      {iv.errMsg && (
                        <span
                          style={{
                            display: 'block',
                            fontSize: '10px',
                            color: '#A5362C',
                            marginTop: '4px',
                          }}
                        >
                          {iv.errMsg}
                        </span>
                      )}
                    </span>
                    <span style={{ textAlign: 'right' }}>
                      {iv.actionable && (
                        <button onClick={iv.onAction} style={iv.actionStyle}>
                          {iv.actionLabel}
                        </button>
                      )}
                      {iv.synced && (
                        <span
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '11px',
                            color: '#8A99A3',
                          }}
                        >
                          {iv.qboRef}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CLAIMS */}
          {tab === 'claims' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                maxWidth: '920px',
              }}
            >
              {claimsList.map((c, i) => (
                <div key={i} style={c.cardStyle}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '18px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '14px',
                        minWidth: 0,
                      }}
                    >
                      <span style={c.iconStyle}>{c.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                          }}
                        >
                          <span style={{ fontSize: '15px', fontWeight: 700 }}>
                            {c.customer}
                          </span>
                          <span style={c.statusStyle}>{c.statusLabel}</span>
                        </div>
                        <div
                          style={{
                            fontSize: '13px',
                            color: '#5A6670',
                            marginTop: '4px',
                          }}
                        >
                          {c.reason}
                        </div>
                        <div
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '11px',
                            color: '#8A99A3',
                            marginTop: '7px',
                          }}
                        >
                          {c.ref}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flex: 'none' }}>
                      <div
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                          color: '#8A99A3',
                        }}
                      >
                        CLAIMED
                      </div>
                      <div
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '20px',
                          fontWeight: 600,
                          marginTop: '3px',
                          ...c.amtStyle,
                        }}
                      >
                        {c.amount}
                      </div>
                    </div>
                  </div>
                  {c.open && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        marginTop: '16px',
                        paddingTop: '14px',
                        borderTop: '1px solid #EDEFF1',
                      }}
                    >
                      <span style={{ fontSize: '12px', color: '#8A99A3' }}>
                        Affects vendor reconciliation for {c.lot}
                      </span>
                      <div style={{ display: 'flex', gap: '9px' }}>
                        <button
                          onClick={c.onCounter}
                          style={{
                            fontFamily: "'Archivo', sans-serif",
                            fontSize: '13px',
                            fontWeight: 600,
                            background: '#fff',
                            color: '#5A6670',
                            border: '1px solid #D6DCE0',
                            borderRadius: '5px',
                            padding: '9px 16px',
                            cursor: 'pointer',
                          }}
                        >
                          Counter
                        </button>
                        <button
                          onClick={c.onApprove}
                          style={{
                            fontFamily: "'Archivo', sans-serif",
                            fontSize: '13px',
                            fontWeight: 600,
                            background: '#222A30',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '5px',
                            padding: '9px 16px',
                            cursor: 'pointer',
                          }}
                        >
                          Approve credit
                        </button>
                      </div>
                    </div>
                  )}
                  {c.resolved && (
                    <div
                      style={{
                        marginTop: '14px',
                        paddingTop: '12px',
                        borderTop: '1px solid #EDEFF1',
                        fontSize: '12px',
                        color: '#5A6670',
                      }}
                    >
                      {c.resolvedNote}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
