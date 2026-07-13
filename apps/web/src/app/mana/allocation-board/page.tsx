'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../components/Nav';
import ConfirmLockModal from '../components/ConfirmLockModal';
import LockedBoardBanner from '../components/LockedBoardBanner';
import SplitBoxModal from '../components/SplitBoxModal';
import { fetchOrderFulfillment, fetchOrderLines, fetchLots } from '@/lib/data/queries';

interface OrderLine {
  species: string;
  target: number;
}

interface Order {
  id: string;
  customer: string;
  code: string;
  tier: string;
  carrier: string;
  color: string;
  lines: OrderLine[];
}

// A box can hold multiple species — each portion is its own assignable content line.
interface Content {
  id: string;
  species: string;
  grade: string;
  weight: number;
  assignedTo: string | null;
  splitGroup?: string;
  part?: 'A' | 'B';
}

interface Box {
  id: string;
  n: string;
  idx: number;
  contents: Content[];
}

interface Lot {
  id: string;
  lot: string;
  vendor: string;
  boxes: Box[];
}

const colors = {
  steel: '#3F6F86',
  verm: '#C2453A',
  amber: '#B7791F',
  sage: '#3F7D5B',
  slate: '#5B6670',
  violet: '#7B6A91',
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const ORDER_PALETTE = [
  colors.steel,
  colors.sage,
  colors.amber,
  colors.slate,
  colors.violet,
  colors.verm,
];
const tierLabel = (t: string | null) =>
  t === 'T1' ? 'Tier 1' : t === 'T2' ? 'Tier 2' : t === 'T3' ? 'Tier 3' : t || '—';

export default function AllocationBoardPage() {
  const router = useRouter();
  const [location, setLocation] = useState<'SFO' | 'LAX'>('SFO');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [splitTarget, setSplitTarget] = useState<{
    lotId: string;
    boxId: string;
    content: Content;
  } | null>(null);
  const [splitSeq, setSplitSeq] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [lockedAt, setLockedAt] = useState<string>('');
  const [lockedBy, setLockedBy] = useState<string>('');
  const [dragged, setDragged] = useState<{ lotId: string; boxId: string; content: Content } | null>(
    null
  );
  const [dragOverOrderId, setDragOverOrderId] = useState<string | null>(null);

  // Orders load live from Supabase (created in Order Intake / Order Inbox).
  // Each order carries multiple species lines, each with its own target.
  useEffect(() => {
    (async () => {
      setOrdersLoading(true);
      const [{ data: heads }, { data: lineRows }] = await Promise.all([
        fetchOrderFulfillment(location),
        fetchOrderLines(),
      ]);

      // group lines by order_id
      const linesByOrder: Record<string, OrderLine[]> = {};
      (lineRows ?? []).forEach((r) => {
        const row = r as { order_id: string; species: string; target_weight: number | null };
        (linesByOrder[row.order_id] ??= []).push({
          species: row.species,
          target: Number(row.target_weight ?? 0),
        });
      });

      const built: Order[] = (heads ?? [])
        .map((h) => {
          const head = h as {
            id: string;
            customer: string | null;
            code: string;
            tier: string | null;
            carrier: string | null;
            color: string | null;
            status: string;
          };
          return { head, lines: linesByOrder[head.id] ?? [] };
        })
        // only orders still being allocated — hide shipped/invoiced
        .filter(({ head }) => head.status !== 'shipped' && head.status !== 'invoiced')
        .map(({ head }, i) => ({
          id: head.id,
          customer: head.customer ?? '—',
          code: head.code,
          tier: tierLabel(head.tier),
          carrier: head.carrier ?? '—',
          color: head.color || ORDER_PALETTE[i % ORDER_PALETTE.length],
          lines: linesByOrder[head.id] ?? [],
        }));

      setOrders(built);
      setSelectedOrderId((prev) =>
        built.some((o) => o.id === prev) ? prev : (built[0]?.id ?? null)
      );
      setOrdersLoading(false);
    })();
  }, [location]);

  // Lots contain boxes; boxes contain mixed-species contents. Inventory loads
  // live from Supabase (materialized when staff accept a vendor packing list on
  // the Documents inbox), filtered to the current warehouse location.
  const [lots, setLots] = useState<Lot[]>([]);
  const [lotsLoading, setLotsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLotsLoading(true);
      const { data } = await fetchLots(location);
      const mapped: Lot[] = (data ?? []).map((lt) => ({
        id: lt.id,
        lot: lt.lot_code,
        vendor: lt.vendors?.name ?? '—',
        boxes: [...lt.boxes]
          .sort((a, b) => (a.idx ?? 0) - (b.idx ?? 0))
          .map((b, bi) => ({
            id: b.id,
            n: b.label,
            idx: b.idx ?? bi + 1,
            // Assignments are held in-session for now (not yet persisted), so
            // every content line starts unassigned on load.
            contents: b.box_contents.map((c) => ({
              id: c.id,
              species: c.species,
              grade: c.grade ?? '',
              weight: Number(c.weight) || 0,
              assignedTo: null,
              splitGroup: c.split_group ?? undefined,
              part: (c.part as 'A' | 'B' | undefined) ?? undefined,
            })),
          })),
      }));
      setLots(mapped);
      setLotsLoading(false);
    })();
  }, [location]);

  const getOrder = (id: string | null) => orders.find((o) => o.id === id) || null;
  const getOrderColor = (id: string | null) => getOrder(id)?.color || '#CCCCCC';
  const getOrderCode = (id: string | null) => getOrder(id)?.code || '';
  const selectedOrder = getOrder(selectedOrderId);

  // Fulfilled weight for a specific order + species, derived live from content assignments.
  const fulfilled = (orderId: string, species: string) => {
    let s = 0;
    lots.forEach((l) =>
      l.boxes.forEach((b) =>
        b.contents.forEach((c) => {
          if (c.assignedTo === orderId && c.species === species) s += c.weight;
        })
      )
    );
    return round1(s);
  };

  const orderIsFull = (o: Order) => o.lines.every((ln) => fulfilled(o.id, ln.species) >= ln.target);

  // Assign / unassign a content portion
  const assignContent = (
    lotId: string,
    boxId: string,
    contentId: string,
    orderId: string | null
  ) => {
    if (isLocked) return;
    setLots((prev) =>
      prev.map((lot) =>
        lot.id !== lotId
          ? lot
          : {
              ...lot,
              boxes: lot.boxes.map((b) =>
                b.id !== boxId
                  ? b
                  : {
                      ...b,
                      contents: b.contents.map((c) =>
                        c.id !== contentId ? c : { ...c, assignedTo: orderId }
                      ),
                    }
              ),
            }
      )
    );
  };

  // Click a portion: assign to the selected order if that order has a line for this species.
  const handleContentClick = (lotId: string, boxId: string, c: Content) => {
    if (isLocked || !selectedOrder) return;
    const orderTakesSpecies = selectedOrder.lines.some((ln) => ln.species === c.species);
    if (!orderTakesSpecies) return;
    assignContent(lotId, boxId, c.id, c.assignedTo === selectedOrderId ? null : selectedOrderId);
  };

  // An order can accept a dragged portion only if it has a line for that species
  const orderAccepts = (o: Order, c: Content | undefined) =>
    !!c && o.lines.some((ln) => ln.species === c.species);

  // Drop a dragged portion onto an order card
  const handleDropOnOrder = (o: Order) => {
    if (isLocked || !dragged || !orderAccepts(o, dragged.content)) {
      setDragged(null);
      setDragOverOrderId(null);
      return;
    }
    assignContent(dragged.lotId, dragged.boxId, dragged.content.id, o.id);
    setDragged(null);
    setDragOverOrderId(null);
  };

  // Split a portion into two by weight, each independently assignable
  const confirmSplit = (weightA: number, orderA: string | null, orderB: string | null) => {
    if (!splitTarget) return;
    const { lotId, boxId, content } = splitTarget;
    const wA = round1(Math.min(Math.max(weightA, 0.1), content.weight - 0.1));
    const wB = round1(content.weight - wA);
    const group = `sg${splitSeq + 1}`;
    setSplitSeq((s) => s + 1);
    setLots((prev) =>
      prev.map((lot) => {
        if (lot.id !== lotId) return lot;
        return {
          ...lot,
          boxes: lot.boxes.map((b) => {
            if (b.id !== boxId) return b;
            const newContents: Content[] = [];
            b.contents.forEach((c) => {
              if (c.id !== content.id) {
                newContents.push(c);
                return;
              }
              newContents.push({
                ...c,
                id: `${c.id}-a${group}`,
                weight: wA,
                assignedTo: orderA,
                splitGroup: group,
                part: 'A',
              });
              newContents.push({
                ...c,
                id: `${c.id}-b${group}`,
                weight: wB,
                assignedTo: orderB,
                splitGroup: group,
                part: 'B',
              });
            });
            return { ...b, contents: newContents };
          }),
        };
      })
    );
    setSplitTarget(null);
  };

  // Merge a split portion back into one
  const mergeSplit = (lotId: string, boxId: string, group: string) => {
    if (isLocked) return;
    setLots((prev) =>
      prev.map((lot) => {
        if (lot.id !== lotId) return lot;
        return {
          ...lot,
          boxes: lot.boxes.map((b) => {
            if (b.id !== boxId) return b;
            const pieces = b.contents.filter((c) => c.splitGroup === group);
            if (pieces.length === 0) return b;
            const total = round1(pieces.reduce((s, c) => s + c.weight, 0));
            const first = pieces[0];
            const merged: Content = {
              id: first.id.replace(/-[ab]sg\d+$/, ''),
              species: first.species,
              grade: first.grade,
              weight: total,
              assignedTo: null,
            };
            const newContents: Content[] = [];
            let inserted = false;
            b.contents.forEach((c) => {
              if (c.splitGroup === group) {
                if (!inserted) {
                  newContents.push(merged);
                  inserted = true;
                }
              } else {
                newContents.push(c);
              }
            });
            return { ...b, contents: newContents };
          }),
        };
      })
    );
  };

  const iconBtnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    padding: 0,
    border: '1px solid #D6DCE0',
    borderRadius: '4px',
    background: '#fff',
    color: '#5A6670',
    cursor: 'pointer',
    flex: 'none',
  };

  // Board-wide tallies
  const allContents = lots.flatMap((l) => l.boxes.flatMap((b) => b.contents));
  const assignedCount = allContents.filter((c) => c.assignedTo).length;
  const totalWeight = round1(allContents.reduce((a, c) => a + c.weight, 0));
  const totalBoxes = lots.reduce((a, l) => a + l.boxes.length, 0);
  const allocatedCustomers = new Set(
    allContents.filter((c) => c.assignedTo).map((c) => c.assignedTo)
  ).size;

  const handleLockClick = () => {
    if (assignedCount === 0) {
      alert('Cannot lock: nothing allocated yet. Assign inventory to orders first.');
      return;
    }
    setLockModalOpen(true);
  };

  const handleConfirmLock = async () => {
    setIsLocking(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    const now = new Date();
    const timeStr = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Los_Angeles',
    });
    setIsLocked(true);
    setLockedAt(timeStr);
    setLockedBy('user@mana.local');
    setLockModalOpen(false);
    setIsLocking(false);
    setTimeout(() => router.push('/mana/pick-slips'), 1000);
  };

  const handleUnlock = () => {
    if (confirm('Unlock the allocation board? You will be able to edit assignments again.')) {
      setIsLocked(false);
      setLockedAt('');
      setLockedBy('');
    }
  };

  const rgba = (hex: string, a: number) =>
    `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;

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
        {isLocked && (
          <div
            style={{
              flexBasis: 'auto',
              padding: '12px 20px',
              background: '#FAFBFB',
              borderBottom: '1px solid #E2E6E9',
            }}
          >
            <LockedBoardBanner
              lockedAt={lockedAt}
              lockedBy={lockedBy}
              onUnlock={handleUnlock}
              showUnlockButton
            />
          </div>
        )}

        {/* TOP BAR */}
        <header
          style={{
            flexBasis: '58px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            padding: '0 20px',
            borderBottom: '1px solid #E2E6E9',
            background: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <span
              style={{
                fontSize: '15px',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
              }}
            >
              Allocation Board
            </span>
            <span style={{ width: '1px', height: '16px', background: '#E2E6E9' }}></span>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                color: '#8A99A3',
                whiteSpace: 'nowrap',
              }}
            >
              Mon · Jun 23 · 06:14 PT
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexBasis: 'auto' }}>
            <span style={{ width: '1px', height: '20px', background: '#E2E6E9' }}></span>
            <button
              onClick={handleLockClick}
              disabled={isLocked}
              style={{
                fontFamily: "'Archivo', sans-serif",
                fontSize: '13px',
                fontWeight: 600,
                background: isLocked ? '#8A99A3' : '#222A30',
                color: '#fff',
                border: 'none',
                borderRadius: '3px',
                padding: '8px 16px',
                cursor: isLocked ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                opacity: isLocked ? 0.6 : 1,
                transition: 'all 0.15s',
              }}
            >
              {isLocked ? '✓ Locked' : 'Lock allocation'}
            </button>
          </div>
        </header>

        {/* SUB BAR */}
        <div
          style={{
            flexBasis: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '0 20px',
            borderBottom: '1px solid #E2E6E9',
            background: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {['SFO', 'LAX'].map((loc) => (
              <button
                key={loc}
                onClick={() => setLocation(loc as 'SFO' | 'LAX')}
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: location === loc ? '#fff' : '#8A99A3',
                  background: location === loc ? '#3F6F86' : 'none',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '5px 12px',
                  cursor: 'pointer',
                }}
              >
                {loc}
              </button>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '18px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '11px',
              color: '#8A99A3',
            }}
          >
            <span>{totalBoxes} boxes</span>
            <span style={{ width: '1px', height: '14px', background: '#E2E6E9' }}></span>
            <span>{totalWeight.toFixed(1)} lb</span>
            <span style={{ width: '1px', height: '14px', background: '#E2E6E9' }}></span>
            <span style={{ color: '#3F7D5B' }}>● live · synced 2s ago</span>
          </div>
        </div>

        {/* WORKSPACE */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
          {/* ORDERS COLUMN */}
          <div
            style={{
              width: '392px',
              flexBasis: 'auto',
              display: 'flex',
              flexDirection: 'column',
              borderRight: '1px solid #E2E6E9',
              background: '#FFFFFF',
              minHeight: 0,
            }}
          >
            <div
              style={{
                flexBasis: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '13px 18px',
                borderBottom: '1px solid #E2E6E9',
              }}
            >
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '11px',
                  letterSpacing: '0.14em',
                  color: '#5A6670',
                  fontWeight: 500,
                }}
              >
                OPEN ORDERS
              </span>
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '11px',
                  color: '#8A99A3',
                }}
              >
                {orders.length}
              </span>
            </div>
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                background: '#F4F5F6',
              }}
            >
              {ordersLoading && (
                <div style={{ padding: '18px 4px', fontSize: '13px', color: '#8A99A3' }}>
                  Loading orders…
                </div>
              )}
              {!ordersLoading && orders.length === 0 && (
                <div
                  style={{
                    border: '1.5px dashed #D6DCE0',
                    borderRadius: '8px',
                    padding: '22px 16px',
                    textAlign: 'center',
                    fontSize: '13px',
                    color: '#8A99A3',
                    background: '#fff',
                    lineHeight: 1.5,
                  }}
                >
                  No open orders in {location}.
                  <br />
                  Create one in <strong>Order Intake</strong> and it appears here.
                </div>
              )}
              {orders.map((o) => {
                const selected = selectedOrderId === o.id;
                const full = orderIsFull(o);
                return (
                  <div
                    key={o.id}
                    onClick={() => setSelectedOrderId(o.id)}
                    onDragOver={(e) => {
                      if (dragged && !isLocked && orderAccepts(o, dragged.content)) {
                        e.preventDefault();
                        if (dragOverOrderId !== o.id) setDragOverOrderId(o.id);
                      }
                    }}
                    onDragLeave={() => setDragOverOrderId((p) => (p === o.id ? null : p))}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropOnOrder(o);
                    }}
                    style={{
                      background:
                        dragOverOrderId === o.id ? '#EEF3F6' : selected ? '#fff' : '#F4F5F6',
                      border:
                        dragOverOrderId === o.id
                          ? `2px dashed ${o.color}`
                          : selected
                            ? `2px solid ${o.color}`
                            : '1px solid #D6DCE0',
                      borderRadius: '6px',
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      opacity: dragged && !orderAccepts(o, dragged.content) ? 0.45 : 1,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '10px',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '1px',
                              background: o.color,
                            }}
                          ></span>
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: 600,
                              letterSpacing: '-0.01em',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {o.customer}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#8A99A3', marginTop: '5px' }}>
                          {o.tier} · {o.lines.length} {o.lines.length === 1 ? 'species' : 'species'}
                        </div>
                      </div>
                      {full ? (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#2E6347',
                            background: '#EAF1ED',
                            borderRadius: '3px',
                            padding: '4px 8px',
                          }}
                        >
                          ✓ Full
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: o.color,
                            background: rgba(o.color, 0.1),
                            borderRadius: '3px',
                            padding: '4px 8px',
                          }}
                        >
                          {o.lines.filter((ln) => fulfilled(o.id, ln.species) >= ln.target).length}/
                          {o.lines.length} lines
                        </span>
                      )}
                    </div>

                    {/* Per-species fulfillment */}
                    <div
                      style={{
                        marginTop: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      {o.lines.map((ln) => {
                        const f = fulfilled(o.id, ln.species);
                        const pct = Math.min(100, (f / ln.target) * 100);
                        const done = f >= ln.target;
                        return (
                          <div key={ln.species}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'baseline',
                                justifyContent: 'space-between',
                                marginBottom: '5px',
                              }}
                            >
                              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                                {ln.species}
                              </span>
                              <span
                                style={{
                                  fontFamily: "'IBM Plex Mono', monospace",
                                  fontSize: '12px',
                                  fontWeight: 500,
                                }}
                              >
                                {f} / {ln.target}
                                <span
                                  style={{
                                    fontSize: '10px',
                                    color: done ? '#3F7D5B' : '#8A99A3',
                                    marginLeft: '7px',
                                  }}
                                >
                                  {done ? '✓' : `${round1(ln.target - f)} short`}
                                </span>
                              </span>
                            </div>
                            <div
                              style={{
                                height: '6px',
                                background: '#EDEFF1',
                                borderRadius: '2px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${pct}%`,
                                  height: '100%',
                                  background: done ? '#3F7D5B' : o.color,
                                }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* INVENTORY COLUMN */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              minHeight: 0,
              background: '#F4F5F6',
            }}
          >
            <div
              style={{
                flexBasis: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '13px 22px',
                borderBottom: '1px solid #E2E6E9',
                background: '#FFFFFF',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '11px',
                    letterSpacing: '0.14em',
                    color: '#5A6670',
                    fontWeight: 500,
                  }}
                >
                  AVAILABLE INVENTORY
                </span>
                {selectedOrder && (
                  <span style={{ fontSize: '12px', color: '#8A99A3' }}>
                    — click or drag a matching-species portion onto{' '}
                    <span style={{ color: selectedOrder.color, fontWeight: 600 }}>
                      {selectedOrder.code}
                    </span>{' '}
                    ({selectedOrder.lines.map((l) => l.species).join(', ')})
                  </span>
                )}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
              {lotsLoading ? (
                <div style={{ fontSize: '13px', color: '#8A99A3', padding: '8px 2px' }}>
                  Loading inventory…
                </div>
              ) : lots.length === 0 ? (
                <div
                  style={{
                    border: '1px dashed #D6DCE0',
                    borderRadius: '8px',
                    padding: '28px',
                    textAlign: 'center',
                    fontSize: '13px',
                    color: '#8A99A3',
                    lineHeight: 1.6,
                  }}
                >
                  No inventory at {location} yet.
                  <br />
                  Accept a vendor packing list on the Documents inbox to receive boxes here.
                </div>
              ) : null}
              {lots.map((lot) => {
                const speciesInLot = Array.from(
                  new Set(lot.boxes.flatMap((b) => b.contents.map((c) => c.species)))
                );
                return (
                  <div key={lot.id} style={{ marginBottom: '24px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        paddingBottom: '9px',
                        marginBottom: '13px',
                        borderBottom: '1px solid #E2E6E9',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '13px',
                          fontWeight: 600,
                        }}
                      >
                        {lot.lot}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>
                        {speciesInLot.length > 1
                          ? `Mixed · ${speciesInLot.length} species`
                          : speciesInLot[0]}
                      </span>
                      {speciesInLot.length > 1 && (
                        <span style={{ fontSize: '11px', color: '#8A99A3' }}>
                          {speciesInLot.join(' · ')}
                        </span>
                      )}
                      <span style={{ fontSize: '12px', color: '#8A99A3', marginLeft: 'auto' }}>
                        {lot.vendor}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(228px, 1fr))',
                        gap: '10px',
                      }}
                    >
                      {lot.boxes.map((box) => {
                        const boxWeight = round1(box.contents.reduce((a, c) => a + c.weight, 0));
                        const mixed = new Set(box.contents.map((c) => c.species)).size > 1;
                        return (
                          <div
                            key={box.id}
                            style={{
                              background: '#fff',
                              border: '1px solid #D6DCE0',
                              borderRadius: '6px',
                              padding: '11px',
                              opacity: isLocked ? 0.75 : 1,
                            }}
                          >
                            {/* box header */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '9px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                <span
                                  style={{
                                    fontFamily: "'IBM Plex Mono', monospace",
                                    fontSize: '13px',
                                    fontWeight: 600,
                                  }}
                                >
                                  {box.n}
                                </span>
                                {mixed && (
                                  <span
                                    style={{
                                      fontSize: '9px',
                                      fontWeight: 700,
                                      letterSpacing: '0.04em',
                                      color: '#8A5A14',
                                      background: '#F4EEE2',
                                      border: '1px solid #E4D2A8',
                                      borderRadius: '2px',
                                      padding: '1px 6px',
                                    }}
                                  >
                                    MIXED
                                  </span>
                                )}
                              </div>
                              <span
                                style={{
                                  fontFamily: "'IBM Plex Mono', monospace",
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  color: '#5A6670',
                                }}
                              >
                                {boxWeight} lb
                              </span>
                            </div>

                            {/* content portions */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {box.contents.map((c) => {
                                const assigned = !!c.assignedTo;
                                const canAssign =
                                  !isLocked &&
                                  selectedOrder &&
                                  selectedOrder.lines.some((ln) => ln.species === c.species);
                                const clr = assigned ? getOrderColor(c.assignedTo) : '#D6DCE0';
                                return (
                                  <div
                                    key={c.id}
                                    draggable={!isLocked}
                                    onDragStart={() => {
                                      if (!isLocked)
                                        setDragged({ lotId: lot.id, boxId: box.id, content: c });
                                    }}
                                    onDragEnd={() => {
                                      setDragged(null);
                                      setDragOverOrderId(null);
                                    }}
                                    onClick={() => handleContentClick(lot.id, box.id, c)}
                                    title={
                                      isLocked
                                        ? 'Board is locked'
                                        : !selectedOrder
                                          ? 'Select an order first'
                                          : canAssign
                                            ? assigned && c.assignedTo === selectedOrderId
                                              ? 'Click to unassign'
                                              : `Click to assign to ${selectedOrder.code}`
                                            : `${selectedOrder.code} has no ${c.species} line`
                                    }
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      background: assigned ? rgba(clr, 0.08) : '#F8F9FA',
                                      border: '1px solid #E2E6E9',
                                      borderLeft: `3px solid ${clr}`,
                                      borderRadius: '4px',
                                      padding: '7px 9px',
                                      cursor: isLocked
                                        ? 'not-allowed'
                                        : canAssign
                                          ? 'pointer'
                                          : 'default',
                                      opacity:
                                        !isLocked && selectedOrder && !canAssign && !assigned
                                          ? 0.55
                                          : 1,
                                    }}
                                  >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                          }}
                                        >
                                          {c.species}
                                        </span>
                                        <span
                                          style={{
                                            fontSize: '9px',
                                            fontWeight: 700,
                                            color: '#5A6670',
                                            border: '1px solid #D6DCE0',
                                            borderRadius: '2px',
                                            padding: '0 4px',
                                          }}
                                        >
                                          {c.grade}
                                        </span>
                                        {c.splitGroup && (
                                          <span
                                            style={{
                                              fontSize: '9px',
                                              fontWeight: 700,
                                              color: '#8A5A14',
                                              background: '#F4EEE2',
                                              border: '1px solid #E4D2A8',
                                              borderRadius: '2px',
                                              padding: '0 4px',
                                            }}
                                          >
                                            {c.part}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <span
                                      style={{
                                        fontFamily: "'IBM Plex Mono', monospace",
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        flex: 'none',
                                      }}
                                    >
                                      {c.weight}
                                      <span
                                        style={{
                                          fontSize: '10px',
                                          color: '#8A99A3',
                                          fontWeight: 500,
                                        }}
                                      >
                                        {' '}
                                        lb
                                      </span>
                                    </span>
                                    {assigned && (
                                      <span
                                        style={{
                                          fontSize: '9px',
                                          fontWeight: 700,
                                          color: '#fff',
                                          background: clr,
                                          borderRadius: '2px',
                                          padding: '2px 6px',
                                          flex: 'none',
                                        }}
                                      >
                                        {getOrderCode(c.assignedTo)}
                                      </span>
                                    )}
                                    {!isLocked &&
                                      (c.splitGroup ? (
                                        <button
                                          title="Merge split"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            mergeSplit(lot.id, box.id, c.splitGroup!);
                                          }}
                                          style={iconBtnStyle}
                                        >
                                          <svg
                                            width="12"
                                            height="12"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          >
                                            <polyline points="9 7 4 12 9 17" />
                                            <polyline points="15 7 20 12 15 17" />
                                          </svg>
                                        </button>
                                      ) : (
                                        <button
                                          title="Split this portion by weight"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSplitTarget({
                                              lotId: lot.id,
                                              boxId: box.id,
                                              content: c,
                                            });
                                          }}
                                          style={iconBtnStyle}
                                        >
                                          <svg
                                            width="12"
                                            height="12"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          >
                                            <circle cx="6" cy="6" r="3" />
                                            <circle cx="6" cy="18" r="3" />
                                            <line x1="20" y1="4" x2="8.12" y2="15.88" />
                                            <line x1="14.47" y1="14.48" x2="20" y2="20" />
                                            <line x1="8.12" y1="8.12" x2="12" y2="12" />
                                          </svg>
                                        </button>
                                      ))}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <ConfirmLockModal
        isOpen={lockModalOpen}
        allocationCount={assignedCount}
        totalWeight={totalWeight}
        orderCount={allocatedCustomers}
        onConfirm={handleConfirmLock}
        onCancel={() => setLockModalOpen(false)}
        isLoading={isLocking}
      />

      <SplitBoxModal
        isOpen={!!splitTarget}
        boxLabel={splitTarget ? `${splitTarget.content.species} in this box` : ''}
        totalWeight={splitTarget?.content.weight || 0}
        orders={orders
          .filter(
            (o) => !splitTarget || o.lines.some((ln) => ln.species === splitTarget.content.species)
          )
          .map((o) => ({ id: o.id, code: o.code, customer: o.customer, color: o.color }))}
        defaultOrderA={selectedOrderId}
        onConfirm={confirmSplit}
        onCancel={() => setSplitTarget(null)}
      />
    </div>
  );
}
