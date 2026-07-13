'use client';

import { useEffect, useState } from 'react';
import Nav from '../components/Nav';
import { createClient } from '@/lib/supabase/client';

interface Claim {
  id: string;
  ref: string;
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
  counterAmount?: number;
  weightLb: number | null;
  photoPaths: string[];
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

interface ClaimRow {
  id: string;
  boxes: string | null;
  species: string | null;
  reason: string | null;
  claimed_by: string | null;
  amount: number | null;
  counter_amount: number | null;
  status: string;
  qbo_ref: string | null;
  resolved_note: string | null;
  sales_rep: string | null;
  created_at: string;
  weight_lb: number | null;
  photo_paths: string[] | null;
  order_id: string | null;
  customers: { name: string } | null;
  orders: { code: string } | null;
}

export default function CreditsPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<'claims' | 'downgrades'>('claims');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [counterModal, setCounterModal] = useState<{ claim: Claim; amount: string } | null>(null);
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

  async function load() {
    const { data } = await supabase
      .from('credit_claims')
      .select(
        'id, boxes, species, reason, claimed_by, amount, counter_amount, status, qbo_ref, resolved_note, sales_rep, created_at, weight_lb, photo_paths, order_id, customers(name), orders(code)'
      )
      .order('created_at', { ascending: false });

    const rows = (data ?? []) as unknown as ClaimRow[];
    const mapped: Claim[] = rows.map((r) => ({
      id: r.id,
      ref: `CR-${r.id.slice(0, 4).toUpperCase()}`,
      customer: r.customers?.name || r.claimed_by || '—',
      order: r.orders?.code || '—',
      lot: '—',
      boxes: r.boxes || '—',
      species: r.species || '—',
      reason: r.reason || '—',
      claimedBy: r.claimed_by || '—',
      date: new Date(r.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      amount: -(Number(r.amount) || 0),
      status: (['open', 'approved', 'countered', 'rejected'].includes(r.status)
        ? r.status
        : 'open') as Claim['status'],
      qboRef: r.qbo_ref || undefined,
      resolvedNote: r.resolved_note || undefined,
      salesRep: r.sales_rep || '—',
      counterAmount: r.counter_amount != null ? -(Number(r.counter_amount) || 0) : undefined,
      weightLb: r.weight_lb != null ? Number(r.weight_lb) : null,
      photoPaths: Array.isArray(r.photo_paths) ? r.photo_paths : [],
    }));
    setClaims(mapped);
    setLoading(false);

    // Batch-sign photo URLs from the private claim-photos bucket.
    const keys = Array.from(new Set(mapped.flatMap((c) => c.photoPaths))).map((p) =>
      p.replace(/^claim-photos\//, '')
    );
    if (keys.length > 0) {
      const { data: signed } = await supabase.storage
        .from('claim-photos')
        .createSignedUrls(keys, 3600);
      if (signed) {
        const urls: Record<string, string> = {};
        signed.forEach((s) => {
          if (s.signedUrl && s.path) urls[`claim-photos/${s.path}`] = s.signedUrl;
        });
        setPhotoUrls(urls);
      }
    }
  }

  useEffect(() => {
    load();
  }, []);

  const approveClaim = async (id: string) => {
    const nextRef = 'CM-' + (119 + claims.filter((x) => x.status === 'approved').length);
    await supabase
      .from('credit_claims')
      .update({
        status: 'approved',
        qbo_ref: nextRef,
        resolved_note: 'Approved · QBO credit memo issued · vendor recon flagged.',
      })
      .eq('id', id);
    load();
  };

  const confirmCounter = async () => {
    if (!counterModal) return;
    const amt = Math.abs(parseFloat(counterModal.amount) || 0);
    if (amt <= 0) return;
    await supabase
      .from('credit_claims')
      .update({
        status: 'countered',
        counter_amount: amt,
        resolved_note: `Counter offer sent: partial credit $${amt.toFixed(2)} (claimed ${money(counterModal.claim.amount)}) · awaiting customer response.`,
      })
      .eq('id', counterModal.claim.id);
    setCounterModal(null);
    load();
  };

  const rejectClaim = async (id: string) => {
    await supabase
      .from('credit_claims')
      .update({
        status: 'rejected',
        resolved_note: 'Rejected — reason logged for vendor review.',
      })
      .eq('id', id);
    load();
  };

  const submitClaim = async () => {
    if (!form.customer || !form.reason || !form.amount) return;
    await supabase.from('credit_claims').insert({
      boxes: form.boxes || null,
      reason: form.reason,
      claimed_by: form.customer,
      amount: Math.abs(parseFloat(form.amount) || 0),
      status: 'open',
      sales_rep: form.salesRep || 'Blanca',
    });
    setForm({ customer: '', order: '', lot: '', boxes: '', reason: '', amount: '', salesRep: '' });
    setDrawerOpen(false);
    load();
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
                {loading && (
                  <div style={{ fontSize: '13px', color: '#8A99A3', padding: '4px 2px' }}>
                    Loading claims…
                  </div>
                )}
                {!loading && claims.length === 0 && (
                  <div
                    style={{
                      background: '#fff',
                      border: '1px solid #E2E6E9',
                      borderRadius: '8px',
                      padding: '28px',
                      textAlign: 'center',
                      fontSize: '13px',
                      color: '#8A99A3',
                    }}
                  >
                    No credit claims yet. Customer-submitted claims will appear here.
                  </div>
                )}
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
                              <span>{c.ref}</span>
                              <span>{c.order}</span>
                              <span>
                                {c.species}
                                {c.boxes !== '—' ? ` · Box ${c.boxes}` : ''}
                                {c.weightLb != null ? ` · ${c.weightLb} lb` : ''}
                              </span>
                              <span>Rep: {c.salesRep}</span>
                              <span>{c.date}</span>
                            </div>
                            {c.photoPaths.length > 0 && (
                              <div
                                style={{
                                  display: 'flex',
                                  gap: '8px',
                                  marginTop: '10px',
                                  flexWrap: 'wrap',
                                }}
                              >
                                {c.photoPaths.map((p) =>
                                  photoUrls[p] ? (
                                    <a
                                      key={p}
                                      href={photoUrls[p]}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ display: 'block', lineHeight: 0 }}
                                    >
                                      <img
                                        src={photoUrls[p]}
                                        alt="Claim evidence"
                                        style={{
                                          width: '58px',
                                          height: '58px',
                                          objectFit: 'cover',
                                          borderRadius: '5px',
                                          border: '1px solid #E2E6E9',
                                        }}
                                      />
                                    </a>
                                  ) : (
                                    <div
                                      key={p}
                                      style={{
                                        width: '58px',
                                        height: '58px',
                                        borderRadius: '5px',
                                        border: '1px solid #E2E6E9',
                                        background: '#F4F5F6',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '9px',
                                        color: '#8A99A3',
                                      }}
                                    >
                                      photo
                                    </div>
                                  )
                                )}
                              </div>
                            )}
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
                              onClick={() =>
                                setCounterModal({
                                  claim: c,
                                  amount: (Math.abs(c.amount) / 2).toFixed(2),
                                })
                              }
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

      {/* COUNTER OFFER MODAL */}
      {counterModal && (
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
          onClick={() => setCounterModal(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '10px',
              padding: '26px',
              width: '420px',
              maxWidth: '94vw',
              boxShadow: '0 16px 48px rgba(34,42,48,0.22)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              Counter offer — {counterModal.claim.id}
            </div>
            <div style={{ fontSize: '13px', color: '#5A6670', margin: '6px 0 18px' }}>
              {counterModal.claim.customer} claimed{' '}
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontWeight: 600,
                  color: '#A5362C',
                }}
              >
                {money(counterModal.claim.amount)}
              </span>
              . Enter the partial credit you&apos;re offering instead.
            </div>
            <label style={labelStyle}>COUNTER AMOUNT ($) *</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="number"
                min="0"
                step="0.01"
                autoFocus
                value={counterModal.amount}
                onChange={(e) => setCounterModal((m) => (m ? { ...m, amount: e.target.value } : m))}
                style={{
                  ...inputStyle,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '16px',
                  fontWeight: 600,
                }}
              />
              <button
                onClick={() =>
                  setCounterModal((m) =>
                    m ? { ...m, amount: (Math.abs(m.claim.amount) / 2).toFixed(2) } : m
                  )
                }
                style={{
                  flex: 'none',
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#3F6F86',
                  background: '#EEF3F6',
                  border: '1px solid #C5D8E2',
                  borderRadius: '5px',
                  padding: '9px 12px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                50%
              </button>
            </div>
            <div
              style={{
                background: '#F4EEE2',
                border: '1px solid #E8D5B0',
                borderRadius: '5px',
                padding: '10px 13px',
                fontSize: '12px',
                color: '#8A5A14',
                marginTop: '14px',
              }}
            >
              The counter is sent to the customer for acceptance. No QBO credit memo is issued until
              they accept.
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '20px',
              }}
            >
              <button
                onClick={() => setCounterModal(null)}
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
                onClick={confirmCounter}
                disabled={!(parseFloat(counterModal.amount) > 0)}
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: '13px',
                  fontWeight: 600,
                  background: parseFloat(counterModal.amount) > 0 ? '#222A30' : '#E2E6E9',
                  color: parseFloat(counterModal.amount) > 0 ? '#fff' : '#A6AEB4',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '10px 18px',
                  cursor: parseFloat(counterModal.amount) > 0 ? 'pointer' : 'default',
                }}
              >
                Send counter
              </button>
            </div>
          </div>
        </div>
      )}

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
