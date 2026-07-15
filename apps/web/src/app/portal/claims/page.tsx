'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Claim {
  id: string;
  species: string | null;
  reason: string | null;
  status: string;
  created_at: string;
  order_id: string | null;
  boxes: string | null;
  weight_lb: number | null;
  photo_paths: string[] | null;
}
interface OrderOpt {
  id: string;
  code: string;
}

const claimStatus = (s: string) => {
  switch (s) {
    case 'approved':
      return { label: 'Approved', color: '#2E6347', bg: '#EAF1ED' };
    case 'rejected':
      return { label: 'Rejected', color: '#A5362C', bg: '#FBF0EF' };
    case 'countered':
      return { label: 'Counter-offer', color: '#8A5A14', bg: '#F4EEE2' };
    default:
      return { label: 'Under review', color: '#2D5365', bg: '#EEF3F6' };
  }
};

export default function PortalClaims() {
  const supabase = createClient();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [orders, setOrders] = useState<OrderOpt[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  const [orderId, setOrderId] = useState('');
  const [species, setSpecies] = useState('');
  const [box, setBox] = useState('');
  const [weight, setWeight] = useState('');
  const [reason, setReason] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  async function load() {
    const [{ data: cust }, { data: ords }, { data: cl }] = await Promise.all([
      supabase.from('customers').select('id, name').maybeSingle(),
      supabase.from('orders').select('id, code').order('created_at', { ascending: false }),
      supabase
        .from('credit_claims')
        .select('id, species, reason, status, created_at, order_id, boxes, weight_lb, photo_paths')
        .order('created_at', { ascending: false }),
    ]);
    setCustomerId(cust?.id ?? null);
    setCustomerName(cust?.name ?? '');
    setOrders((ords ?? []) as OrderOpt[]);
    setClaims((cl ?? []) as unknown as Claim[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (!reason.trim() || !customerId || saving) return;
    setSaving(true);
    setMsg(null);

    // Upload photos (if any) to the customer's own folder in claim-photos.
    const paths: string[] = [];
    for (const f of files) {
      const safe = f.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
      const key = `${customerId}/${Date.now()}_${safe}`;
      const { error: upErr } = await supabase.storage.from('claim-photos').upload(key, f, {
        contentType: f.type || undefined,
        upsert: false,
      });
      if (upErr) {
        setSaving(false);
        setMsg({ kind: 'err', text: `Photo upload failed: ${upErr.message}` });
        return;
      }
      paths.push(`claim-photos/${key}`);
    }

    const w = parseFloat(weight);
    const { error } = await supabase.from('credit_claims').insert({
      customer_id: customerId,
      order_id: orderId || null,
      species: species.trim() || null,
      boxes: box.trim() || null,
      weight_lb: Number.isFinite(w) && w > 0 ? Math.round(w * 100) / 100 : null,
      reason: reason.trim(),
      claimed_by: customerName || null,
      photo_paths: paths,
      status: 'open',
    });
    setSaving(false);
    if (error) {
      setMsg({ kind: 'err', text: error.message });
      return;
    }
    setOrderId('');
    setSpecies('');
    setBox('');
    setWeight('');
    setReason('');
    setFiles([]);
    setMsg({ kind: 'ok', text: 'Claim submitted. Our team will review it and follow up.' });
    load();
  };

  const label: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#8A99A3',
    display: 'block',
    marginBottom: '6px',
  };
  const input: React.CSSProperties = {
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

  return (
    <>
      <header
        className="r-header"
        style={{
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '0 28px',
          height: '58px',
          borderBottom: '1px solid #E2E6E9',
          background: '#FFFFFF',
        }}
      >
        <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
          Quality claims
        </span>
        <span style={{ fontSize: '12px', color: '#8A99A3' }}>Report a quality or weight issue</span>
      </header>

      <div className="r-pad" style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        <div
          className="r-stack"
          style={{ display: 'flex', gap: '24px', maxWidth: '960px', alignItems: 'flex-start' }}
        >
          {/* form */}
          <div
            className="r-full"
            style={{
              width: '380px',
              flex: 'none',
              background: '#fff',
              border: '1px solid #E2E6E9',
              borderRadius: '8px',
              padding: '20px',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>
              File a claim
            </div>
            <div style={{ fontSize: '12px', color: '#8A99A3', marginBottom: '16px' }}>
              Tell us what was wrong. Our team reviews every claim and applies a credit if
              warranted.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
              <div>
                <label style={label}>RELATED ORDER (OPTIONAL)</label>
                <select style={input} value={orderId} onChange={(e) => setOrderId(e.target.value)}>
                  <option value="">— none / not sure —</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.code}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={label}>SPECIES (OPTIONAL)</label>
                <input
                  style={input}
                  placeholder="e.g. Ahi Tuna"
                  value={species}
                  onChange={(e) => setSpecies(e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={label}>BOX # (OPTIONAL)</label>
                  <input
                    style={input}
                    placeholder="e.g. 4"
                    value={box}
                    onChange={(e) => setBox(e.target.value)}
                  />
                </div>
                <div>
                  <label style={label}>WEIGHT (LB, OPTIONAL)</label>
                  <input
                    style={input}
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="e.g. 65.5"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label style={label}>WHAT HAPPENED? *</label>
                <textarea
                  style={{ ...input, minHeight: '96px', resize: 'vertical' }}
                  placeholder="Describe the quality or weight issue…"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <div>
                <label style={label}>PHOTOS (OPTIONAL)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                  style={{ ...input, padding: '7px 10px', cursor: 'pointer' }}
                />
                {files.length > 0 && (
                  <div style={{ fontSize: '11px', color: '#5A6670', marginTop: '5px' }}>
                    {files.length} photo{files.length === 1 ? '' : 's'} attached
                  </div>
                )}
              </div>
              {msg && (
                <div
                  style={{
                    background: msg.kind === 'ok' ? '#EAF1ED' : '#FBF0EF',
                    border: `1px solid ${msg.kind === 'ok' ? '#B4D2C0' : '#E3B6B1'}`,
                    borderRadius: '5px',
                    padding: '9px 12px',
                    fontSize: '12px',
                    color: msg.kind === 'ok' ? '#2E6347' : '#A5362C',
                  }}
                >
                  {msg.text}
                </div>
              )}
              <button
                onClick={submit}
                disabled={saving || !reason.trim()}
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: '13px',
                  fontWeight: 600,
                  background: saving || !reason.trim() ? '#8A99A3' : '#222A30',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '11px',
                  cursor: saving || !reason.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Submitting…' : 'Submit claim'}
              </button>
            </div>
          </div>

          {/* list */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}>
              Your claims
            </div>
            {loading ? (
              <div style={{ fontSize: '13px', color: '#8A99A3' }}>Loading…</div>
            ) : claims.length === 0 ? (
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #E2E6E9',
                  borderRadius: '8px',
                  padding: '24px',
                  fontSize: '13px',
                  color: '#8A99A3',
                  textAlign: 'center',
                }}
              >
                No claims filed.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {claims.map((c) => {
                  const st = claimStatus(c.status);
                  return (
                    <div
                      key={c.id}
                      style={{
                        background: '#fff',
                        border: '1px solid #E2E6E9',
                        borderRadius: '8px',
                        padding: '14px 16px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '6px',
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: 700 }}>
                          {c.species || 'Claim'}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: st.color,
                            background: st.bg,
                            borderRadius: '3px',
                            padding: '3px 9px',
                          }}
                        >
                          {st.label}
                        </span>
                      </div>
                      {(c.boxes || c.weight_lb != null) && (
                        <div
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '11px',
                            color: '#8A5A14',
                            marginBottom: '6px',
                          }}
                        >
                          {c.boxes ? `Box ${c.boxes}` : ''}
                          {c.boxes && c.weight_lb != null ? ' · ' : ''}
                          {c.weight_lb != null ? `${c.weight_lb} lb` : ''}
                        </div>
                      )}
                      <div style={{ fontSize: '13px', color: '#5A6670', lineHeight: 1.5 }}>
                        {c.reason}
                      </div>
                      <div style={{ fontSize: '11px', color: '#8A99A3', marginTop: '8px' }}>
                        {new Date(c.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                        {c.photo_paths && c.photo_paths.length > 0
                          ? ` · ${c.photo_paths.length} photo${c.photo_paths.length === 1 ? '' : 's'}`
                          : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
