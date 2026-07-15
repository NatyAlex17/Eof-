'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { money, statusMeta } from '../portalData';

interface Line {
  species: string;
  grade: string | null;
  target_weight: number;
  unit_price: number | null;
}
interface Order {
  id: string;
  code: string;
  status: string;
  ship_date: string | null;
  created_at: string;
  carrier: string | null;
  location: string | null;
  order_lines: Line[];
}

const lb = (o: Order) => o.order_lines.reduce((a, l) => a + Number(l.target_weight), 0);
const val = (o: Order) =>
  o.order_lines.reduce((a, l) => a + Number(l.target_weight) * Number(l.unit_price ?? 0), 0);

export default function PortalOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('orders')
        .select(
          'id, code, status, ship_date, created_at, carrier, location, order_lines(species, grade, target_weight, unit_price)'
        )
        .order('created_at', { ascending: false });
      setOrders((data ?? []) as unknown as Order[]);
      setLoading(false);
    })();
  }, []);

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
          My orders
        </span>
        <Link
          href="/portal/order"
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
          + Place an order
        </Link>
      </header>

      <div className="r-pad" style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        <div style={{ maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading ? (
            <div style={{ fontSize: '13px', color: '#8A99A3' }}>Loading…</div>
          ) : orders.length === 0 ? (
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
              You haven’t placed any orders yet.
            </div>
          ) : (
            orders.map((o) => {
              const sm = statusMeta(o.status);
              const isOpen = open === o.id;
              return (
                <div
                  key={o.id}
                  style={{
                    background: '#fff',
                    border: '1px solid #E2E6E9',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    className="r-grid2"
                    onClick={() => setOpen(isOpen ? null : o.id)}
                    style={{
                      width: '100%',
                      display: 'grid',
                      gridTemplateColumns: '130px 1fr 90px 110px 130px',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 18px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      {o.code}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#5A6670',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {o.order_lines.length} {o.order_lines.length === 1 ? 'item' : 'items'} ·{' '}
                      {Math.round(lb(o))} lb
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      {money(val(o))}
                    </span>
                    <span style={{ fontSize: '11px', color: '#8A99A3' }}>
                      {o.ship_date
                        ? `Ships ${new Date(o.ship_date + 'T00:00:00').toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}`
                        : new Date(o.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
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
                      {o.order_lines.map((l, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            padding: '9px 0',
                            borderBottom:
                              i < o.order_lines.length - 1 ? '1px solid #F0F2F3' : 'none',
                          }}
                        >
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>
                            {l.species}
                            {l.grade ? ` · ${l.grade}` : ''}
                          </span>
                          <span
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '12px',
                              color: '#5A6670',
                            }}
                          >
                            {Math.round(Number(l.target_weight))} lb @{' '}
                            {money(Number(l.unit_price ?? 0))} ={' '}
                            {money(Number(l.target_weight) * Number(l.unit_price ?? 0))}
                          </span>
                        </div>
                      ))}
                      <div style={{ fontSize: '11px', color: '#8A99A3', marginTop: '10px' }}>
                        {o.location ? `Warehouse ${o.location}` : ''}
                        {o.carrier ? ` · ${o.carrier}` : ''}
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
