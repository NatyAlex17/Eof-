'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { loadVendor, verificationMeta, type VendorMe } from '../vendorData';

// Destination codes drive routing: LAX/SFO -> warehouse; ORD/HNL -> direct.
const DESTINATIONS = [
  { code: 'SFO', routing: 'warehouse' as const },
  { code: 'LAX', routing: 'warehouse' as const },
  { code: 'ORD', routing: 'direct' as const },
  { code: 'HNL', routing: 'direct' as const },
];
const routingFor = (code: string): 'warehouse' | 'direct' =>
  code === 'ORD' || code === 'HNL' ? 'direct' : 'warehouse';

const SPECIES_HINTS = [
  'Ahi Tuna',
  'Bigeye Tuna',
  'Yellowfin Tuna',
  'Ono',
  'Mahi-Mahi',
  'Salmon',
  'Hamachi',
  'Kanpachi',
  'Opah',
  'Swordfish',
];

const KG_TO_LB = 2.20462;

// Matches the real packing-list columns: box no · species · box type · gel ice ·
// grade · net weight · unit/box (pieces). Weight is entered in the vendor's unit
// (kg for Tahiti, lb for others) and converted to lb for the system.
interface Line {
  id: number;
  box: string;
  species: string;
  grade: string;
  boxType: string;
  gelIce: string;
  pieces: string;
  weight: string; // in the selected unit (kg or lb)
}

const emptyLine = (id: number): Line => ({
  id,
  box: '',
  species: '',
  grade: '',
  boxType: '',
  gelIce: '',
  pieces: '',
  weight: '',
});

export default function VendorPackingListPage() {
  const [vendor, setVendor] = useState<VendorMe | null>(null);
  const [destination, setDestination] = useState('SFO');
  const [plNumber, setPlNumber] = useState('');
  const [awb, setAwb] = useState('');
  const [receivedDate, setReceivedDate] = useState('');
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg'); // Tahiti sends kg
  const [lines, setLines] = useState<Line[]>([emptyLine(1), emptyLine(2), emptyLine(3)]);
  const [seq, setSeq] = useState(4);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const toLb = (n: number) => Math.round((unit === 'kg' ? n * KG_TO_LB : n) * 10) / 10;

  useEffect(() => {
    (async () => setVendor(await loadVendor()))();
  }, []);

  const setLine = (id: number, k: keyof Line, v: string) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [k]: v } : l)));
  const addLine = () => {
    setLines((prev) => [...prev, emptyLine(seq)]);
    setSeq((n) => n + 1);
  };
  const removeLine = (id: number) =>
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));

  const valid = lines.filter((l) => l.box.trim() && l.species.trim() && parseFloat(l.weight) > 0);
  // One physical box can hold multiple species / grades / weights across several
  // lines. Rows that share a box number count as a single box.
  const boxCount = new Set(valid.map((l) => l.box.trim().toLowerCase())).size;
  const totalLb = valid.reduce((a, l) => a + toLb(parseFloat(l.weight || '0')), 0);
  const totalPieces = valid.reduce((a, l) => a + (parseInt(l.pieces || '0', 10) || 0), 0);

  const submit = async () => {
    if (!vendor || saving) return;
    if (valid.length === 0) {
      setError('Add at least one complete line (box number, species, and weight).');
      return;
    }
    setSaving(true);
    setError('');

    const payload = {
      submitted_via: 'vendor_form',
      destination,
      pl_number: plNumber.trim() || null,
      awb: awb.trim() || null,
      received_date: receivedDate || null,
      unit,
      lines: valid.map((l) => ({
        box: l.box.trim(),
        species: l.species.trim(),
        grade: l.grade.trim() || null,
        box_type: l.boxType.trim() || null,
        gel_ice: l.gelIce.trim() || null,
        pieces: parseInt(l.pieces || '0', 10) || null,
        net_weight: Math.round(parseFloat(l.weight) * 100) / 100, // as entered
        net_unit: unit,
        weight_lb: toLb(parseFloat(l.weight)), // normalized for the system
      })),
      totals: {
        boxes: boxCount,
        lines: valid.length,
        pieces: totalPieces,
        weight_lb: Math.round(totalLb * 10) / 10,
      },
    };

    const label = plNumber.trim()
      ? `Packing list · ${plNumber.trim()}`
      : `Packing list · ${destination} · ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    const supabase = createClient();
    const { error: docErr } = await supabase.from('documents').insert({
      kind: 'packing_list',
      original_filename: label,
      storage_path: null,
      destination_code: destination,
      routing_detected: routingFor(destination),
      vendor_id: vendor.id,
      parse_status: 'parsed', // structured by the vendor; ready for staff review
      parsed_payload: payload,
    });
    setSaving(false);
    if (docErr) {
      setError(docErr.message || 'Could not submit the packing list.');
      return;
    }
    setDone(true);
  };

  const reset = () => {
    setLines([emptyLine(1), emptyLine(2), emptyLine(3)]);
    setSeq(4);
    setPlNumber('');
    setAwb('');
    setReceivedDate('');
    setDone(false);
    setError('');
  };

  const notVerified = !!vendor && vendor.verificationStatus !== 'verified';
  const th: React.CSSProperties = {
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#8A99A3',
    padding: '0 4px 6px',
  };
  const hdrLabel: React.CSSProperties = {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#8A99A3',
    display: 'block',
    marginBottom: '6px',
  };
  const GRID_COLS = '104px 1fr 64px 88px 56px 52px 92px 28px';
  const cell: React.CSSProperties = {
    fontFamily: "'Archivo', sans-serif",
    fontSize: '13px',
    border: '1px solid #D6DCE0',
    borderRadius: '5px',
    padding: '8px 9px',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    background: '#fff',
  };

  return (
    <>
      <header
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
          Submit packing list
        </span>
        <span style={{ fontSize: '12px', color: '#8A99A3' }}>
          Enter your boxes — our team reviews, then generates the invoice
        </span>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        {notVerified ? (
          <div style={{ maxWidth: '560px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                background: verificationMeta(vendor!.verificationStatus).bg,
                border: `1px solid ${verificationMeta(vendor!.verificationStatus).dot}`,
                borderRadius: '10px',
                padding: '22px 24px',
              }}
            >
              <span
                style={{
                  flex: 'none',
                  marginTop: '3px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: verificationMeta(vendor!.verificationStatus).dot,
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: verificationMeta(vendor!.verificationStatus).color,
                  }}
                >
                  {vendor!.verificationStatus === 'rejected'
                    ? 'Your account was not approved'
                    : 'Verification required before submitting'}
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: verificationMeta(vendor!.verificationStatus).color,
                    marginTop: '6px',
                    lineHeight: 1.55,
                  }}
                >
                  {vendor!.verificationStatus === 'rejected'
                    ? vendor!.rejectionReason
                      ? `Reason: ${vendor!.rejectionReason}. Please contact our team to resolve this.`
                      : 'Please contact our team to resolve this before submitting.'
                    : 'Our team is verifying your account. Once verified you’ll be able to submit packing lists here.'}
                </div>
              </div>
            </div>
          </div>
        ) : done ? (
          <div style={{ maxWidth: '520px' }}>
            <div
              style={{
                background: '#fff',
                border: '1px solid #E2E6E9',
                borderRadius: '10px',
                padding: '28px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: '#EAF1ED',
                  color: '#2E6347',
                  fontSize: '22px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                }}
              >
                ✓
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>Packing list submitted</div>
              <div
                style={{
                  fontSize: '13px',
                  color: '#5A6670',
                  margin: '8px 0 20px',
                  lineHeight: 1.5,
                }}
              >
                Our team reviews it and generates the shipment documents. Track its status under My
                Documents.
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  onClick={reset}
                  style={{
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
                  Submit another
                </button>
                <Link
                  href="/vendor/documents"
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    background: '#222A30',
                    color: '#fff',
                    borderRadius: '5px',
                    padding: '10px 18px',
                    textDecoration: 'none',
                  }}
                >
                  View my documents
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: '960px' }}>
            {/* destination */}
            <label
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: '#5A6670',
                display: 'block',
                marginBottom: '9px',
              }}
            >
              SHIPMENT DESTINATION
            </label>
            <div style={{ display: 'flex', gap: '9px', flexWrap: 'wrap', marginBottom: '22px' }}>
              {DESTINATIONS.map((d) => {
                const on = destination === d.code;
                return (
                  <button
                    key={d.code}
                    onClick={() => setDestination(d.code)}
                    style={{
                      borderRadius: '6px',
                      padding: '11px 16px',
                      cursor: 'pointer',
                      fontFamily: "'Archivo', sans-serif",
                      fontSize: '14px',
                      fontWeight: 700,
                      border: on ? '1.5px solid #B7791F' : '1.5px solid #D6DCE0',
                      background: on ? '#F4EEE2' : '#fff',
                      color: on ? '#8A5A14' : '#5A6670',
                    }}
                  >
                    {d.code}
                    <span
                      style={{
                        marginLeft: '7px',
                        fontSize: '10px',
                        fontWeight: 600,
                        opacity: 0.75,
                      }}
                    >
                      {d.routing}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* shipment header — matches the packing-list top block (PL #, AWB, RCD date) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 160px 150px',
                gap: '12px',
                marginBottom: '22px',
              }}
            >
              <div>
                <label style={hdrLabel}>PACKING LIST #</label>
                <input
                  style={cell}
                  placeholder="KTS-EOF56/26-LAX"
                  value={plNumber}
                  onChange={(e) => setPlNumber(e.target.value)}
                />
              </div>
              <div>
                <label style={hdrLabel}>AIRWAY BILL (AWB)</label>
                <input
                  style={cell}
                  placeholder="244-8318 3014"
                  value={awb}
                  onChange={(e) => setAwb(e.target.value)}
                />
              </div>
              <div>
                <label style={hdrLabel}>RECEIVED DATE</label>
                <input
                  type="date"
                  style={cell}
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                />
              </div>
              <div>
                <label style={hdrLabel}>WEIGHT UNIT</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['kg', 'lb'] as const).map((u) => {
                    const on = unit === u;
                    return (
                      <button
                        key={u}
                        onClick={() => setUnit(u)}
                        style={{
                          flex: 1,
                          borderRadius: '5px',
                          padding: '8px',
                          cursor: 'pointer',
                          fontFamily: "'Archivo', sans-serif",
                          fontSize: '13px',
                          fontWeight: 700,
                          border: on ? '1.5px solid #B7791F' : '1.5px solid #D6DCE0',
                          background: on ? '#F4EEE2' : '#fff',
                          color: on ? '#8A5A14' : '#5A6670',
                        }}
                      >
                        {u}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* line items */}
            <label
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: '#5A6670',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              BOXES
            </label>
            <div
              style={{ fontSize: '12px', color: '#8A99A3', marginBottom: '9px', lineHeight: 1.5 }}
            >
              Add one line per species/grade. If a single box holds more than one species, grade, or
              weight, enter the <strong>same box number</strong> on each line — it&apos;s counted as
              one box.
            </div>
            <datalist id="species-hints">
              {SPECIES_HINTS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <div
              style={{
                background: '#fff',
                border: '1px solid #E2E6E9',
                borderRadius: '8px',
                padding: '12px 14px',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: GRID_COLS,
                  gap: '8px',
                }}
              >
                <span style={th}>BOX #</span>
                <span style={th}>SPECIES</span>
                <span style={th}>GRADE</span>
                <span style={th}>BOX TYPE</span>
                <span style={th}>GEL ICE</span>
                <span style={th}>PCS</span>
                <span style={th}>WEIGHT ({unit.toUpperCase()})</span>
                <span />
              </div>
              {lines.map((l) => (
                <div
                  key={l.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: GRID_COLS,
                    gap: '8px',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <input
                    style={{ ...cell, fontFamily: "'IBM Plex Mono', monospace" }}
                    placeholder="1"
                    value={l.box}
                    onChange={(e) => setLine(l.id, 'box', e.target.value)}
                  />
                  <input
                    style={cell}
                    list="species-hints"
                    placeholder="Large Yellow Fin"
                    value={l.species}
                    onChange={(e) => setLine(l.id, 'species', e.target.value)}
                  />
                  <input
                    style={cell}
                    placeholder="2+2"
                    value={l.grade}
                    onChange={(e) => setLine(l.id, 'grade', e.target.value)}
                  />
                  <input
                    style={cell}
                    placeholder="Foil"
                    value={l.boxType}
                    onChange={(e) => setLine(l.id, 'boxType', e.target.value)}
                  />
                  <input
                    style={cell}
                    placeholder="4"
                    value={l.gelIce}
                    onChange={(e) => setLine(l.id, 'gelIce', e.target.value)}
                  />
                  <input
                    style={{
                      ...cell,
                      textAlign: 'right',
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                    type="number"
                    min="0"
                    placeholder="0"
                    value={l.pieces}
                    onChange={(e) => setLine(l.id, 'pieces', e.target.value)}
                  />
                  <input
                    style={{
                      ...cell,
                      textAlign: 'right',
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0.0"
                    value={l.weight}
                    onChange={(e) => setLine(l.id, 'weight', e.target.value)}
                  />
                  <button
                    onClick={() => removeLine(l.id)}
                    title="Remove row"
                    style={{
                      width: '28px',
                      height: '30px',
                      borderRadius: '5px',
                      border: '1px solid #E2E6E9',
                      background: '#fff',
                      color: '#8A99A3',
                      cursor: 'pointer',
                      fontSize: '15px',
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={addLine}
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#3F6F86',
                  background: '#EEF3F6',
                  border: '1px solid #C5D8E2',
                  borderRadius: '5px',
                  padding: '7px 13px',
                  cursor: 'pointer',
                  marginTop: '4px',
                }}
              >
                + Add line
              </button>
            </div>

            {/* totals + submit */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '16px',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '13px', color: '#5A6670' }}>
                {boxCount} {boxCount === 1 ? 'box' : 'boxes'}
                {valid.length !== boxCount ? ` · ${valid.length} lines` : ''} · {totalPieces} pcs ·{' '}
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>
                  {Math.round(totalLb * 10) / 10} lb
                </span>
              </span>
              <button
                onClick={submit}
                disabled={saving || valid.length === 0}
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: '15px',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '6px',
                  padding: '12px 26px',
                  cursor: saving || valid.length === 0 ? 'default' : 'pointer',
                  background: saving || valid.length === 0 ? '#E2E6E9' : '#222A30',
                  color: saving || valid.length === 0 ? '#A6AEB4' : '#fff',
                }}
              >
                {saving ? 'Submitting…' : 'Submit packing list'}
              </button>
            </div>

            {error && (
              <div
                style={{
                  marginTop: '12px',
                  background: '#FBF0EF',
                  border: '1px solid #E3B6B1',
                  borderRadius: '5px',
                  padding: '10px 13px',
                  fontSize: '12px',
                  color: '#A5362C',
                }}
              >
                {error}
              </div>
            )}
            <div style={{ fontSize: '11px', color: '#8A99A3', marginTop: '10px', lineHeight: 1.5 }}>
              You no longer need to send an invoice — once our team reviews this packing list, the
              system generates the shipment invoice from it.
            </div>
          </div>
        )}
      </div>
    </>
  );
}
