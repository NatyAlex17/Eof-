'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Nav from '../components/Nav';
import DateRangeFilter, { selectionLabel, type DateSelection } from '../components/DateRangeFilter';
import { fetchOrderFulfillment, fetchOrderLines } from '@/lib/data/queries';
import { createClient } from '@/lib/supabase/client';

type OrderStatus = 'open' | 'allocated' | 'locked' | 'shipped' | 'invoiced';

// Warehouses feed the allocation board; direct-shipment origins (ORD/HNL) bypass
// the warehouse entirely (per the schema-audit docs: LAX/SFO -> warehouse,
// ORD/HNL -> direct).
const WAREHOUSE_OPTS = ['SFO', 'LAX'];
const DIRECT_OPTS = ['ORD', 'HNL'];
const isUnassigned = (loc: string) => !loc || loc === '—';
const isDirect = (loc: string) => DIRECT_OPTS.includes(loc);

interface OrderLine {
  species: string;
  grade: string;
  lb: number;
  price: number; // $/lb
}

interface OrderRow {
  id: string;
  code: string;
  customer: string;
  tier: 'T1' | 'T2' | 'T3';
  lines: OrderLine[];
  date: string; // entered date, ISO yyyy-mm-dd
  time: string; // entered time, HH:mm
  shipDate: string; // ISO
  carrier: string;
  location: string;
  status: OrderStatus;
  enteredBy: string;
}

const STATUS_META: Record<OrderStatus, { label: string; color: string; bg: string; dot: string }> =
  {
    open: { label: 'Open', color: '#8A5A14', bg: '#F4EEE2', dot: '#B7791F' },
    allocated: { label: 'Allocated', color: '#2D5365', bg: '#EEF3F6', dot: '#3F6F86' },
    locked: { label: 'Locked', color: '#5A3E6B', bg: '#F0ECF6', dot: '#7B6A91' },
    shipped: { label: 'Shipped', color: '#5A6670', bg: '#EEF0F2', dot: '#8A99A3' },
    invoiced: { label: 'Invoiced', color: '#2E6347', bg: '#EAF1ED', dot: '#3F7D5B' },
  };

const TIER_LABEL: Record<OrderRow['tier'], string> = { T1: 'Tier 1', T2: 'Tier 2', T3: 'Tier 3' };

const money = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const orderLb = (o: OrderRow) => o.lines.reduce((a, l) => a + l.lb, 0);
const orderValue = (o: OrderRow) => o.lines.reduce((a, l) => a + l.lb * l.price, 0);

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Row grid — generous gaps, no fixed page max-width, so nothing overlaps
const GRID = '22px 104px 1.1fr 1.4fr 84px 104px 76px 104px 120px 104px';
const GRID_GAP = '14px';

export default function OrdersPage() {
  const [filter, setFilter] = useState<'all' | OrderStatus>('all');
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sel, setSel] = useState<DateSelection | null>(null);
  const [todayIso, setTodayIso] = useState<string>('');
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignFor, setAssignFor] = useState<OrderRow | null>(null);
  const [savingAssign, setSavingAssign] = useState(false);

  const assignLocation = async (id: string, location: string) => {
    setSavingAssign(true);
    const { error } = await createClient().from('orders').update({ location }).eq('id', id);
    setSavingAssign(false);
    if (error) return; // keep the modal open on failure
    setRows((prev) => prev.map((o) => (o.id === id ? { ...o, location } : o)));
    setAssignFor(null);
  };

  // today computed on the client to avoid SSR mismatch
  useEffect(() => {
    const d = new Date();
    setTodayIso(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    );
  }, []);

  // Live orders from Supabase — heads (orders + customer/tier) joined to lines.
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: heads }, { data: lineRows }] = await Promise.all([
        fetchOrderFulfillment(),
        fetchOrderLines(),
      ]);

      const linesByOrder: Record<string, OrderLine[]> = {};
      (lineRows ?? []).forEach((r) => {
        const row = r as {
          order_id: string;
          species: string;
          grade: string | null;
          target_weight: number | null;
          unit_price: number | null;
        };
        (linesByOrder[row.order_id] ??= []).push({
          species: row.species,
          grade: row.grade ?? '—',
          lb: Number(row.target_weight ?? 0),
          price: Number(row.unit_price ?? 0),
        });
      });

      const built: OrderRow[] = (heads ?? []).map((h) => {
        const head = h as {
          id: string;
          code: string;
          customer: string | null;
          tier: string | null;
          ship_date: string | null;
          carrier: string | null;
          location: string | null;
          status: OrderStatus;
          created_at: string;
        };
        const created = new Date(head.created_at);
        return {
          id: head.id,
          code: head.code,
          customer: head.customer ?? '—',
          tier: (head.tier as OrderRow['tier']) ?? 'T2',
          lines: linesByOrder[head.id] ?? [],
          date: head.created_at.slice(0, 10),
          time: created.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }),
          shipDate: head.ship_date ?? head.created_at.slice(0, 10),
          carrier: head.carrier ?? '—',
          location: head.location ?? '—',
          status: head.status,
          enteredBy: '—',
        };
      });
      // newest first
      built.sort((a, b) =>
        a.date < b.date ? 1 : a.date > b.date ? -1 : b.time.localeCompare(a.time)
      );
      setRows(built);
      setLoading(false);
    })();
  }, []);

  // date-range first (historical view), then status, then search
  const inRange = (o: OrderRow) => !sel || (o.date >= sel.start && o.date <= sel.end);

  const dateFiltered = rows.filter(inRange);

  const filtered = dateFiltered.filter((o) => {
    if (filter !== 'all' && o.status !== filter) return false;
    if (unassignedOnly && !isUnassigned(o.location)) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      o.code.toLowerCase().includes(q) ||
      o.customer.toLowerCase().includes(q) ||
      o.lines.some((l) => l.species.toLowerCase().includes(q)) ||
      o.enteredBy.toLowerCase().includes(q)
    );
  });

  const unassignedCount = dateFiltered.filter((o) => isUnassigned(o.location)).length;

  const rangeLbl = sel ? selectionLabel(sel) : 'Last 7 days';
  const todayOrders = todayIso ? rows.filter((o) => o.date === todayIso) : [];
  const openInRange = dateFiltered.filter((o) => o.status === 'open' || o.status === 'allocated');
  const rangeValue = dateFiltered.reduce((a, o) => a + orderValue(o), 0);
  const doneInRange = dateFiltered.filter((o) => o.status === 'shipped' || o.status === 'invoiced');

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

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
        {/* HEADER */}
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
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              Orders
            </span>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                color: '#8A99A3',
              }}
            >
              central order record · {rangeLbl}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search order, customer, species…"
              style={{
                fontFamily: "'Archivo', sans-serif",
                fontSize: '13px',
                border: '1px solid #D6DCE0',
                borderRadius: '5px',
                padding: '8px 12px',
                width: '220px',
                outline: 'none',
                background: '#fff',
              }}
            />
            <Link
              href="/mana/order-intake"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                fontFamily: "'Archivo', sans-serif",
                fontSize: '13px',
                fontWeight: 600,
                background: '#222A30',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                padding: '9px 15px',
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New order
            </Link>
          </div>
        </header>

        {/* FILTER BAR — status chips + date range */}
        <div
          style={{
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '10px 28px',
            borderBottom: '1px solid #E2E6E9',
            background: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                background: '#F4F5F6',
                border: '1px solid #E2E6E9',
                borderRadius: '5px',
                padding: '3px',
              }}
            >
              {(['all', 'open', 'allocated', 'locked', 'shipped', 'invoiced'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    fontFamily: "'Archivo', sans-serif",
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    background: filter === f ? '#3F6F86' : 'none',
                    color: filter === f ? '#fff' : '#5A6670',
                  }}
                >
                  {f === 'all' ? 'All' : STATUS_META[f].label}
                  {f !== 'all' && (
                    <span style={{ marginLeft: '6px', opacity: 0.75 }}>
                      {dateFiltered.filter((o) => o.status === f).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setUnassignedOnly((v) => !v)}
              title="Orders with no warehouse yet — assign a warehouse or mark them direct"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                fontFamily: "'Archivo', sans-serif",
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '5px',
                padding: '7px 12px',
                cursor: 'pointer',
                border: `1px solid ${unassignedOnly ? '#B7791F' : '#E4D2A8'}`,
                background: unassignedOnly ? '#B7791F' : '#F4EEE2',
                color: unassignedOnly ? '#fff' : '#8A5A14',
              }}
            >
              Warehouse unassigned
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontWeight: 700,
                  background: unassignedOnly ? 'rgba(255,255,255,0.25)' : '#fff',
                  borderRadius: '10px',
                  padding: '0 7px',
                }}
              >
                {unassignedCount}
              </span>
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '11px',
                color: '#8A99A3',
              }}
            >
              {filtered.length} of {dateFiltered.length} in range
            </span>
            <DateRangeFilter defaultKey="last7" onChange={setSel} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px' }}>
          {/* KPI STRIP — follows the selected date range */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4,1fr)',
              gap: '14px',
              marginBottom: '20px',
            }}
          >
            {[
              {
                label: 'ENTERED TODAY',
                value: todayIso ? String(todayOrders.length) : '—',
                sub: todayIso
                  ? todayOrders.reduce((a, o) => a + orderLb(o), 0).toFixed(0) + ' lb taken in'
                  : 'loading',
                accent: '#222A30',
                border: '#3F6F86',
              },
              {
                label: 'OPEN / ALLOCATING',
                value: String(openInRange.length),
                sub:
                  openInRange.reduce((a, o) => a + orderLb(o), 0).toFixed(0) +
                  ' lb awaiting the board',
                accent: '#8A5A14',
                border: '#B7791F',
              },
              {
                label: `VALUE · ${rangeLbl.toUpperCase()}`,
                value: '$' + (rangeValue / 1000).toFixed(1) + 'k',
                sub: dateFiltered.length + ' orders in range',
                accent: '#2E6347',
                border: '#3F7D5B',
              },
              {
                label: 'SHIPPED / INVOICED',
                value: String(doneInRange.length),
                sub: 'completed in range',
                accent: '#5A6670',
                border: '#8A99A3',
              },
            ].map((k) => (
              <div
                key={k.label}
                style={{
                  background: '#fff',
                  border: '1px solid #E2E6E9',
                  borderLeft: `3px solid ${k.border}`,
                  borderRadius: '8px',
                  padding: '16px 18px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    color: '#8A99A3',
                  }}
                >
                  {k.label}
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '24px',
                    fontWeight: 600,
                    color: k.accent,
                    marginTop: '8px',
                  }}
                >
                  {k.value}
                </div>
                <div style={{ fontSize: '12px', color: '#5A6670', marginTop: '4px' }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* ORDERS TABLE */}
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
                display: 'grid',
                gridTemplateColumns: GRID,
                columnGap: GRID_GAP,
                alignItems: 'center',
                padding: '11px 18px',
                background: '#FAFBFB',
                borderBottom: '1px solid #E2E6E9',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.07em',
                color: '#8A99A3',
              }}
            >
              <span></span>
              <span>ORDER</span>
              <span>CUSTOMER</span>
              <span>SPECIES</span>
              <span style={{ textAlign: 'right' }}>TOTAL LB</span>
              <span style={{ textAlign: 'right' }}>VALUE</span>
              <span>SHIP</span>
              <span>LOC</span>
              <span>ENTERED BY</span>
              <span>STATUS</span>
            </div>

            {filtered.map((o) => {
              const sm = STATUS_META[o.status];
              const isOpen = !!expanded[o.id];
              return (
                <div key={o.id} style={{ borderBottom: '1px solid #EDEFF1' }}>
                  {/* ROW */}
                  <div
                    onClick={() => toggle(o.id)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: GRID,
                      columnGap: GRID_GAP,
                      alignItems: 'center',
                      padding: '13px 18px',
                      cursor: 'pointer',
                      background: isOpen ? '#FAFBFB' : 'transparent',
                      borderLeft: `3px solid ${sm.dot}`,
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLElement).style.background = '#FAFBFB';
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLElement).style.background = isOpen
                        ? '#FAFBFB'
                        : 'transparent';
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '11px',
                        color: '#8A99A3',
                        transition: 'transform 0.12s',
                        transform: `rotate(${isOpen ? 90 : 0}deg)`,
                      }}
                    >
                      ▸
                    </span>
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
                      style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {o.customer}
                      </span>
                      <span
                        style={{
                          flex: 'none',
                          fontSize: '9px',
                          fontWeight: 700,
                          color: '#5A6670',
                          border: '1px solid #D6DCE0',
                          borderRadius: '2px',
                          padding: '1px 5px',
                        }}
                      >
                        {TIER_LABEL[o.tier]}
                      </span>
                    </span>
                    <span style={{ minWidth: 0, display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {o.lines.slice(0, 2).map((l, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#2D5365',
                            background: '#EEF3F6',
                            border: '1px solid #C5D8E2',
                            borderRadius: '3px',
                            padding: '2px 7px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {l.species} · {l.lb} lb
                        </span>
                      ))}
                      {o.lines.length > 2 && (
                        <span style={{ fontSize: '11px', color: '#8A99A3', alignSelf: 'center' }}>
                          +{o.lines.length - 2} more
                        </span>
                      )}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '13px',
                        fontWeight: 600,
                        textAlign: 'right',
                      }}
                    >
                      {orderLb(o).toFixed(1)}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '13px',
                        fontWeight: 600,
                        textAlign: 'right',
                      }}
                    >
                      {money(orderValue(o))}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '12px',
                        color: '#5A6670',
                      }}
                    >
                      {fmtDate(o.shipDate)}
                    </span>
                    <span onClick={(e) => e.stopPropagation()}>
                      {isUnassigned(o.location) ? (
                        <button
                          onClick={() => setAssignFor(o)}
                          style={{
                            fontFamily: "'Archivo', sans-serif",
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#8A5A14',
                            background: '#F4EEE2',
                            border: '1px solid #E4D2A8',
                            borderRadius: '4px',
                            padding: '4px 9px',
                            cursor: 'pointer',
                          }}
                        >
                          Assign
                        </button>
                      ) : isDirect(o.location) ? (
                        <span
                          title="Direct shipment — bypasses the warehouse"
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#5A3E6B',
                            background: '#F0ECF6',
                            border: '1px solid #D9CEE6',
                            borderRadius: '3px',
                            padding: '2px 7px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {o.location} · Direct
                        </span>
                      ) : (
                        <span
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '12px',
                            color: '#5A6670',
                          }}
                        >
                          {o.location}
                        </span>
                      )}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>{o.enteredBy}</span>
                      <span
                        style={{
                          display: 'block',
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '10px',
                          color: '#8A99A3',
                          marginTop: '2px',
                        }}
                      >
                        {fmtDate(o.date)} · {o.time}
                      </span>
                    </span>
                    <span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: sm.color,
                          background: sm.bg,
                          borderRadius: '3px',
                          padding: '3px 9px',
                        }}
                      >
                        <span
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            background: sm.dot,
                          }}
                        />
                        {sm.label}
                      </span>
                    </span>
                  </div>

                  {/* EXPANDED DETAIL — species lines + carrier */}
                  {isOpen && (
                    <div style={{ padding: '4px 18px 16px 54px', background: '#FAFBFB' }}>
                      <div
                        style={{
                          background: '#fff',
                          border: '1px solid #E2E6E9',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          maxWidth: '680px',
                        }}
                      >
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 80px 100px 110px',
                            columnGap: '12px',
                            padding: '8px 14px',
                            background: '#FAFBFB',
                            borderBottom: '1px solid #E2E6E9',
                            fontSize: '9px',
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            color: '#8A99A3',
                          }}
                        >
                          <span>SPECIES · GRADE</span>
                          <span style={{ textAlign: 'right' }}>LB</span>
                          <span style={{ textAlign: 'right' }}>$/LB</span>
                          <span style={{ textAlign: 'right' }}>SUBTOTAL</span>
                        </div>
                        {o.lines.map((l, i) => (
                          <div
                            key={i}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 80px 100px 110px',
                              columnGap: '12px',
                              alignItems: 'center',
                              padding: '9px 14px',
                              borderBottom: '1px solid #EDEFF1',
                            }}
                          >
                            <span style={{ fontSize: '13px', fontWeight: 500 }}>
                              {l.species}
                              <span style={{ fontSize: '10px', color: '#8A99A3' }}>
                                {' '}
                                · {l.grade}
                              </span>
                            </span>
                            <span
                              style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: '12px',
                                textAlign: 'right',
                              }}
                            >
                              {l.lb}
                            </span>
                            <span
                              style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: '12px',
                                color: '#5A6670',
                                textAlign: 'right',
                              }}
                            >
                              {money(l.price)}
                            </span>
                            <span
                              style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: '12px',
                                fontWeight: 600,
                                textAlign: 'right',
                              }}
                            >
                              {money(l.lb * l.price)}
                            </span>
                          </div>
                        ))}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 110px',
                            columnGap: '12px',
                            alignItems: 'center',
                            padding: '9px 14px',
                            background: '#FAFBFB',
                          }}
                        >
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#5A6670' }}>
                            {o.lines.length} {o.lines.length === 1 ? 'species' : 'species'} ·{' '}
                            {o.carrier} · entered {fmtDate(o.date)} {o.time} by {o.enteredBy}
                          </span>
                          <span
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '13px',
                              fontWeight: 700,
                              textAlign: 'right',
                            }}
                          >
                            {money(orderValue(o))}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div
                style={{
                  padding: '28px 18px',
                  textAlign: 'center',
                  fontSize: '13px',
                  color: '#8A99A3',
                }}
              >
                {loading
                  ? 'Loading orders…'
                  : rows.length === 0
                    ? 'No orders yet. Create one in Order Intake and it appears here.'
                    : 'No orders in this range. Widen the date filter or clear the search.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ASSIGN WAREHOUSE / DIRECT-SHIPMENT MODAL */}
      {assignFor && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(34,42,48,0.40)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
          }}
          onClick={() => setAssignFor(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '10px',
              padding: '26px',
              width: '420px',
              maxWidth: '94vw',
              boxShadow: '0 16px 48px rgba(34,42,48,0.22)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              Route order {assignFor.code}
            </div>
            <div style={{ fontSize: '13px', color: '#5A6670', margin: '4px 0 18px' }}>
              {assignFor.customer} · assign a warehouse to send it to the allocation board, or mark
              it a direct shipment.
            </div>

            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: '#8A99A3',
                marginBottom: '8px',
              }}
            >
              WAREHOUSE
            </div>
            <div style={{ display: 'flex', gap: '9px', marginBottom: '18px' }}>
              {WAREHOUSE_OPTS.map((w) => (
                <button
                  key={w}
                  disabled={savingAssign}
                  onClick={() => assignLocation(assignFor.id, w)}
                  style={{
                    flex: 1,
                    fontFamily: "'Archivo', sans-serif",
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#2D5365',
                    background: '#EEF3F6',
                    border: '1.5px solid #C5D8E2',
                    borderRadius: '7px',
                    padding: '14px',
                    cursor: savingAssign ? 'not-allowed' : 'pointer',
                  }}
                >
                  {w}
                </button>
              ))}
            </div>

            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: '#8A99A3',
                marginBottom: '8px',
              }}
            >
              DIRECT SHIPMENT · BYPASSES THE WAREHOUSE
            </div>
            <div style={{ display: 'flex', gap: '9px' }}>
              {DIRECT_OPTS.map((d) => (
                <button
                  key={d}
                  disabled={savingAssign}
                  onClick={() => assignLocation(assignFor.id, d)}
                  style={{
                    flex: 1,
                    fontFamily: "'Archivo', sans-serif",
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#5A3E6B',
                    background: '#F0ECF6',
                    border: '1.5px solid #D9CEE6',
                    borderRadius: '7px',
                    padding: '12px',
                    cursor: savingAssign ? 'not-allowed' : 'pointer',
                  }}
                >
                  {d} · Direct
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={() => setAssignFor(null)}
                style={{
                  fontFamily: "'Archivo', sans-serif",
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
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
