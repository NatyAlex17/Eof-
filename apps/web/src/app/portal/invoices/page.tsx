'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { money } from '../portalData';

interface Invoice {
  id: string;
  invoice_no: string;
  amount: number;
  terms: string | null;
  status: string | null;
  created_at: string;
}

const invStatus = (s: string | null) => {
  switch (s) {
    case 'paid':
      return { label: 'Paid', color: '#2E6347', bg: '#EAF1ED' };
    case 'overdue':
      return { label: 'Overdue', color: '#A5362C', bg: '#FBF0EF' };
    default:
      return { label: s || 'Open', color: '#8A5A14', bg: '#F4EEE2' };
  }
};

export default function PortalInvoices() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('invoices')
        .select('id, invoice_no, amount, terms, status, created_at')
        .order('created_at', { ascending: false });
      setRows((data ?? []) as unknown as Invoice[]);
      setLoading(false);
    })();
  }, []);

  const outstanding = rows
    .filter((r) => r.status !== 'paid')
    .reduce((a, r) => a + Number(r.amount), 0);

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
          Invoices
        </span>
        {!loading && rows.length > 0 && (
          <span style={{ fontSize: '12px', color: '#5A6670' }}>
            Outstanding:{' '}
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>
              {money(outstanding)}
            </span>
          </span>
        )}
      </header>

      <div className="r-pad" style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        <div
          className="r-table"
          style={{
            maxWidth: '820px',
            background: '#fff',
            border: '1px solid #E2E6E9',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 130px 110px 110px 120px',
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
            <span>DATE</span>
            <span>TERMS</span>
            <span style={{ textAlign: 'right' }}>AMOUNT</span>
            <span style={{ textAlign: 'right' }}>STATUS</span>
          </div>
          {loading ? (
            <div style={{ padding: '24px 18px', fontSize: '13px', color: '#8A99A3' }}>Loading…</div>
          ) : rows.length === 0 ? (
            <div style={{ padding: '24px 18px', fontSize: '13px', color: '#8A99A3' }}>
              No invoices yet.
            </div>
          ) : (
            rows.map((r) => {
              const st = invStatus(r.status);
              return (
                <div
                  key={r.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 130px 110px 110px 120px',
                    alignItems: 'center',
                    padding: '13px 18px',
                    borderBottom: '1px solid #EDEFF1',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    {r.invoice_no}
                  </span>
                  <span style={{ fontSize: '12px', color: '#5A6670' }}>
                    {new Date(r.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '12px',
                      color: '#5A6670',
                    }}
                  >
                    {r.terms || '—'}
                  </span>
                  <span
                    style={{
                      textAlign: 'right',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '13px',
                      fontWeight: 700,
                    }}
                  >
                    {money(Number(r.amount))}
                  </span>
                  <span style={{ textAlign: 'right' }}>
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
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
