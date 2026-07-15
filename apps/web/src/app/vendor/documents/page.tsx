'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { docStatusMeta, fmtDate } from '../vendorData';

interface DocRow {
  id: string;
  kind: string;
  original_filename: string;
  parse_status: string;
  parse_error: string | null;
  destination_code: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const KIND_LABEL: Record<string, string> = {
  packing_list: 'Packing list',
  commercial_invoice: 'Commercial invoice',
  vendor_statement: 'Statement',
  po_import: 'PO import',
  other: 'Other',
};

export default function VendorDocumentsPage() {
  const [rows, setRows] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'in_review' | 'posted'>('all');

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('documents')
        .select(
          'id, kind, original_filename, parse_status, parse_error, destination_code, created_at, reviewed_at'
        )
        .order('created_at', { ascending: false });
      setRows((data ?? []) as DocRow[]);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) =>
    filter === 'all'
      ? true
      : filter === 'posted'
        ? r.parse_status === 'posted'
        : r.parse_status !== 'posted'
  );

  const chip = (on: boolean): React.CSSProperties => ({
    fontFamily: "'Archivo', sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    cursor: 'pointer',
    background: on ? '#B7791F' : 'none',
    color: on ? '#fff' : '#5A6670',
  });

  return (
    <>
      <header
        className="r-header"
        style={{
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          height: '58px',
          borderBottom: '1px solid #E2E6E9',
          background: '#FFFFFF',
        }}
      >
        <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
          My documents
        </span>
        <Link
          href="/vendor/upload"
          style={{
            fontSize: '13px',
            fontWeight: 600,
            background: '#222A30',
            color: '#fff',
            borderRadius: '5px',
            padding: '9px 15px',
            textDecoration: 'none',
          }}
        >
          + Submit packing list
        </Link>
      </header>

      <div className="r-pad" style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        <div style={{ maxWidth: '900px' }}>
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
                ['all', 'All'],
                ['in_review', 'In review'],
                ['posted', 'Processed'],
              ] as const
            ).map(([k, lbl]) => (
              <button key={k} onClick={() => setFilter(k)} style={chip(filter === k)}>
                {lbl}
              </button>
            ))}
          </div>

          <div
            className="r-table"
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
                gridTemplateColumns: '1fr 160px 80px 120px 120px',
                padding: '11px 18px',
                background: '#FAFBFB',
                borderBottom: '1px solid #E2E6E9',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.07em',
                color: '#8A99A3',
              }}
            >
              <span>FILE</span>
              <span>TYPE</span>
              <span>DEST</span>
              <span>SUBMITTED</span>
              <span style={{ textAlign: 'right' }}>STATUS</span>
            </div>
            {loading ? (
              <div style={{ padding: '24px 18px', fontSize: '13px', color: '#8A99A3' }}>
                Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '24px 18px', fontSize: '13px', color: '#8A99A3' }}>
                {rows.length === 0
                  ? 'No packing lists yet — submit your first one.'
                  : 'Nothing matches this filter.'}
              </div>
            ) : (
              filtered.map((d) => {
                const sm = docStatusMeta(d.parse_status);
                return (
                  <div
                    key={d.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 160px 80px 120px 120px',
                      alignItems: 'center',
                      padding: '13px 18px',
                      borderBottom: '1px solid #EDEFF1',
                    }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '13px',
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {d.original_filename}
                      </span>
                      {d.parse_status === 'posted' && d.reviewed_at && (
                        <span style={{ fontSize: '11px', color: '#8A99A3' }}>
                          processed {fmtDate(d.reviewed_at)}
                        </span>
                      )}
                    </span>
                    <span style={{ fontSize: '12px', color: '#5A6670' }}>
                      {KIND_LABEL[d.kind] ?? d.kind}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '12px',
                        color: '#5A6670',
                      }}
                    >
                      {d.destination_code || '—'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#8A99A3' }}>
                      {fmtDate(d.created_at)}
                    </span>
                    <span style={{ textAlign: 'right' }}>
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
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
