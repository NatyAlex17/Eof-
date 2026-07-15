'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fmtDate, money, statementStatusMeta } from '../vendorData';

interface StatementLine {
  id: string;
  description: string | null;
  type: string | null;
  amount: number;
}

interface Statement {
  id: string;
  period: string | null;
  net_due: number;
  status: string;
  sent_at: string | null;
  settled_at: string | null;
  created_at: string;
  statement_lines: StatementLine[];
}

const lineType = (t: string | null) => {
  switch (t) {
    case 'credit':
      return { label: 'Credit', color: '#A5362C' };
    case 'downgrade':
      return { label: 'Downgrade', color: '#8A5A14' };
    default:
      return { label: t ? t[0].toUpperCase() + t.slice(1) : 'Line', color: '#5A6670' };
  }
};

export default function VendorSettlementsPage() {
  const [rows, setRows] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('vendor_statements')
        .select(
          'id, period, net_due, status, sent_at, settled_at, created_at, statement_lines(id, description, type, amount)'
        )
        .order('created_at', { ascending: false });
      setRows((data ?? []) as unknown as Statement[]);
      setLoading(false);
    })();
  }, []);

  const openTotal = rows
    .filter((r) => r.status !== 'settled')
    .reduce((a, r) => a + Number(r.net_due), 0);

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
          Settlements
        </span>
        {!loading && rows.length > 0 && (
          <span style={{ fontSize: '12px', color: '#5A6670' }}>
            Open net due:{' '}
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>
              {money(openTotal)}
            </span>
          </span>
        )}
      </header>

      <div className="r-pad" style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        <div style={{ maxWidth: '820px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading ? (
            <div style={{ fontSize: '13px', color: '#8A99A3' }}>Loading…</div>
          ) : rows.length === 0 ? (
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
              No settlement statements yet — they appear here once our team prepares one for you.
            </div>
          ) : (
            rows.map((r) => {
              const sm = statementStatusMeta(r.status);
              const isOpen = open === r.id;
              return (
                <div
                  key={r.id}
                  style={{
                    background: '#fff',
                    border: '1px solid #E2E6E9',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    className="r-grid2"
                    onClick={() => setOpen(isOpen ? null : r.id)}
                    style={{
                      width: '100%',
                      display: 'grid',
                      gridTemplateColumns: '1fr 130px 130px 150px',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 18px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span>
                      <span style={{ display: 'block', fontSize: '14px', fontWeight: 700 }}>
                        {r.period || 'Statement'}
                      </span>
                      <span style={{ fontSize: '11px', color: '#8A99A3' }}>
                        {r.settled_at
                          ? `settled ${fmtDate(r.settled_at)}`
                          : r.sent_at
                            ? `sent ${fmtDate(r.sent_at)}`
                            : `prepared ${fmtDate(r.created_at)}`}
                      </span>
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '14px',
                        fontWeight: 700,
                      }}
                    >
                      {money(Number(r.net_due))}
                    </span>
                    <span style={{ fontSize: '11px', color: '#8A99A3' }}>
                      {r.statement_lines.length} {r.statement_lines.length === 1 ? 'line' : 'lines'}
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
                  </button>

                  {isOpen && (
                    <div style={{ borderTop: '1px solid #EDEFF1', padding: '4px 18px 14px' }}>
                      {r.statement_lines.length === 0 ? (
                        <div style={{ fontSize: '12px', color: '#8A99A3', padding: '10px 0' }}>
                          No line detail on this statement.
                        </div>
                      ) : (
                        r.statement_lines.map((l, i) => {
                          const lt = lineType(l.type);
                          return (
                            <div
                              key={l.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'baseline',
                                gap: '12px',
                                padding: '9px 0',
                                borderBottom:
                                  i < r.statement_lines.length - 1 ? '1px solid #F0F2F3' : 'none',
                              }}
                            >
                              <span style={{ minWidth: 0 }}>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    color: lt.color,
                                    marginRight: '8px',
                                  }}
                                >
                                  {lt.label.toUpperCase()}
                                </span>
                                <span style={{ fontSize: '13px' }}>{l.description || '—'}</span>
                              </span>
                              <span
                                style={{
                                  fontFamily: "'IBM Plex Mono', monospace",
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  flex: 'none',
                                }}
                              >
                                {money(Number(l.amount))}
                              </span>
                            </div>
                          );
                        })
                      )}
                      <div style={{ fontSize: '11px', color: '#8A99A3', marginTop: '10px' }}>
                        Questions about this statement? Reply to your settlement email or contact
                        our finance team.
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
