'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../components/Nav';
import ConfirmLockModal from '../components/ConfirmLockModal';
import LockedBoardBanner from '../components/LockedBoardBanner';

interface Order {
  id: string;
  customer: string;
  code: string;
  tier: string;
  carrier: string;
  species: string;
  target: number;
  allocated: number;
  color: string;
}

interface Box {
  id: string;
  n: string;
  idx: number;
  weight: number;
  species: string;
  assignedTo: string | null;
  split: null | { a: number; b: number };
  locked: boolean;
  lockInitial?: string;
}

interface Lot {
  id: string;
  lot: string;
  vendor: string;
  species: string;
  grade: string;
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

export default function AllocationBoardPage() {
  const router = useRouter();
  const [location, setLocation] = useState<'SFO' | 'LAX'>('SFO');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>('o1');
  const [_splitOpen, _setSplitOpen] = useState(false);
  const [_splitBox, _setSplitBox] = useState<{ lot: string; box: Box; wtA: number } | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [lockedAt, setLockedAt] = useState<string>('');
  const [lockedBy, setLockedBy] = useState<string>('');
  const [draggedBox, setDraggedBox] = useState<{ lotId: string; boxId: string } | null>(null);
  const [dragOverOrderId, setDragOverOrderId] = useState<string | null>(null);

  // Sample data
  const ordersBase: Order[] = [
    {
      id: 'o1',
      customer: 'Nobu',
      code: 'NOBU',
      tier: 'Tier 1',
      carrier: 'Air Cargo',
      species: 'Ahi Tuna',
      target: 90,
      allocated: 80,
      color: colors.steel,
    },
    {
      id: 'o2',
      customer: 'Morimoto',
      code: 'MORI',
      tier: 'Tier 1',
      carrier: 'Air Cargo',
      species: 'Salmon',
      target: 60,
      allocated: 31,
      color: colors.sage,
    },
    {
      id: 'o3',
      customer: "Roy's",
      code: 'ROY',
      tier: 'Tier 2',
      carrier: 'Ground',
      species: 'Ono',
      target: 75,
      allocated: 0,
      color: colors.amber,
    },
    {
      id: 'o4',
      customer: "Alan Wong's",
      code: 'WONG',
      tier: 'Tier 2',
      carrier: 'Ground',
      species: 'Ahi Tuna',
      target: 45,
      allocated: 0,
      color: colors.slate,
    },
  ];

  const [lots, setLots] = useState<Lot[]>([
    {
      id: 'lot1',
      lot: 'LOT-2207',
      vendor: 'Kona Fresh Catch',
      species: 'Ahi Tuna',
      grade: 'A+',
      boxes: [
        {
          id: 'b1',
          n: 'B-4471',
          idx: 1,
          weight: 42.6,
          species: 'Ahi Tuna',
          assignedTo: 'o1',
          split: null,
          locked: false,
        },
        {
          id: 'b2',
          n: 'B-4472',
          idx: 2,
          weight: 38.1,
          species: 'Ahi Tuna',
          assignedTo: 'o1',
          split: null,
          locked: false,
        },
        {
          id: 'b3',
          n: 'B-4473',
          idx: 3,
          weight: 40.2,
          species: 'Ahi Tuna',
          assignedTo: null,
          split: null,
          locked: false,
        },
        {
          id: 'b4',
          n: 'B-4474',
          idx: 4,
          weight: 44.0,
          species: 'Ahi Tuna',
          assignedTo: null,
          split: null,
          locked: false,
        },
        {
          id: 'b5',
          n: 'B-4475',
          idx: 5,
          weight: 39.5,
          species: 'Ahi Tuna',
          assignedTo: null,
          split: null,
          locked: false,
        },
        {
          id: 'b6',
          n: 'B-4476',
          idx: 6,
          weight: 41.8,
          species: 'Ahi Tuna',
          assignedTo: null,
          split: null,
          locked: false,
        },
      ],
    },
    {
      id: 'lot2',
      lot: 'LOT-2208',
      vendor: 'Pacific Blue Co.',
      species: 'Salmon',
      grade: 'A',
      boxes: [
        {
          id: 'b7',
          n: 'B-4520',
          idx: 1,
          weight: 31.2,
          species: 'Salmon',
          assignedTo: 'o2',
          split: null,
          locked: false,
        },
        {
          id: 'b8',
          n: 'B-4521',
          idx: 2,
          weight: 33.5,
          species: 'Salmon',
          assignedTo: null,
          split: null,
          locked: false,
        },
        {
          id: 'b9',
          n: 'B-4522',
          idx: 3,
          weight: 29.8,
          species: 'Salmon',
          assignedTo: null,
          split: null,
          locked: false,
        },
      ],
    },
  ]);

  // Allocated weight per order, derived live from box assignments
  const allocatedByOrder: Record<string, number> = {};
  lots.forEach((lot) =>
    lot.boxes.forEach((b) => {
      if (b.assignedTo) {
        allocatedByOrder[b.assignedTo] = (allocatedByOrder[b.assignedTo] || 0) + b.weight;
      }
    })
  );
  const orders: Order[] = ordersBase.map((o) => ({
    ...o,
    allocated: Math.round(allocatedByOrder[o.id] || 0),
  }));

  // Assign / reassign / unassign a box to an order
  const assignBox = (lotId: string, boxId: string, orderId: string | null) => {
    if (isLocked) return;
    setLots((prev) =>
      prev.map((lot) =>
        lot.id !== lotId
          ? lot
          : {
              ...lot,
              boxes: lot.boxes.map((b) => (b.id !== boxId ? b : { ...b, assignedTo: orderId })),
            }
      )
    );
  };

  // Click a box: assign to the selected order, or unassign if already on it
  const handleBoxClick = (lotId: string, box: Box) => {
    if (isLocked || !selectedOrderId) return;
    assignBox(lotId, box.id, box.assignedTo === selectedOrderId ? null : selectedOrderId);
  };

  // Drop a dragged box onto an order card
  const handleDropOnOrder = (orderId: string) => {
    if (isLocked || !draggedBox) return;
    assignBox(draggedBox.lotId, draggedBox.boxId, orderId);
    setDraggedBox(null);
    setDragOverOrderId(null);
  };

  const getOrderColor = (orderId: string | null) =>
    orders.find((o) => o.id === orderId)?.color || '#CCCCCC';
  const getOrderCode = (orderId: string | null) => orders.find((o) => o.id === orderId)?.code || '';

  // Count allocated boxes
  const allocatedBoxes = lots.reduce(
    (sum, lot) => sum + lot.boxes.filter((b) => b.assignedTo).length,
    0
  );
  const totalWeight = lots.reduce((a, l) => a + l.boxes.reduce((b, bx) => b + bx.weight, 0), 0);

  // Get count of unique customers with allocations
  const allocatedCustomers = new Set(
    lots.flatMap((lot) => lot.boxes.filter((b) => b.assignedTo).map((b) => b.assignedTo))
  ).size;

  const handleLockClick = () => {
    if (allocatedBoxes === 0) {
      alert('Cannot lock: No boxes allocated. Please allocate boxes to orders first.');
      return;
    }
    setLockModalOpen(true);
  };

  const handleConfirmLock = async () => {
    setIsLocking(true);

    // Simulate API call
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

    // Navigate to pick slips after brief delay
    setTimeout(() => {
      router.push('/mana/pick-slips');
    }, 1000);
  };

  const handleUnlock = () => {
    const confirmUnlock = confirm(
      'Unlock the allocation board? You will be able to edit assignments again. This should only be done if changes are absolutely necessary.'
    );
    if (confirmUnlock) {
      setIsLocked(false);
      setLockedAt('');
      setLockedBy('');
    }
  };

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
        {/* LOCKED BANNER */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '-8px' }}>
                {orders.slice(0, 3).map((o) => (
                  <span
                    key={o.id}
                    title={o.customer}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: o.color,
                      color: '#fff',
                      fontSize: '9px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: '-8px',
                      border: '2px solid #fff',
                    }}
                  >
                    {o.code[0]}
                  </span>
                ))}
              </div>
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '11px',
                  color: '#8A99A3',
                }}
              >
                3 online
              </span>
            </div>
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
              onMouseEnter={(e) => {
                if (!isLocked) e.currentTarget.style.background = '#000';
              }}
              onMouseLeave={(e) => {
                if (!isLocked) e.currentTarget.style.background = '#222A30';
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
            <span>{lots.reduce((a, l) => a + l.boxes.length, 0)} orders</span>
            <span style={{ width: '1px', height: '14px', background: '#E2E6E9' }}></span>
            <span>
              {lots.reduce((a, l) => a + l.boxes.reduce((b, bx) => b + bx.weight, 0), 0).toFixed(1)}{' '}
              lb
            </span>
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
              {orders.map((o) => {
                const allocPct = (o.allocated / o.target) * 100;
                return (
                  <div
                    key={o.id}
                    onClick={() => setSelectedOrderId(o.id)}
                    onDragOver={(e) => {
                      if (draggedBox && !isLocked) {
                        e.preventDefault();
                        if (dragOverOrderId !== o.id) setDragOverOrderId(o.id);
                      }
                    }}
                    onDragLeave={() => setDragOverOrderId((prev) => (prev === o.id ? null : prev))}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropOnOrder(o.id);
                    }}
                    style={{
                      background:
                        dragOverOrderId === o.id
                          ? 'rgba(' +
                            parseInt(o.color.slice(1, 3), 16) +
                            ',' +
                            parseInt(o.color.slice(3, 5), 16) +
                            ',' +
                            parseInt(o.color.slice(5, 7), 16) +
                            ', 0.08)'
                          : selectedOrderId === o.id
                            ? '#fff'
                            : '#F4F5F6',
                      border:
                        dragOverOrderId === o.id
                          ? `2px dashed ${o.color}`
                          : selectedOrderId === o.id
                            ? `2px solid ${o.color}`
                            : '1px solid #D6DCE0',
                      borderRadius: '6px',
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
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
                          {o.tier} · {o.species}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: o.color,
                          background:
                            'rgba(' +
                            parseInt(o.color.slice(1, 3), 16) +
                            ',' +
                            parseInt(o.color.slice(3, 5), 16) +
                            ',' +
                            parseInt(o.color.slice(5, 7), 16) +
                            ', 0.1)',
                          borderRadius: '3px',
                          padding: '4px 8px',
                        }}
                      >
                        {allocPct.toFixed(0)}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: '7px',
                        background: '#EDEFF1',
                        borderRadius: '2px',
                        overflow: 'hidden',
                        marginTop: '13px',
                      }}
                    >
                      <div
                        style={{ width: `${allocPct}%`, height: '100%', background: o.color }}
                      ></div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        marginTop: '9px',
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '13px',
                        fontWeight: 500,
                      }}
                    >
                      <span>
                        {o.allocated} / {o.target}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: o.allocated >= o.target ? '#3F7D5B' : '#8A99A3',
                        }}
                      >
                        {o.allocated >= o.target ? '✓ Full' : `${o.target - o.allocated} needed`}
                      </span>
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
                {selectedOrderId && (
                  <span style={{ fontSize: '12px', color: '#8A99A3' }}>
                    — click or drag a box to assign to{' '}
                    <span style={{ color: getOrderColor(selectedOrderId), fontWeight: 600 }}>
                      {getOrderCode(selectedOrderId)}
                    </span>
                  </span>
                )}
              </div>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '18px 22px',
              }}
            >
              {lots.map((lot) => (
                <div key={lot.id} style={{ marginBottom: '24px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingBottom: '9px',
                      marginBottom: '13px',
                      borderBottom: '1px solid #E2E6E9',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#222A30',
                        }}
                      >
                        {lot.lot}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{lot.species}</span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#5A6670',
                          border: '1px solid #D6DCE0',
                          borderRadius: '2px',
                          padding: '1px 7px',
                        }}
                      >
                        {lot.grade}
                      </span>
                      <span style={{ fontSize: '12px', color: '#8A99A3' }}>{lot.vendor}</span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                      gap: '9px',
                    }}
                  >
                    {lot.boxes.map((box) => {
                      const boxColor = box.assignedTo ? getOrderColor(box.assignedTo) : '#D6DCE0';
                      const isDragging =
                        draggedBox?.lotId === lot.id && draggedBox?.boxId === box.id;
                      return (
                        <div
                          key={box.id}
                          draggable={!isLocked}
                          onDragStart={() => {
                            if (!isLocked) setDraggedBox({ lotId: lot.id, boxId: box.id });
                          }}
                          onDragEnd={() => {
                            setDraggedBox(null);
                            setDragOverOrderId(null);
                          }}
                          onClick={() => handleBoxClick(lot.id, box)}
                          title={
                            isLocked
                              ? 'Board is locked'
                              : selectedOrderId
                                ? box.assignedTo === selectedOrderId
                                  ? 'Click to unassign · or drag to another order'
                                  : `Click to assign to ${getOrderCode(selectedOrderId)} · or drag to an order`
                                : 'Select an order, then click · or drag this box onto an order'
                          }
                          style={{
                            background: box.assignedTo
                              ? 'rgba(' +
                                parseInt(boxColor.slice(1, 3), 16) +
                                ',' +
                                parseInt(boxColor.slice(3, 5), 16) +
                                ',' +
                                parseInt(boxColor.slice(5, 7), 16) +
                                ', 0.08)'
                              : '#fff',
                            border: box.assignedTo ? '1px solid #BBD0DB' : '1px solid #D6DCE0',
                            borderLeft: `3px solid ${boxColor}`,
                            borderRadius: '5px',
                            padding: '12px',
                            cursor: isLocked ? 'not-allowed' : 'grab',
                            position: 'relative',
                            transition: 'all 0.15s',
                            opacity: isLocked ? 0.7 : isDragging ? 0.4 : 1,
                          }}
                          onMouseOver={(e) => {
                            if (!isLocked && !box.assignedTo)
                              e.currentTarget.style.borderColor = '#BBD0DB';
                          }}
                          onMouseOut={(e) => {
                            if (!isLocked && !box.assignedTo)
                              e.currentTarget.style.borderColor = '#D6DCE0';
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '6px',
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: '13px',
                                fontWeight: 600,
                                color: box.assignedTo ? boxColor : '#222A30',
                              }}
                            >
                              {box.n}
                            </span>
                            {box.assignedTo && (
                              <span
                                style={{
                                  fontSize: '9px',
                                  fontWeight: 700,
                                  color: '#fff',
                                  background: getOrderColor(box.assignedTo),
                                  borderRadius: '2px',
                                  padding: '2px 6px',
                                }}
                              >
                                {getOrderCode(box.assignedTo)}
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'baseline',
                              justifyContent: 'space-between',
                              marginTop: '9px',
                            }}
                          >
                            <span style={{ fontSize: '11px', color: '#8A99A3', fontWeight: 500 }}>
                              #{box.idx}
                            </span>
                            <span
                              style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: '18px',
                                fontWeight: 600,
                              }}
                            >
                              {box.weight}
                              <span style={{ fontSize: '11px', color: '#8A99A3', fontWeight: 500 }}>
                                {' '}
                                lb
                              </span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ConfirmLockModal
        isOpen={lockModalOpen}
        allocationCount={allocatedBoxes}
        totalWeight={totalWeight}
        orderCount={allocatedCustomers}
        onConfirm={handleConfirmLock}
        onCancel={() => setLockModalOpen(false)}
        isLoading={isLocking}
      />
    </div>
  );
}
