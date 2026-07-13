'use client';

import { useEffect, useState } from 'react';
import Nav from '../components/Nav';
import { createClient } from '@/lib/supabase/client';

interface PLLine {
  box: string;
  species: string;
  grade: string | null;
  weight_lb: number;
  pieces: number | null;
  box_type: string | null;
}
interface PLPayload {
  destination?: string;
  pl_number?: string | null;
  lines?: PLLine[];
  totals?: { boxes: number; lines?: number; pieces: number; weight_lb: number };
}

interface DocRow {
  id: string;
  kind: string;
  original_filename: string;
  storage_path: string | null;
  destination_code: string | null;
  routing_detected: string | null;
  parse_status: string;
  created_at: string;
  shipment_id: string | null;
  vendor_id: string | null;
  vendors: { name: string } | null;
  parsed_payload: PLPayload | null;
}

const KIND_LABEL: Record<string, string> = {
  packing_list: 'Packing list',
  commercial_invoice: 'Commercial invoice',
  vendor_statement: 'Statement',
  po_import: 'PO import',
  other: 'Other',
};

const DEST = [
  { code: 'SFO', routing: 'warehouse' },
  { code: 'LAX', routing: 'warehouse' },
  { code: 'ORD', routing: 'direct' },
  { code: 'HNL', routing: 'direct' },
];
const routingFor = (code: string): 'warehouse' | 'direct' =>
  DEST.find((d) => d.code === code)?.routing === 'direct' ? 'direct' : 'warehouse';

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

const statusMeta = (s: string) => {
  switch (s) {
    case 'posted':
      return { label: 'Processed', color: '#2E6347', bg: '#EAF1ED' };
    case 'parsed':
    case 'needs_review':
      return { label: 'In review', color: '#2D5365', bg: '#EEF3F6' };
    default:
      return { label: 'New', color: '#8A5A14', bg: '#F4EEE2' };
  }
};

interface ShipForm {
  awb: string;
  origin: string;
  destination: string;
  eta: string;
  status: string;
}

export default function DocumentsInboxPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'new' | 'processed' | 'all'>('new');
  const [uid, setUid] = useState<string | null>(null);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [form, setForm] = useState<ShipForm>({
    awb: '',
    origin: '',
    destination: 'SFO',
    eta: '',
    status: 'expected',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [shipStatus, setShipStatus] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('documents')
      .select(
        'id, kind, original_filename, storage_path, destination_code, routing_detected, parse_status, created_at, shipment_id, vendor_id, parsed_payload, vendors(name)'
      )
      .order('created_at', { ascending: false });
    const docRows = (data ?? []) as unknown as DocRow[];
    setRows(docRows);
    setLoading(false);

    // Pull the current status of each linked shipment so staff can advance it
    // (expected → in transit → arrived); the vendor sees this on their side.
    const shipIds = Array.from(
      new Set(docRows.map((r) => r.shipment_id).filter((x): x is string => !!x))
    );
    if (shipIds.length > 0) {
      const { data: ships } = await supabase
        .from('shipments')
        .select('id, status')
        .in('id', shipIds);
      const map: Record<string, string> = {};
      (ships ?? []).forEach((s) => {
        map[s.id] = s.status;
      });
      setShipStatus(map);
    }
  }

  const SHIP_STATUSES: { value: string; label: string }[] = [
    { value: 'expected', label: 'Expected' },
    { value: 'in_transit', label: 'In transit' },
    { value: 'arrived', label: 'Arrived' },
    { value: 'delivered', label: 'Delivered' },
  ];

  const updateShipStatus = async (shipmentId: string, status: string) => {
    setShipStatus((prev) => ({ ...prev, [shipmentId]: status }));
    await supabase
      .from('shipments')
      .update({
        status,
        arrived_at:
          status === 'arrived' || status === 'delivered' ? new Date().toISOString() : null,
      })
      .eq('id', shipmentId);
  };

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUid(user?.id ?? null);
      await load();
    })();
  }, []);

  const download = async (d: DocRow) => {
    if (!d.storage_path) return;
    const key = d.storage_path.replace(/^vendor-docs\//, '');
    const { data, error } = await supabase.storage.from('vendor-docs').createSignedUrl(key, 120);
    if (error || !data) {
      setErr(error?.message || 'Could not open the file.');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener');
  };

  const openForm = (d: DocRow) => {
    setErr('');
    setOpenFor(openFor === d.id ? null : d.id);
    setForm({
      awb: '',
      origin: '',
      destination:
        d.destination_code && DEST.some((x) => x.code === d.destination_code)
          ? d.destination_code
          : 'SFO',
      eta: '',
      status: 'expected',
    });
  };

  const createShipment = async (d: DocRow) => {
    if (!d.vendor_id) {
      setErr('This document has no vendor attached.');
      return;
    }
    setBusy(true);
    setErr('');
    const routing = routingFor(form.destination);
    const isInvoice = d.kind === 'commercial_invoice';

    const { data: ship, error: shipErr } = await supabase
      .from('shipments')
      .insert({
        vendor_id: d.vendor_id,
        awb: form.awb.trim() || null,
        origin: form.origin.trim() || null,
        destination_code: form.destination,
        routing,
        status: form.status,
        eta: form.eta || null,
        packing_list_document_id: isInvoice ? null : d.id,
        commercial_invoice_document_id: isInvoice ? d.id : null,
      })
      .select()
      .single();

    if (shipErr || !ship) {
      setBusy(false);
      setErr(shipErr?.message || 'Could not create the shipment.');
      return;
    }

    // Mark the document processed and link it to the new shipment.
    await supabase
      .from('documents')
      .update({
        shipment_id: ship.id,
        parse_status: 'posted',
        reviewed_at: new Date().toISOString(),
        reviewed_by: uid,
      })
      .eq('id', d.id);

    // Materialize the packing-list lines into inventory (lot → boxes →
    // box_contents) so the fish appears on the Allocation Board. Only for
    // packing lists that carry lines.
    const lines = !isInvoice ? (d.parsed_payload?.lines ?? []) : [];
    if (lines.length > 0) {
      const invErr = await materializeInventory(d, ship.id, form.destination, lines);
      if (invErr) {
        // The shipment is created; surface the inventory problem without losing it.
        setErr(`Shipment created, but inventory could not be built: ${invErr}`);
      }
    }

    setBusy(false);
    setOpenFor(null);
    setRows((prev) =>
      prev.map((r) => (r.id === d.id ? { ...r, parse_status: 'posted', shipment_id: ship.id } : r))
    );
  };

  // Turns packing-list lines into a lot with boxes and mixed-species contents.
  // Lines that share a box number collapse into one physical box.
  const materializeInventory = async (
    d: DocRow,
    shipmentId: string,
    destination: string,
    lines: PLLine[]
  ): Promise<string | null> => {
    const lotCode =
      d.parsed_payload?.pl_number?.trim() || `LOT-${shipmentId.slice(0, 6).toUpperCase()}`;

    const { data: lot, error: lotErr } = await supabase
      .from('lots')
      .insert({
        lot_code: lotCode,
        vendor_id: d.vendor_id,
        location: destination,
        status: 'available',
        received_at: new Date().toISOString(),
        shipment_id: shipmentId,
      })
      .select('id')
      .single();
    if (lotErr || !lot) return lotErr?.message || 'lot insert failed';

    // Distinct box labels, preserving first-seen order.
    const labels: string[] = [];
    for (const l of lines) {
      const label = (l.box || '').trim() || '—';
      if (!labels.includes(label)) labels.push(label);
    }

    const { data: boxRows, error: boxErr } = await supabase
      .from('boxes')
      .insert(labels.map((label, i) => ({ lot_id: lot.id, label, idx: i + 1 })))
      .select('id, label');
    if (boxErr || !boxRows) return boxErr?.message || 'box insert failed';

    const boxIdByLabel: Record<string, string> = {};
    (boxRows as { id: string; label: string }[]).forEach((b) => {
      boxIdByLabel[b.label] = b.id;
    });

    const contents = lines
      .map((l) => {
        const label = (l.box || '').trim() || '—';
        const boxId = boxIdByLabel[label];
        if (!boxId) return null;
        return {
          box_id: boxId,
          species: l.species || 'Unknown',
          grade: l.grade || null,
          weight: Number(l.weight_lb) || 0,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    if (contents.length > 0) {
      const { error: cErr } = await supabase.from('box_contents').insert(contents);
      if (cErr) return cErr.message;
    }
    return null;
  };

  const filtered = rows.filter((r) =>
    filter === 'all'
      ? true
      : filter === 'processed'
        ? r.parse_status === 'posted'
        : r.parse_status !== 'posted'
  );
  const newCount = rows.filter((r) => r.parse_status !== 'posted').length;

  const chip = (o: boolean): React.CSSProperties => ({
    fontFamily: "'Archivo', sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    cursor: 'pointer',
    background: o ? '#3F6F86' : 'none',
    color: o ? '#fff' : '#5A6670',
  });
  const fieldLabel: React.CSSProperties = {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#8A99A3',
    display: 'block',
    marginBottom: '5px',
  };
  const fieldInput: React.CSSProperties = {
    fontFamily: "'Archivo', sans-serif",
    fontSize: '13px',
    border: '1px solid #D6DCE0',
    borderRadius: '5px',
    padding: '8px 10px',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    background: '#fff',
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
            Documents Inbox
          </span>
          <span style={{ fontSize: '12px', color: '#8A99A3' }}>Vendor submissions → shipments</span>
          {newCount > 0 && (
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
              {newCount} new
            </span>
          )}
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px' }}>
          <div style={{ maxWidth: '900px' }}>
            <div
              style={{
                display: 'inline-flex',
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
                  ['new', 'New'],
                  ['processed', 'Processed'],
                  ['all', 'All'],
                ] as const
              ).map(([k, lbl]) => (
                <button key={k} onClick={() => setFilter(k)} style={chip(filter === k)}>
                  {lbl}
                </button>
              ))}
            </div>

            {err && (
              <div
                style={{
                  background: '#FBF0EF',
                  border: '1px solid #E3B6B1',
                  borderRadius: '5px',
                  padding: '9px 12px',
                  fontSize: '12px',
                  color: '#A5362C',
                  marginBottom: '14px',
                }}
              >
                {err}
              </div>
            )}

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
                  {filter === 'new'
                    ? 'No new documents — vendor submissions will appear here.'
                    : 'Nothing in this view.'}
                </div>
              ) : (
                filtered.map((d) => {
                  const sm = statusMeta(d.parse_status);
                  const posted = d.parse_status === 'posted';
                  return (
                    <div
                      key={d.id}
                      style={{
                        background: '#fff',
                        border: '1px solid #E2E6E9',
                        borderLeft: `3px solid ${sm.color}`,
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
                            <span
                              style={{
                                fontSize: '14px',
                                fontWeight: 700,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '360px',
                              }}
                            >
                              {d.original_filename}
                            </span>
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
                              marginTop: '5px',
                            }}
                          >
                            {d.vendors?.name ?? 'Unknown vendor'} · {KIND_LABEL[d.kind] ?? d.kind} ·{' '}
                            {d.destination_code || 'no dest'}
                            {d.destination_code
                              ? ` (${routingFor(d.destination_code)})`
                              : ''} · {fmtDate(d.created_at)}
                          </div>
                          {d.parsed_payload?.totals && (
                            <div style={{ fontSize: '12px', color: '#5A6670', marginTop: '4px' }}>
                              {d.parsed_payload.totals.boxes} boxes ·{' '}
                              {d.parsed_payload.totals.pieces} pcs ·{' '}
                              <strong>{d.parsed_payload.totals.weight_lb} lb</strong>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flex: 'none' }}>
                          {d.storage_path && (
                            <button
                              onClick={() => download(d)}
                              style={{
                                fontFamily: "'Archivo', sans-serif",
                                fontSize: '12px',
                                fontWeight: 600,
                                background: '#fff',
                                color: '#3F6F86',
                                border: '1px solid #C5D8E2',
                                borderRadius: '5px',
                                padding: '7px 13px',
                                cursor: 'pointer',
                              }}
                            >
                              Download
                            </button>
                          )}
                          {d.parsed_payload?.lines?.length ? (
                            <a
                              href={`/mana/documents/${d.id}/invoice`}
                              target="_blank"
                              rel="noopener"
                              style={{
                                fontFamily: "'Archivo', sans-serif",
                                fontSize: '12px',
                                fontWeight: 600,
                                background: '#fff',
                                color: '#3F6F86',
                                border: '1px solid #C5D8E2',
                                borderRadius: '5px',
                                padding: '7px 13px',
                                cursor: 'pointer',
                                textDecoration: 'none',
                              }}
                            >
                              Generate invoice
                            </a>
                          ) : null}
                          {!posted ? (
                            <button
                              onClick={() => openForm(d)}
                              style={{
                                fontFamily: "'Archivo', sans-serif",
                                fontSize: '12px',
                                fontWeight: 600,
                                background: '#222A30',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '5px',
                                padding: '7px 13px',
                                cursor: 'pointer',
                              }}
                            >
                              {openFor === d.id ? 'Cancel' : 'Create shipment'}
                            </button>
                          ) : d.shipment_id ? (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '7px',
                                alignSelf: 'center',
                              }}
                            >
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#2E6347' }}>
                                ✓ Shipment
                              </span>
                              <select
                                value={shipStatus[d.shipment_id] ?? 'expected'}
                                onChange={(e) => updateShipStatus(d.shipment_id!, e.target.value)}
                                title="Shipment status — the vendor sees this"
                                style={{
                                  fontFamily: "'Archivo', sans-serif",
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#222A30',
                                  background: '#fff',
                                  border: '1px solid #C5D8E2',
                                  borderRadius: '5px',
                                  padding: '6px 9px',
                                  cursor: 'pointer',
                                }}
                              >
                                {SHIP_STATUSES.map((s) => (
                                  <option key={s.value} value={s.value}>
                                    {s.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#2E6347',
                                alignSelf: 'center',
                              }}
                            >
                              ✓ Processed
                            </span>
                          )}
                        </div>
                      </div>

                      {openFor === d.id && !posted && (
                        <div
                          style={{
                            marginTop: '14px',
                            paddingTop: '14px',
                            borderTop: '1px solid #EDEFF1',
                          }}
                        >
                          {d.parsed_payload?.lines?.length ? (
                            <div
                              style={{
                                background: '#FAFBFB',
                                border: '1px solid #EDEFF1',
                                borderRadius: '6px',
                                padding: '8px 12px',
                                marginBottom: '14px',
                              }}
                            >
                              <div
                                style={{
                                  fontSize: '9px',
                                  fontWeight: 700,
                                  letterSpacing: '0.06em',
                                  color: '#8A99A3',
                                  marginBottom: '6px',
                                }}
                              >
                                PACKING LIST · {d.parsed_payload.lines.length}{' '}
                                {d.parsed_payload.lines.length === 1 ? 'LINE' : 'LINES'}
                              </div>
                              {d.parsed_payload.lines.slice(0, 12).map((ln, i) => (
                                <div
                                  key={i}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '12px',
                                    padding: '3px 0',
                                    color: '#5A6670',
                                  }}
                                >
                                  <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                                    {ln.box} · {ln.species}
                                    {ln.grade ? ` ${ln.grade}` : ''}
                                    {ln.box_type ? ` · ${ln.box_type}` : ''}
                                  </span>
                                  <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                                    {ln.pieces ? `${ln.pieces} pcs · ` : ''}
                                    {ln.weight_lb} lb
                                  </span>
                                </div>
                              ))}
                              {d.parsed_payload.lines.length > 12 && (
                                <div
                                  style={{ fontSize: '11px', color: '#8A99A3', marginTop: '4px' }}
                                >
                                  +{d.parsed_payload.lines.length - 12} more — see the full document
                                  via Generate invoice
                                </div>
                              )}
                            </div>
                          ) : null}
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr 100px 100px 120px',
                              gap: '10px',
                              alignItems: 'end',
                            }}
                          >
                            <div>
                              <label style={fieldLabel}>AWB</label>
                              <input
                                style={fieldInput}
                                placeholder="Airway bill"
                                value={form.awb}
                                onChange={(e) => setForm((f) => ({ ...f, awb: e.target.value }))}
                              />
                            </div>
                            <div>
                              <label style={fieldLabel}>ORIGIN</label>
                              <input
                                style={fieldInput}
                                placeholder="e.g. Tahiti"
                                value={form.origin}
                                onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value }))}
                              />
                            </div>
                            <div>
                              <label style={fieldLabel}>DEST</label>
                              <select
                                style={fieldInput}
                                value={form.destination}
                                onChange={(e) =>
                                  setForm((f) => ({ ...f, destination: e.target.value }))
                                }
                              >
                                {DEST.map((x) => (
                                  <option key={x.code} value={x.code}>
                                    {x.code}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label style={fieldLabel}>ETA</label>
                              <input
                                type="date"
                                style={fieldInput}
                                value={form.eta}
                                onChange={(e) => setForm((f) => ({ ...f, eta: e.target.value }))}
                              />
                            </div>
                            <div>
                              <label style={fieldLabel}>STATUS</label>
                              <select
                                style={fieldInput}
                                value={form.status}
                                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                              >
                                <option value="expected">Expected</option>
                                <option value="in_transit">In transit</option>
                                <option value="arrived">Arrived</option>
                              </select>
                            </div>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginTop: '12px',
                            }}
                          >
                            <span style={{ fontSize: '11px', color: '#8A99A3' }}>
                              Routing: <strong>{routingFor(form.destination)}</strong> · creating
                              marks this document processed.
                            </span>
                            <button
                              onClick={() => createShipment(d)}
                              disabled={busy}
                              style={{
                                fontFamily: "'Archivo', sans-serif",
                                fontSize: '13px',
                                fontWeight: 600,
                                background: busy ? '#8A99A3' : '#222A30',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '5px',
                                padding: '9px 16px',
                                cursor: busy ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {busy ? 'Creating…' : 'Create shipment'}
                            </button>
                          </div>
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
