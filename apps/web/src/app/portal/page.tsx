'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { money, statusMeta } from './portalData';

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
  order_lines: Line[];
}

const orderLb = (o: Order) => o.order_lines.reduce((a, l) => a + Number(l.target_weight), 0);
const orderValue = (o: Order) =>
  o.order_lines.reduce((a, l) => a + Number(l.target_weight) * Number(l.unit_price ?? 0), 0);

export default function PortalDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [{ data: cust }, { data: ords }] = await Promise.all([
        supabase.from('customers').select('name').maybeSingle(),
        supabase
          .from('orders')
          .select(
            'id, code, status, ship_date, created_at, order_lines(species, grade, target_weight, unit_price)'
          )
          .order('created_at', { ascending: false }),
      ]);
      setName(cust?.name ?? '');
      setOrders((ords ?? []) as unknown as Order[]);
      setLoading(false);
    })();
  }, []);

  const now = new Date();
  const thisMonth = orders.filter((o) => {
    const d = new Date(o.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const openOrders = orders.filter((o) => !['shipped', 'invoiced'].includes(o.status));
  const lbThisMonth = Math.round(thisMonth.reduce((a, o) => a + orderLb(o), 0));
  const spendThisMonth = thisMonth.reduce((a, o) => a + orderValue(o), 0);

  const kpis = [
    { label: 'OPEN ORDERS', value: String(openOrders.length), sub: 'in progress' },
    { label: 'ORDERS THIS MONTH', value: String(thisMonth.length), sub: 'placed' },
    { label: 'POUNDS THIS MONTH', value: lbThisMonth.toLocaleString(), sub: 'lb ordered' },
    { label: 'SPEND THIS MONTH', value: money(spendThisMonth), sub: 'est. at your prices' },
  ];

  return (
    <>
      <header
        className="r-header"
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
        <Link
          href="/portal/order"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            fontFamily: "'Archivo', sans-serif",
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
        <div style={{ maxWidth: '960px' }}>
          {/* KPIs */}
          <div
            className="r-grid2"
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

          {/* Recent orders */}
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderBottom: '1px solid #E2E6E9',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 700 }}>Recent orders</span>
              <Link
                href="/portal/orders"
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
            ) : orders.length === 0 ? (
              <div style={{ padding: '30px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>No orders yet</div>
                <div style={{ fontSize: '13px', color: '#8A99A3', margin: '6px 0 16px' }}>
                  Place your first order and it will show up here.
                </div>
                <Link
                  href="/portal/order"
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
                  + Place an order
                </Link>
              </div>
            ) : (
              orders.slice(0, 6).map((o) => {
                const sm = statusMeta(o.status);
                return (
                  <div
                    key={o.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '120px 1fr 120px 90px 120px',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '13px 18px',
                      borderBottom: '1px solid #EDEFF1',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '12px',
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
                      {o.order_lines
                        .map((l) => `${l.species}${l.grade ? ` ${l.grade}` : ''}`)
                        .join(', ')}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '12px',
                        color: '#5A6670',
                      }}
                    >
                      {Math.round(orderLb(o))} lb
                    </span>
                    <span style={{ fontSize: '11px', color: '#8A99A3' }}>
                      {new Date(o.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span>
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
