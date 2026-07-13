'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Line {
  box: string;
  species: string;
  grade: string | null;
  weight_lb: number;
  pieces: number | null;
  box_type: string | null;
  gel_ice: string | null;
}

interface Doc {
  id: string;
  created_at: string;
  destination_code: string | null;
  routing_detected: string | null;
  parsed_payload: {
    lines?: Line[];
    destination?: string;
    pl_number?: string | null;
    awb?: string | null;
    received_date?: string | null;
  } | null;
  vendors: {
    name: string;
    code: string;
    contact_email: string | null;
    terms: string | null;
  } | null;
  shipment: { awb: string | null; origin: string | null; eta: string | null } | null;
}

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';

export default function GeneratedInvoicePage() {
  const params = useParams<{ id: string }>();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      // `shipment:shipment_id(...)` disambiguates the embed — documents and
      // shipments are linked by three FKs, so a bare `shipments(...)` is ambiguous.
      const { data, error } = await supabase
        .from('documents')
        .select(
          'id, created_at, destination_code, routing_detected, parsed_payload, vendors(name, code, contact_email, terms), shipment:shipment_id(awb, origin, eta)'
        )
        .eq('id', params.id)
        .maybeSingle();
      if (error) setLoadError(error.message);
      setDoc((data ?? null) as unknown as Doc | null);
      setLoading(false);
    })();
  }, [params.id]);

  const lines = doc?.parsed_payload?.lines ?? [];
  const totalLb = lines.reduce((a, l) => a + Number(l.weight_lb || 0), 0);
  const totalPcs = lines.reduce((a, l) => a + (Number(l.pieces) || 0), 0);
  // A box number can span several lines (multiple species/grades in one box).
  const boxCount = new Set(lines.map((l) => (l.box || '').trim().toLowerCase()).filter(Boolean))
    .size;
  const pl = doc?.parsed_payload?.pl_number;
  const docNo = pl ? pl : `MANA-${(doc?.id ?? '').slice(0, 8).toUpperCase()}`;
  const dest = doc?.destination_code || doc?.parsed_payload?.destination || '—';
  const awb = doc?.parsed_payload?.awb || doc?.shipment?.awb || '—';
  const docDate = doc?.parsed_payload?.received_date || doc?.created_at || null;

  // One-click PDF: rasterize the sheet at 2× and lay it into a letter-size PDF,
  // paginating if the sheet is taller than one page.
  const downloadPdf = async () => {
    const el = sheetRef.current;
    if (!el || pdfBusy) return;
    setPdfBusy(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width;
      const img = canvas.toDataURL('image/png');

      let remaining = imgH;
      let offset = 0;
      while (remaining > 0) {
        pdf.addImage(img, 'PNG', 0, offset, pageW, imgH);
        remaining -= pageH;
        if (remaining > 0) {
          offset -= pageH;
          pdf.addPage();
        }
      }
      pdf.save(`${docNo.replace(/[^a-zA-Z0-9._-]+/g, '_')}.pdf`);
    } catch {
      // Fall back to the print dialog if canvas/PDF generation fails.
      window.print();
    } finally {
      setPdfBusy(false);
    }
  };

  const cellL: React.CSSProperties = {
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: '#8A99A3',
    padding: '8px 10px',
    textAlign: 'left',
    borderBottom: '2px solid #222A30',
  };
  const cell: React.CSSProperties = {
    fontSize: '12px',
    padding: '8px 10px',
    borderBottom: '1px solid #E2E6E9',
    color: '#222A30',
  };
  const meta = (k: string, v: string) => (
    <div style={{ marginBottom: '6px' }}>
      <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.07em', color: '#8A99A3' }}>
        {k}
      </span>
      <div style={{ fontSize: '13px', color: '#222A30', fontWeight: 600 }}>{v}</div>
    </div>
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#E7EAEC',
        fontFamily: "'Archivo', sans-serif",
        WebkitFontSmoothing: 'antialiased',
        padding: '28px',
      }}
    >
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .sheet { box-shadow: none !important; margin: 0 !important; }
        }
      `}</style>

      {/* toolbar (screen only) */}
      <div
        className="no-print"
        style={{
          maxWidth: '780px',
          margin: '0 auto 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <a
          href="/mana/documents"
          style={{ fontSize: '13px', color: '#3F6F86', fontWeight: 600, textDecoration: 'none' }}
        >
          ← Back to Documents
        </a>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => window.print()}
            disabled={loading || lines.length === 0}
            style={{
              fontFamily: "'Archivo', sans-serif",
              fontSize: '13px',
              fontWeight: 600,
              background: '#fff',
              color: '#3F6F86',
              border: '1px solid #C5D8E2',
              borderRadius: '6px',
              padding: '10px 16px',
              cursor: loading || lines.length === 0 ? 'default' : 'pointer',
            }}
          >
            Print
          </button>
          <button
            onClick={downloadPdf}
            disabled={loading || pdfBusy || lines.length === 0}
            style={{
              fontFamily: "'Archivo', sans-serif",
              fontSize: '13px',
              fontWeight: 700,
              background: loading || pdfBusy || lines.length === 0 ? '#E2E6E9' : '#222A30',
              color: loading || pdfBusy || lines.length === 0 ? '#A6AEB4' : '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 18px',
              cursor: loading || pdfBusy || lines.length === 0 ? 'default' : 'pointer',
            }}
          >
            {pdfBusy ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* the document */}
      <div
        ref={sheetRef}
        className="sheet"
        style={{
          position: 'relative',
          maxWidth: '780px',
          margin: '0 auto',
          background: '#fff',
          border: '1px solid #E2E6E9',
          borderRadius: '4px',
          boxShadow: '0 8px 30px rgba(34,42,48,0.12)',
          padding: '48px 52px',
          overflow: 'hidden',
        }}
      >
        {/* watermark */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'rotate(-28deg)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          <span
            style={{
              fontSize: '84px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: 'rgba(63,111,134,0.06)',
              whiteSpace: 'nowrap',
            }}
          >
            MANA SEAFOOD
          </span>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          {loading ? (
            <div style={{ fontSize: '13px', color: '#8A99A3' }}>Loading…</div>
          ) : !doc ? (
            <div style={{ fontSize: '13px', color: '#8A99A3' }}>
              Document not found.
              {loadError ? (
                <div style={{ color: '#A5362C', marginTop: '6px' }}>{loadError}</div>
              ) : null}
            </div>
          ) : (
            <>
              {/* letterhead */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  paddingBottom: '20px',
                  borderBottom: '2px solid #222A30',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src="/logo.png"
                    alt="MANA"
                    style={{ width: '56px', height: '52px', objectFit: 'contain' }}
                  />
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '0.02em' }}>
                      MANA
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        letterSpacing: '0.14em',
                        color: '#8A99A3',
                      }}
                    >
                      SEAFOOD · ESSENTIAL OCEAN FOODS
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.02em' }}>
                    COMMERCIAL INVOICE
                  </div>
                  <div style={{ fontSize: '11px', color: '#8A99A3', fontWeight: 600 }}>
                    / PACKING LIST
                  </div>
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '13px',
                      fontWeight: 700,
                      marginTop: '8px',
                    }}
                  >
                    {docNo}
                  </div>
                  <div style={{ fontSize: '12px', color: '#5A6670', marginTop: '2px' }}>
                    {fmt(docDate)}
                  </div>
                </div>
              </div>

              {/* parties */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '24px',
                  padding: '22px 0',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      color: '#8A99A3',
                      marginBottom: '8px',
                    }}
                  >
                    SHIP FROM (VENDOR)
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700 }}>
                    {doc.vendors?.name ?? '—'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#5A6670', marginTop: '2px' }}>
                    {doc.vendors?.code}
                    {doc.vendors?.contact_email ? ` · ${doc.vendors.contact_email}` : ''}
                  </div>
                  {doc.shipment?.origin && (
                    <div style={{ fontSize: '12px', color: '#5A6670', marginTop: '2px' }}>
                      Origin: {doc.shipment.origin}
                    </div>
                  )}
                </div>
                <div>
                  {meta(
                    'DESTINATION',
                    `${dest}${doc.routing_detected ? ` · ${doc.routing_detected}` : ''}`
                  )}
                  {meta('AIRWAY BILL', awb)}
                  {meta('TERMS', doc.vendors?.terms || '—')}
                </div>
              </div>

              {/* line items */}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={cellL}>BOX</th>
                    <th style={cellL}>SPECIES · GRADE</th>
                    <th style={cellL}>BOX TYPE</th>
                    <th style={{ ...cellL, textAlign: 'right' }}>GEL ICE</th>
                    <th style={{ ...cellL, textAlign: 'right' }}>PIECES</th>
                    <th style={{ ...cellL, textAlign: 'right' }}>WEIGHT (LB)</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i}>
                      <td
                        style={{
                          ...cell,
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontWeight: 600,
                        }}
                      >
                        {l.box}
                      </td>
                      <td style={cell}>
                        {l.species}
                        {l.grade ? ` · ${l.grade}` : ''}
                      </td>
                      <td style={{ ...cell, color: '#5A6670' }}>{l.box_type || '—'}</td>
                      <td
                        style={{
                          ...cell,
                          textAlign: 'right',
                          color: '#5A6670',
                          fontFamily: "'IBM Plex Mono', monospace",
                        }}
                      >
                        {l.gel_ice || '—'}
                      </td>
                      <td
                        style={{
                          ...cell,
                          textAlign: 'right',
                          fontFamily: "'IBM Plex Mono', monospace",
                        }}
                      >
                        {l.pieces ?? '—'}
                      </td>
                      <td
                        style={{
                          ...cell,
                          textAlign: 'right',
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontWeight: 600,
                        }}
                      >
                        {l.weight_lb}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      style={{ padding: '12px 10px', fontSize: '13px', fontWeight: 700 }}
                      colSpan={4}
                    >
                      TOTAL · {boxCount} {boxCount === 1 ? 'box' : 'boxes'}
                      {lines.length !== boxCount ? ` · ${lines.length} lines` : ''}
                    </td>
                    <td
                      style={{
                        padding: '12px 10px',
                        textAlign: 'right',
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontWeight: 700,
                      }}
                    >
                      {totalPcs || '—'}
                    </td>
                    <td
                      style={{
                        padding: '12px 10px',
                        textAlign: 'right',
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontWeight: 700,
                        fontSize: '14px',
                      }}
                    >
                      {Math.round(totalLb * 10) / 10}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* footer */}
              <div
                style={{
                  marginTop: '32px',
                  paddingTop: '16px',
                  borderTop: '1px solid #E2E6E9',
                  fontSize: '11px',
                  color: '#8A99A3',
                  lineHeight: 1.6,
                }}
              >
                Generated by MANA Seafood from the vendor&apos;s submitted packing list. This
                document summarizes product received and is not a payment demand. Settlement is
                handled per the agreed terms.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
