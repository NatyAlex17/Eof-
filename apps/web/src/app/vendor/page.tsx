'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { docStatusMeta, fmtDate, money, verificationMeta } from './vendorData';

interface DocRow {
  id: string;
  kind: string;
  original_filename: string;
  parse_status: string;
  destination_code: string | null;
  created_at: string;
}

const KIND_LABEL: Record<string, string> = {
  packing_list: 'Packing list',
  commercial_invoice: 'Commercial invoice',
};

export default function VendorDashboard() {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<string>('pending');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [pendingDocs, setPendingDocs] = useState(0);
  const [activeShipments, setActiveShipments] = useState(0);
  const [openLots, setOpenLots] = useState(0);
  const [openNetDue, setOpenNetDue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [{ data: vend }, { data: d }, { data: ships }, { data: lots }, { data: stmts }] =
        await Promise.all([
          supabase
            .from('vendors')
            .select('name, verification_status, rejection_reason')
            .limit(1)
            .maybeSingle(),
          supabase
            .from('documents')
            .select('id, kind, original_filename, parse_status, destination_code, created_at')
            .order('created_at', { ascending: false }),
          supabase.from('shipments').select('id, status'),
          supabase.from('lots').select('id, status'),
          supabase.from('vendor_statements').select('net_due, status'),
        ]);
      setName(vend?.name ?? '');
      setStatus(vend?.verification_status ?? 'pending');
      setRejectionReason(vend?.rejection_reason ?? null);
      const docRows = (d ?? []) as DocRow[];
      setDocs(docRows);
      setPendingDocs(docRows.filter((r) => r.parse_status !== 'posted').length);
      setActiveShipments(
        (ships ?? []).filter((s) => ['expected', 'in_transit', 'arrived'].includes(s.status)).length
      );
      setOpenLots((lots ?? []).filter((l) => l.status !== 'shipped').length);
      setOpenNetDue(
        (stmts ?? [])
          .filter((s) => s.status !== 'settled')
          .reduce((a, s) => a + Number(s.net_due), 0)
      );
      setLoading(false);
    })();
  }, []);

  const kpis = [
    { label: 'DOCUMENTS IN REVIEW', value: String(pendingDocs), sub: 'awaiting our team' },
    { label: 'ACTIVE SHIPMENTS', value: String(activeShipments), sub: 'expected / in transit' },
    { label: 'LOTS WITH US', value: String(openLots), sub: 'not yet sold through' },
    { label: 'OPEN SETTLEMENTS', value: money(openNetDue), sub: 'net due, unsettled' },
  ];

  return (
    <>
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
        <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
          {loading ? 'Dashboard' : `Welcome${name ? `, ${name}` : ''}`}
        </span>
        {status === 'verified' && (
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
        )}
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        <div style={{ maxWidth: '960px' }}>
          {/* VERIFICATION STATUS — gates document submission */}
          {!loading && status !== 'verified' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                background: verificationMeta(status).bg,
                border: `1px solid ${verificationMeta(status).dot}`,
                borderRadius: '8px',
                padding: '16px 18px',
                marginBottom: '22px',
              }}
            >
              <span
                style={{
                  flex: 'none',
                  marginTop: '2px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: verificationMeta(status).dot,
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: verificationMeta(status).color,
                  }}
                >
                  {status === 'rejected'
                    ? 'Your account was not approved'
                    : 'Your account is pending verification'}
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: verificationMeta(status).color,
                    marginTop: '4px',
                    lineHeight: 1.5,
                    maxWidth: '640px',
                  }}
                >
                  {status === 'rejected'
                    ? rejectionReason
                      ? `Reason: ${rejectionReason}. Please contact our team to resolve this.`
                      : 'Please contact our team to resolve this before submitting.'
                    : 'Our team is reviewing your details. You can browse the portal, but you can submit packing lists once your account is verified — we’ll notify you.'}
                </div>
              </div>
            </div>
          )}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '14px',
              marginBottom: '22px',
            }}
          >
            {kpis.map((k) => (
              <div
                key={k.label}
                style={{
                  background: '#fff',
                  border: '1px solid #E2E6E9',
                  borderRadius: '8px',
                  padding: '16px 18px',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: '#8A99A3',
                  }}
                >
                  {k.label}
                </div>
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    marginTop: '8px',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  {loading ? '·' : k.value}
                </div>
                <div style={{ fontSize: '11px', color: '#8A99A3', marginTop: '3px' }}>{k.sub}</div>
              </div>
            ))}
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderBottom: '1px solid #E2E6E9',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 700 }}>Recent documents</span>
              <Link
                href="/vendor/documents"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#3F6F86',
                  textDecoration: 'none',
                }}
              >
                View all →
              </Link>
            </div>

            {loading ? (
              <div style={{ padding: '24px 18px', fontSize: '13px', color: '#8A99A3' }}>
                Loading…
              </div>
            ) : docs.length === 0 ? (
              <div style={{ padding: '30px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>No documents yet</div>
                <div style={{ fontSize: '13px', color: '#8A99A3', margin: '6px 0 16px' }}>
                  Submit your packing list and it appears here.
                </div>
                <Link
                  href="/vendor/upload"
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    background: '#222A30',
                    color: '#fff',
                    borderRadius: '5px',
                    padding: '10px 16px',
                    textDecoration: 'none',
                  }}
                >
                  + Submit packing list
                </Link>
              </div>
            ) : (
              docs.slice(0, 6).map((d) => {
                const sm = docStatusMeta(d.parse_status);
                return (
                  <div
                    key={d.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 160px 80px 110px 110px',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '13px 18px',
                      borderBottom: '1px solid #EDEFF1',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {d.original_filename}
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
