'use client';

import { useEffect, useState } from 'react';
import Nav from '../components/Nav';
import { createClient } from '@/lib/supabase/client';

interface Vendor {
  id: string;
  name: string;
  code: string;
  contact_email: string | null;
  verification_status: string;
  rejection_reason: string | null;
  created_at: string;
  verified_at: string | null;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending: { label: 'Pending', color: '#8A5A14', bg: '#F4EEE2', dot: '#B7791F' },
  verified: { label: 'Verified', color: '#2E6347', bg: '#EAF1ED', dot: '#3F7D5B' },
  rejected: { label: 'Rejected', color: '#A5362C', bg: '#FBF0EF', dot: '#C2453A' },
};

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

export default function VendorVerificationPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'verified' | 'rejected' | 'all'>('pending');
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [uid, setUid] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('vendors')
      .select(
        'id, name, code, contact_email, verification_status, rejection_reason, created_at, verified_at'
      )
      .order('created_at', { ascending: false });
    setRows((data ?? []) as Vendor[]);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUid(user?.id ?? null);
      await load();
    })();
  }, []);

  const approve = async (id: string) => {
    setBusy(id);
    await supabase
      .from('vendors')
      .update({
        verification_status: 'verified',
        verified_at: new Date().toISOString(),
        verified_by: uid,
        rejection_reason: null,
      })
      .eq('id', id);
    setBusy(null);
    setRows((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, verification_status: 'verified', rejection_reason: null } : v
      )
    );
  };

  const reject = async (id: string) => {
    setBusy(id);
    await supabase
      .from('vendors')
      .update({
        verification_status: 'rejected',
        rejection_reason: reason.trim() || null,
        verified_at: new Date().toISOString(),
        verified_by: uid,
      })
      .eq('id', id);
    setBusy(null);
    setRejectFor(null);
    const r = reason.trim() || null;
    setReason('');
    setRows((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, verification_status: 'rejected', rejection_reason: r } : v
      )
    );
  };

  const filtered = rows.filter((v) => (filter === 'all' ? true : v.verification_status === filter));
  const pendingCount = rows.filter((v) => v.verification_status === 'pending').length;

  const chip = (on: boolean): React.CSSProperties => ({
    fontFamily: "'Archivo', sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    cursor: 'pointer',
    background: on ? '#3F6F86' : 'none',
    color: on ? '#fff' : '#5A6670',
  });

  const btn = (bg: string, color: string): React.CSSProperties => ({
    fontFamily: "'Archivo', sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    background: bg,
    color,
    border: bg === '#fff' ? '1px solid #D6DCE0' : 'none',
    borderRadius: '5px',
    padding: '7px 13px',
    cursor: 'pointer',
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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        <header
          style={{
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '0 28px',
            height: '58px',
            borderBottom: '1px solid #E2E6E9',
            background: '#FFFFFF',
          }}
        >
          <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
            Vendor Verification
          </span>
          {pendingCount > 0 && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#8A5A14',
                background: '#F4EEE2',
                border: '1px solid #E4D2A8',
                borderRadius: '10px',
                padding: '2px 9px',
              }}
            >
              {pendingCount} awaiting review
            </span>
          )}
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px' }}>
          <div style={{ maxWidth: '860px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                background: '#F4F5F6',
                border: '1px solid #E2E6E9',
                borderRadius: '5px',
                padding: '3px',
                marginBottom: '16px',
              }}
            >
              {(
                [
                  ['pending', 'Pending'],
                  ['verified', 'Verified'],
                  ['rejected', 'Rejected'],
                  ['all', 'All'],
                ] as const
              ).map(([k, lbl]) => (
                <button key={k} onClick={() => setFilter(k)} style={chip(filter === k)}>
                  {lbl}
                  {k !== 'all' && (
                    <span style={{ marginLeft: '6px', opacity: 0.75 }}>
                      {rows.filter((v) => v.verification_status === k).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {loading ? (
                <div style={{ fontSize: '13px', color: '#8A99A3' }}>Loading…</div>
              ) : filtered.length === 0 ? (
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid #E2E6E9',
                    borderRadius: '8px',
                    padding: '30px',
                    textAlign: 'center',
                    fontSize: '13px',
                    color: '#8A99A3',
                  }}
                >
                  {filter === 'pending'
                    ? 'No vendors awaiting verification.'
                    : 'No vendors in this view.'}
                </div>
              ) : (
                filtered.map((v) => {
                  const sm = STATUS_META[v.verification_status] ?? STATUS_META.pending;
                  return (
                    <div
                      key={v.id}
                      style={{
                        background: '#fff',
                        border: '1px solid #E2E6E9',
                        borderLeft: `3px solid ${sm.dot}`,
                        borderRadius: '8px',
                        padding: '16px 18px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '16px',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '15px', fontWeight: 700 }}>{v.name}</span>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: sm.color,
                                background: sm.bg,
                                borderRadius: '3px',
                                padding: '3px 9px',
                              }}
                            >
                              {sm.label}
                            </span>
                          </div>
                          <div
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '12px',
                              color: '#8A99A3',
                              marginTop: '4px',
                            }}
                          >
                            {v.code} · {v.contact_email || 'no email'} · signed up{' '}
                            {fmtDate(v.created_at)}
                          </div>
                          {v.verification_status === 'rejected' && v.rejection_reason && (
                            <div style={{ fontSize: '12px', color: '#A5362C', marginTop: '6px' }}>
                              Reason: {v.rejection_reason}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flex: 'none' }}>
                          {v.verification_status !== 'verified' && (
                            <button
                              onClick={() => approve(v.id)}
                              disabled={busy === v.id}
                              style={btn('#2E6347', '#fff')}
                            >
                              {busy === v.id
                                ? '…'
                                : v.verification_status === 'rejected'
                                  ? 'Approve anyway'
                                  : 'Approve'}
                            </button>
                          )}
                          {v.verification_status !== 'rejected' && (
                            <button
                              onClick={() => {
                                setRejectFor(rejectFor === v.id ? null : v.id);
                                setReason('');
                              }}
                              disabled={busy === v.id}
                              style={btn('#fff', '#A5362C')}
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </div>

                      {rejectFor === v.id && (
                        <div
                          style={{
                            marginTop: '12px',
                            paddingTop: '12px',
                            borderTop: '1px solid #EDEFF1',
                            display: 'flex',
                            gap: '8px',
                          }}
                        >
                          <input
                            autoFocus
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Reason for rejection (shown to the vendor)"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') reject(v.id);
                              if (e.key === 'Escape') setRejectFor(null);
                            }}
                            style={{
                              flex: 1,
                              fontFamily: "'Archivo', sans-serif",
                              fontSize: '13px',
                              border: '1px solid #D6DCE0',
                              borderRadius: '5px',
                              padding: '8px 12px',
                              outline: 'none',
                            }}
                          />
                          <button
                            onClick={() => reject(v.id)}
                            disabled={busy === v.id}
                            style={btn('#A5362C', '#fff')}
                          >
                            {busy === v.id ? '…' : 'Confirm reject'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
