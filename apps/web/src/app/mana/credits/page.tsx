'use client';

import { useState } from 'react';
import Nav from '../components/Nav';

interface Claim {
  id: string;
  customer: string;
  order: string;
  lot: string;
  boxes: string;
  species: string;
  reason: string;
  claimedBy: string;
  date: string;
  amount: number;
  status: 'open' | 'approved' | 'countered' | 'rejected';
  qboRef?: string;
  resolvedNote?: string;
  salesRep: string;
}

interface Downgrade {
  id: string;
  lot: string;
  box: string;
  species: string;
  fromGrade: string;
  toGrade: string;
  reason: string;
  vendor: string;
  weightLb: number;
  impact: number;
  date: string;
  status: 'pending' | 'applied' | 'disputed';
}

const SEED_CLAIMS: Claim[] = [
  {
    id: 'CR-041',
    customer: "Roy's",
    order: '#2205',
    lot: 'LOT-2209',
    boxes: 'B-4560, B-4561',
    species: 'Ono',
    reason: 'Temp abuse on arrival — 2 boxes above 40°F',
    claimedBy: 'Roy Yamaguchi',
    date: 'Jun 23',
    amount: -380.0,
    status: 'open',
    salesRep: 'Blanca',
  },
  {
    id: 'CR-040',
    customer: 'Morimoto',
    order: '#2207',
    lot: 'LOT-2208',
    boxes: 'B-4521',
    species: 'Salmon',
    reason: 'Color downgrade — graded A, arrived B',
    claimedBy: 'M. Kitchen',
    date: 'Jun 23',
    amount: -145.0,
    status: 'open',
    salesRep: 'Blanca',
  },
  {
    id: 'CR-039',
    customer: 'Nobu',
    order: '#2201',
    lot: 'LOT-2207',
    boxes: 'B-4472',
    species: 'Ahi Tuna',
    reason: 'Short weight — box under stated by 2.1 lb',
    claimedBy: 'Nobu Matsuhisa',
    date: 'Jun 22',
    amount: -59.8,
    status: 'approved',
    qboRef: 'CM-118',
    resolvedNote: 'Approved by Blanca · QBO credit memo CM-118 issued · vendor recon updated.',
    salesRep: 'Blanca',
  },
  {
    id: 'CR-037',
    customer: "Alan Wong's",
    order: '#2195',
    lot: 'LOT-2201',
    boxes: 'B-4380',
    species: 'Hamachi',
    reason: 'Wrong species delivered — ordered Hamachi, received Yellowtail',
    claimedBy: 'Alan Wong',
    date: 'Jun 19',
    amount: -210.0,
    status: 'countered',
    resolvedNote: 'Counter offer sent: partial credit $105 · awaiting customer response.',
    salesRep: 'Blanca',
  },
];

const SEED_DOWNGRADES: Downgrade[] = [
  {
    id: 'DG-018',
    lot: 'LOT-2209',
    box: 'B-4563',
    species: 'Ono',
    fromGrade: 'A',
    toGrade: 'B',
    reason: 'Surface oxidation — caught in transit delay',
    vendor: 'Island Seafood',
    weightLb: 28.9,
    impact: -86.7,
    date: 'Jun 23',
    status: 'applied',
  },
  {
    id: 'DG-017',
    lot: 'LOT-2208',
    box: 'B-4522',
    species: 'Salmon',
    fromGrade: 'A',
    toGrade: 'B',
    reason: 'Minor color inconsistency on inspection',
    vendor: 'Pacific Blue Co.',
    weightLb: 29.8,
    impact: -59.6,
    date: 'Jun 23',
    status: 'pending',
  },
  {
    id: 'DG-016',
    lot: 'LOT-2205',
    box: 'B-4410',
    species: 'Hamachi',
    fromGrade: 'A+',
    toGrade: 'A',
    reason: 'Packing list overstated grade',
    vendor: 'Kona Fresh Catch',
    weightLb: 22.4,
    impact: -44.8,
    date: 'Jun 22',
    status: 'applied',
  },
];

export default function CreditsPage() {
  const [tab, setTab] = useState<'claims' | 'downgrades'>('claims');
  const [claims, setClaims] = useState<Claim[]>(SEED_CLAIMS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({
    customer: '',
    order: '',
    lot: '',
    boxes: '',
    reason: '',
    amount: '',
    salesRep: '',
  });

  const money = (n: number) => {
    const v = Math.abs(n).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return (n < 0 ? '−$' : '$') + v;
  };

  const approveClaim = (id: string) => {
    setClaims((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: 'approved',
              qboRef: 'CM-' + (119 + prev.filter((x) => x.status === 'approved').length),
              resolvedNote: 'Approved · QBO credit memo issued · vendor recon flagged.',
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
              resolvedNote: 'Counter offer sent · awaiting customer response.',
            }
          : c
      )
    );
  };

  const rejectClaim = (id: string) => {
    setClaims((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: 'rejected',
              resolvedNote: 'Rejected — reason logged for vendor review.',
            }
          : c
      )
    );
  };

  const submitClaim = () => {
    if (!form.customer || !form.reason || !form.amount) return;
    const newClaim: Claim = {
      id: 'CR-' + (Math.floor(Math.random() * 900) + 100),
      customer: form.customer,
      order: form.order || '—',
      lot: form.lot || '—',
      boxes: form.boxes || '—',
      species: '—',
      reason: form.reason,
      claimedBy: form.customer,
      date: 'Jun 26',
      amount: -Math.abs(parseFloat(form.amount) || 0),
      status: 'open',
      salesRep: form.salesRep || 'Blanca',
    };
    setClaims((prev) => [newClaim, ...prev]);
    setForm({ customer: '', order: '', lot: '', boxes: '', reason: '', amount: '', salesRep: '' });
    setDrawerOpen(false);
  };

  const open = claims.filter((c) => c.status === 'open');
  const approved = claims.filter((c) => c.status === 'approved');
  const resolved = claims.filter((c) => c.status !== 'open');

  const claimStatusMeta = (s: Claim['status']) =>
    ({
      open: { label: 'Open', color: '#8A5A14', bg: '#F4EEE2', border: '#B7791F' },
      approved: { label: 'Approved', color: '#2E6347', bg: '#EAF1ED', border: '#3F7D5B' },
      countered: { label: 'Countered', color: '#5A6670', bg: '#EEF0F2', border: '#8A99A3' },
      rejected: { label: 'Rejected', color: '#A5362C', bg: '#FBF0EF', border: '#C2453A' },
    })[s];

  const dgStatusMeta = (s: Downgrade['status']) =>
    ({
      pending: { label: 'Pending', color: '#8A5A14', bg: '#F4EEE2' },
      applied: { label: 'Applied', color: '#2E6347', bg: '#EAF1ED' },
      disputed: { label: 'Disputed', color: '#A5362C', bg: '#FBF0EF' },
    })[s];

  const tabStyle = (on: boolean): React.CSSProperties => ({
    fontFamily: "'Archivo', sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '4px',
    padding: '6px 13px',
    cursor: 'pointer',
    background: on ? '#3F6F86' : 'none',
    color: on ? '#fff' : '#5A6670',
  });

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
            <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              Credits &amp; Downgrades
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
              <button onClick={() => setTab('claims')} style={tabStyle(tab === 'claims')}>
                Credit claims · {open.length} open
              </button>
              <button onClick={() => setTab('downgrades')} style={tabStyle(tab === 'downgrades')}>
                Downgrade log
              </button>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
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
            New claim
          </button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px' }}>
          {/* CLAIMS TAB */}
          {tab === 'claims' && (
            <div>
              {/* summary strip */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3,1fr)',
                  gap: '14px',
                  marginBottom: '22px',
                }}
              >
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid #E3B6B1',
                    borderLeft: '3px solid #B7791F',
                    borderRadius: '6px',
                    padding: '16px 18px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      color: '#8A5A14',
                    }}
                  >
                    OPEN CLAIMS
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '10px',
                      marginTop: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '24px',
                        fontWeight: 600,
                        color: '#8A5A14',
                      }}
                    >
                      {open.length}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '14px',
                        color: '#8A5A14',
                      }}
                    >
                      {money(open.reduce((a, c) => a + c.amount, 0))}
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
                    APPROVED — QBO ISSUED
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '10px',
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
                      {approved.length}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '14px',
                        color: '#2E6347',
                      }}
                    >
                      {money(approved.reduce((a, c) => a + c.amount, 0))}
                    </span>
                  </div>
                </div>
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
                    RESOLVED THIS WEEK
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '10px',
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
                      {resolved.length}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '14px',
                        color: '#5A6670',
                      }}
                    >
                      {money(resolved.reduce((a, c) => a + c.amount, 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* claims list */}
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '11px', maxWidth: '960px' }}
              >
                {claims.map((c) => {
                  const m = claimStatusMeta(c.status);
                  const isOpen = c.status === 'open';
                  return (
                    <div
                      key={c.id}
                      style={{
                        background: '#fff',
                        border: '1px solid #E2E6E9',
                        borderLeft: `3px solid ${m.border}`,
                        borderRadius: '8px',
                        padding: '18px 20px',
                      }}
                    >
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
                          <div
                            style={{
                              flex: 'none',
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              background: '#F4EEE2',
                              color: '#B7791F',
                              fontSize: '17px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            !
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                flexWrap: 'wrap',
                              }}
                            >
                              <span style={{ fontSize: '15px', fontWeight: 700 }}>
                                {c.customer}
                              </span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: m.color,
                                  background: m.bg,
                                  borderRadius: '3px',
                                  padding: '2px 9px',
                                }}
                              >
                                {m.label}
                              </span>
                              {c.qboRef && (
                                <span
                                  style={{
                                    fontFamily: "'IBM Plex Mono', monospace",
                                    fontSize: '11px',
                                    color: '#3F7D5B',
                                    background: '#EAF1ED',
                                    borderRadius: '3px',
                                    padding: '2px 8px',
                                  }}
                                >
                                  {c.qboRef}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '13px', color: '#5A6670', marginTop: '5px' }}>
                              {c.reason}
                            </div>
                            <div
                              style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: '11px',
                                color: '#8A99A3',
                                marginTop: '7px',
                                display: 'flex',
                                gap: '14px',
                                flexWrap: 'wrap',
                              }}
                            >
                              <span>{c.id}</span>
                              <span>{c.order}</span>
                              <span>
                                {c.lot} · {c.boxes}
                              </span>
                              <span>Rep: {c.salesRep}</span>
                              <span>{c.date}</span>
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
                              color: '#A5362C',
                            }}
                          >
                            {money(c.amount)}
                          </div>
                        </div>
                      </div>

                      {isOpen && (
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
                            Affects vendor recon for {c.lot} · Lot impact logged on approval
                          </span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => rejectClaim(c.id)}
                              style={{
                                fontFamily: "'Archivo', sans-serif",
                                fontSize: '12px',
                                fontWeight: 600,
                                background: '#fff',
                                color: '#A5362C',
                                border: '1px solid #E3B6B1',
                                borderRadius: '5px',
                                padding: '8px 14px',
                                cursor: 'pointer',
                              }}
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => counterClaim(c.id)}
                              style={{
                                fontFamily: "'Archivo', sans-serif",
                                fontSize: '12px',
                                fontWeight: 600,
                                background: '#fff',
                                color: '#5A6670',
                                border: '1px solid #D6DCE0',
                                borderRadius: '5px',
                                padding: '8px 14px',
                                cursor: 'pointer',
                              }}
                            >
                              Counter
                            </button>
                            <button
                              onClick={() => approveClaim(c.id)}
                              style={{
                                fontFamily: "'Archivo', sans-serif",
                                fontSize: '12px',
                                fontWeight: 600,
                                background: '#222A30',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '5px',
                                padding: '8px 16px',
                                cursor: 'pointer',
                              }}
                            >
                              Approve &amp; issue credit
                            </button>
                          </div>
                        </div>
                      )}
                      {!isOpen && c.resolvedNote && (
                        <div
                          style={{
                            marginTop: '13px',
                            paddingTop: '11px',
                            borderTop: '1px solid #EDEFF1',
                            fontSize: '12px',
                            color: '#5A6670',
                          }}
                        >
                          {c.resolvedNote}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DOWNGRADES TAB */}
          {tab === 'downgrades' && (
            <div>
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
                    gridTemplateColumns: '90px 110px 80px 1fr 110px 80px 90px 100px 120px',
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
                  <span>ID</span>
                  <span>LOT · BOX</span>
                  <span>SPECIES</span>
                  <span>REASON</span>
                  <span>GRADE CHANGE</span>
                  <span style={{ textAlign: 'right' }}>WEIGHT</span>
                  <span style={{ textAlign: 'right' }}>IMPACT</span>
                  <span>DATE</span>
                  <span>STATUS</span>
                </div>
                {SEED_DOWNGRADES.map((d) => {
                  const m = dgStatusMeta(d.status);
                  return (
                    <div
                      key={d.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '90px 110px 80px 1fr 110px 80px 90px 100px 120px',
                        gap: 0,
                        alignItems: 'center',
                        padding: '13px 18px',
                        borderBottom: '1px solid #EDEFF1',
                        borderLeft: `3px solid ${d.status === 'applied' ? '#3F7D5B' : d.status === 'disputed' ? '#C2453A' : '#B7791F'}`,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        {d.id}
                      </span>
                      <div>
                        <div
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          {d.lot}
                        </div>
                        <div
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '11px',
                            color: '#8A99A3',
                            marginTop: '1px',
                          }}
                        >
                          {d.box}
                        </div>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>{d.species}</span>
                      <span style={{ fontSize: '12px', color: '#5A6670', paddingRight: '12px' }}>
                        {d.reason}
                      </span>
                      <span>
                        <span
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#A5362C',
                          }}
                        >
                          {d.fromGrade} → {d.toGrade}
                        </span>
                      </span>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '13px',
                          textAlign: 'right',
                        }}
                      >
                        {d.weightLb} lb
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
                        {money(d.impact)}
                      </span>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '12px',
                          color: '#5A6670',
                        }}
                      >
                        {d.date}
                      </span>
                      <span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: m.color,
                            background: m.bg,
                            borderRadius: '3px',
                            padding: '3px 9px',
                          }}
                        >
                          {m.label}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* NEW CLAIM DRAWER */}
      {drawerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(34,42,48,0.32)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 50,
          }}
          onClick={() => setDrawerOpen(false)}
        >
          <div
            style={{
              width: '480px',
              maxWidth: '94vw',
              height: '100%',
              background: '#F4F5F6',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-12px 0 40px rgba(34,42,48,0.18)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '20px 24px',
                background: '#fff',
                borderBottom: '1px solid #E2E6E9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
                  New credit claim
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '12px',
                    color: '#8A99A3',
                    marginTop: '3px',
                  }}
                >
                  Claim will be routed for approval before QBO credit memo is issued
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
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

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div>
                <label style={labelStyle}>CUSTOMER *</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. Nobu, Roy's"
                  value={form.customer}
                  onChange={(e) => setForm((f) => ({ ...f, customer: e.target.value }))}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>ORDER REF</label>
                  <input
                    style={inputStyle}
                    placeholder="#2208"
                    value={form.order}
                    onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={labelStyle}>LOT</label>
                  <input
                    style={inputStyle}
                    placeholder="LOT-2209"
                    value={form.lot}
                    onChange={(e) => setForm((f) => ({ ...f, lot: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>BOXES AFFECTED</label>
                <input
                  style={inputStyle}
                  placeholder="B-4560, B-4561"
                  value={form.boxes}
                  onChange={(e) => setForm((f) => ({ ...f, boxes: e.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>CLAIM REASON *</label>
                <textarea
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                  placeholder="Describe the quality issue, temp abuse, short weight, etc."
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>CLAIM AMOUNT ($) *</label>
                  <input
                    style={inputStyle}
                    placeholder="380.00"
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={labelStyle}>SALES REP</label>
                  <input
                    style={inputStyle}
                    placeholder="Blanca"
                    value={form.salesRep}
                    onChange={(e) => setForm((f) => ({ ...f, salesRep: e.target.value }))}
                  />
                </div>
              </div>
              <div
                style={{
                  background: '#F4EEE2',
                  border: '1px solid #E8D5B0',
                  borderRadius: '5px',
                  padding: '11px 14px',
                  fontSize: '12px',
                  color: '#8A5A14',
                }}
              >
                Approving this claim will generate a QBO credit memo and flag the lot for vendor
                reconciliation.
              </div>
            </div>

            <div
              style={{
                padding: '16px 24px',
                background: '#fff',
                borderTop: '1px solid #E2E6E9',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <button
                onClick={() => setDrawerOpen(false)}
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
                onClick={submitClaim}
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: '13px',
                  fontWeight: 600,
                  background: '#222A30',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '10px 18px',
                  cursor: 'pointer',
                }}
              >
                Submit claim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
