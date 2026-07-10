'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../components/Nav';
import { fetchCustomers, fetchSkus, fetchPricingTiers } from '@/lib/data/queries';
import { createCustomer, createOrder } from '@/lib/data/mutations';

type Tier = 'T1' | 'T2' | 'T3';

interface CustomerRec {
  id: string;
  tier: Tier;
  carrier: string;
  terms: string;
  location: string;
  overrides: Record<string, number>; // species -> override price
}

// Warehouses fish ship out of, and the shipment options for an order.
const WAREHOUSES = ['SFO', 'LAX'];
const CARRIERS = [
  'Air Cargo',
  'Ground',
  'Main Freight',
  'Gold Coast 3PL',
  'Island Air Cargo',
  'Will Call',
  'Customer pickup',
];

interface SkuRec {
  code: string;
  species: string;
  grade: string | null;
  basePrice: number;
}

// A line targets a specific SKU (species + grade), not just a species — the
// same species at two grades is two separate lines (schema fix C2).
interface LineItem {
  id: number;
  code: string;
  qty: number;
}

// Board swimlane palette — a created order picks the next colour.
const ORDER_COLORS = ['#3F6F86', '#3F7D5B', '#B7791F', '#5B6670', '#7B6A91', '#C2453A'];

export default function OrderIntakePage() {
  const router = useRouter();

  // Live reference data (from Supabase)
  const [customerMap, setCustomerMap] = useState<Record<string, CustomerRec>>({});
  const [skuMap, setSkuMap] = useState<Record<string, SkuRec>>({});
  const [tierMult, setTierMult] = useState<Record<string, { label: string; mult: number }>>({
    T1: { label: 'Tier 1', mult: 0.95 },
    T2: { label: 'Tier 2', mult: 1.0 },
    T3: { label: 'Tier 3', mult: 1.08 },
  });

  const [customerQuery, setCustomerQuery] = useState('');
  const [customer, setCustomer] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<Tier>('T2');
  const [warehouse, setWarehouse] = useState('SFO');
  const [carrier, setCarrier] = useState('Air Cargo');
  const [lines, setLines] = useState<LineItem[]>([]);
  const [seq, setSeq] = useState(1);
  const [shipDate, setShipDate] = useState('');
  const [today, setToday] = useState('');
  const [tomorrow, setTomorrow] = useState('');
  const [created, setCreated] = useState(false);
  const [createdTime, setCreatedTime] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [t0, setT0] = useState(Date.now());

  // Load customers, SKUs, and pricing tiers from Supabase on mount.
  useEffect(() => {
    (async () => {
      const [{ data: custs }, { data: skus }, { data: tiers }] = await Promise.all([
        fetchCustomers(),
        fetchSkus(),
        fetchPricingTiers(),
      ]);

      // Key by SKU code so every grade of a species is orderable (not just the
      // first). e.g. AHI-A+ and AHI-A are both selectable, each priced on its own.
      const sMap: Record<string, SkuRec> = {};
      (skus ?? []).forEach((s) => {
        if (!s.active) return;
        sMap[s.code] = {
          code: s.code,
          species: s.species,
          grade: s.grade,
          basePrice: Number(s.base_price_lb ?? 0),
        };
      });
      setSkuMap(sMap);

      if (tiers && tiers.length > 0) {
        const tMap: Record<string, { label: string; mult: number }> = {};
        tiers.forEach((t) => {
          tMap[t.tier] = { label: t.label, mult: Number(t.base_multiplier) };
        });
        setTierMult(tMap);
      }

      // fetchCustomers selects nested price_overrides; the return type is the base
      // row, so read the join through this local shape.
      type CustRow = {
        id: string;
        name: string;
        tier: string | null;
        default_carrier: string | null;
        terms: string | null;
        location: string | null;
        price_overrides?: { species: string | null; sku: string; price: number }[];
      };
      const cMap: Record<string, CustomerRec> = {};
      ((custs ?? []) as unknown as CustRow[]).forEach((c) => {
        // Overrides are keyed by SKU code (species + grade), matching a line.
        const overrides: Record<string, number> = {};
        (c.price_overrides ?? []).forEach((o) => {
          if (o.sku) overrides[o.sku] = Number(o.price);
        });
        cMap[c.name] = {
          id: c.id,
          tier: (c.tier as Tier) ?? 'T2',
          carrier: c.default_carrier ?? '—',
          terms: c.terms ?? '—',
          location: c.location ?? 'SFO',
          overrides,
        };
      });
      setCustomerMap(cMap);
    })();
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      if (!created) {
        setElapsed(Math.floor((Date.now() - t0) / 1000));
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [created, t0]);

  // Seed ship-date defaults from the real calendar (on mount, to avoid SSR mismatch)
  useEffect(() => {
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const now = new Date();
    const tmr = new Date();
    tmr.setDate(now.getDate() + 1);
    setToday(iso(now));
    setTomorrow(iso(tmr));
    setShipDate(iso(now));
  }, []);

  const onCustomerInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    const exact = Object.keys(customerMap).find((n) => n.toLowerCase() === q.toLowerCase());
    setCustomerQuery(q);
    const resolved = exact || (customer && q === customer ? customer : null);
    setCustomer(resolved);
    // Existing customer -> snap tier/warehouse/carrier to theirs; new name -> keep choices.
    if (resolved && customerMap[resolved]) applyCustomerDefaults(customerMap[resolved]);
  };

  const applyCustomerDefaults = (rec: CustomerRec) => {
    setSelectedTier(rec.tier);
    if (rec.location && WAREHOUSES.includes(rec.location)) setWarehouse(rec.location);
    if (rec.carrier && rec.carrier !== '—') setCarrier(rec.carrier);
  };

  const pickCustomer = (name: string) => {
    setCustomer(name);
    setCustomerQuery(name);
    if (customerMap[name]) applyCustomerDefaults(customerMap[name]);
  };

  // --- Multi-line handling (one line per SKU = species + grade) ---
  const toggleSku = (code: string) => {
    setLines((prev) => {
      const exists = prev.find((l) => l.code === code);
      if (exists) return prev.filter((l) => l.code !== code);
      const next = [...prev, { id: seq, code, qty: 50 }];
      setSeq((n) => n + 1);
      return next;
    });
  };

  const removeLine = (id: number) => setLines((prev) => prev.filter((l) => l.id !== id));

  const setLineQty = (id: number, v: number) =>
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, qty: Math.max(0, Math.round(v)) } : l))
    );

  const adjustLineQty = (id: number, delta: number) =>
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, qty: Math.max(0, Math.round(l.qty + delta)) } : l))
    );

  const reset = () => {
    setT0(Date.now());
    setCustomerQuery('');
    setCustomer(null);
    setSelectedTier('T2');
    setWarehouse('SFO');
    setCarrier('Air Cargo');
    setLines([]);
    setShipDate(today);
    setCreated(false);
    setCreatedCode(null);
    setCreateError('');
    setElapsed(0);
  };

  const money = (n: number) =>
    '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatShip = (iso: string) => {
    if (!iso) return { label: '—', sub: '', full: '—' };
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const md = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    let label = dt.toLocaleDateString('en-US', { weekday: 'short' });
    if (iso === today) label = 'Today';
    else if (iso === tomorrow) label = 'Tomorrow';
    return { label, sub: md, full: `${label} · ${md}` };
  };

  const typedName = customerQuery.trim();
  const isNewCustomer = !customer && typedName.length > 0;
  const hasSelection = !!customer || isNewCustomer;
  const hasLines = lines.length > 0 && lines.some((l) => l.qty > 0);
  const canCreate = hasSelection && hasLines;
  const customerName = customer || typedName;
  const cust = customer ? (customerMap[customer] ?? null) : null;
  const hasCustomer = !!cust;
  // The order's tier is chosen in the UI (defaults to the customer's tier).
  const tierMeta = tierMult[selectedTier] ?? tierMult.T2;
  const mult = tierMeta.mult;

  // Priced lines: customer override (by SKU) wins, else SKU base × tier multiplier
  const pricedLines = lines.map((l) => {
    const sku = skuMap[l.code];
    const base = sku?.basePrice || 0;
    const override = cust ? cust.overrides[l.code] : undefined;
    const price = override ?? base * mult;
    return {
      ...l,
      species: sku?.species ?? '—',
      grade: sku?.grade ?? null,
      price,
      subtotal: price * l.qty,
      skuCode: l.code,
      hasOverride: override !== undefined,
    };
  });
  const grandTotal = pricedLines.reduce((a, l) => a + l.subtotal, 0);
  const totalLb = lines.reduce((a, l) => a + l.qty, 0);

  // Persist the order to Supabase, then it appears on the Allocation Board.
  const handleCreateOrder = async () => {
    if (!canCreate || saving) return;
    setSaving(true);
    setCreateError('');

    // Resolve (or create) the customer — new ones take the chosen tier,
    // warehouse (location), and shipment carrier.
    let customerId = cust?.id ?? null;
    if (!customerId) {
      const { data: newCust, error: custErr } = await createCustomer(customerName.trim(), {
        tier: selectedTier,
        location: warehouse,
        default_carrier: carrier,
      });
      if (custErr || !newCust) {
        setSaving(false);
        setCreateError(custErr?.message || 'Could not create the customer.');
        return;
      }
      customerId = newCust.id;
      // reflect the new customer locally so its defaults show immediately
      setCustomerMap((m) => ({
        ...m,
        [customerName.trim()]: {
          id: newCust.id,
          tier: selectedTier,
          carrier,
          terms: '—',
          location: warehouse,
          overrides: {},
        },
      }));
    }

    // Generate a short, unique order code from the customer name.
    const initials =
      customerName
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 4) || 'ORD';
    const code = `${initials}-${Date.now().toString(36).slice(-5).toUpperCase()}`;

    const colorIdx = Object.keys(customerMap).indexOf(customerName);
    const color = ORDER_COLORS[(colorIdx >= 0 ? colorIdx : lines.length) % ORDER_COLORS.length];

    const { error: orderErr } = await createOrder(
      {
        customer_id: customerId,
        code,
        carrier: carrier || null,
        ship_date: shipDate || null,
        location: warehouse,
        color,
      },
      pricedLines
        .filter((l) => l.qty > 0)
        .map((l) => ({
          species: l.species,
          grade: l.grade,
          target_weight: l.qty,
          unit_price: Math.round(l.price * 100) / 100,
        }))
    );

    setSaving(false);
    if (orderErr) {
      setCreateError(orderErr.message || 'Could not create the order.');
      return;
    }

    const mm = Math.floor(elapsed / 60);
    const ss = elapsed % 60;
    setCreatedTime(`${mm}:${String(ss).padStart(2, '0')}`);
    setCreatedCode(code);
    setCreated(true);
  };

  const customerChips = Object.keys(customerMap)
    .slice(0, 5)
    .map((n) => ({
      name: n,
      onClick: () => pickCustomer(n),
      style: (customer === n
        ? {
            fontFamily: "'Archivo',sans-serif",
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '6px',
            padding: '8px 15px',
            cursor: 'pointer',
            border: '1px solid #3F6F86',
            background: '#3F6F86',
            color: '#fff',
          }
        : {
            fontFamily: "'Archivo',sans-serif",
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '6px',
            padding: '8px 15px',
            cursor: 'pointer',
            border: '1px solid #D6DCE0',
            background: '#fff',
            color: '#5A6670',
          }) as React.CSSProperties,
    }));

  const overTarget = elapsed > 30 && !created;
  const mm = Math.floor(elapsed / 60);
  const ss = elapsed % 60;

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
        {/* header */}
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
              Order Intake
            </span>
            <span style={{ fontSize: '12px', color: '#8A99A3' }}>New phone order</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                borderRadius: '20px',
                padding: '5px 12px',
                ...(overTarget
                  ? { background: '#F4EEE2', color: '#8A5A14', border: '1px solid #E4D2A8' }
                  : { background: '#EAF1ED', color: '#2E6347', border: '1px solid #BFD8C9' }),
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="13" r="8" />
                <line x1="12" y1="13" x2="12" y2="9" />
                <line x1="9" y1="2" x2="15" y2="2" />
              </svg>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
                {mm}:{String(ss).padStart(2, '0')}
              </span>
            </div>
            <span style={{ fontSize: '12px', color: '#8A99A3' }}>Target · under 0:30</span>
          </div>
        </header>

        <div className="mana-scroll" style={{ flex: 1, overflowY: 'auto' }}>
          <div
            style={{
              display: 'flex',
              gap: '28px',
              maxWidth: '1080px',
              margin: '0 auto',
              padding: '28px',
              alignItems: 'flex-start',
            }}
          >
            {/* ENTRY */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '22px',
              }}
            >
              {/* customer */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '9px',
                  }}
                >
                  <label
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: '#5A6670',
                    }}
                  >
                    CUSTOMER
                  </label>
                  <span style={{ fontSize: '11px', color: '#8A99A3' }}>Recent</span>
                </div>
                <input
                  value={customerQuery}
                  onChange={onCustomerInput}
                  placeholder="Type a customer name…"
                  style={{
                    width: '100%',
                    fontFamily: "'Archivo', sans-serif",
                    fontSize: '17px',
                    fontWeight: 500,
                    padding: '14px 16px',
                    border: '1.5px solid #C2CAD0',
                    borderRadius: '6px',
                    outline: 'none',
                    background: '#fff',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3F6F86';
                    e.target.style.boxShadow = '0 0 0 3px rgba(63,111,134,0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#C2CAD0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                  {customerChips.map((c, i) => (
                    <button key={i} onClick={c.onClick} style={c.style}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* auto-filled defaults */}
              {hasCustomer && (
                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                    padding: '14px 16px',
                    background: '#EEF3F6',
                    border: '1px solid #BBD0DB',
                    borderRadius: '6px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        color: '#5A7A8A',
                      }}
                    >
                      PRICING TIER
                    </div>
                    <div
                      style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        marginTop: '4px',
                        color: '#2D5365',
                      }}
                    >
                      {tierMeta.label} · {mult.toFixed(2)}×
                    </div>
                  </div>
                  <div style={{ width: '1px', background: '#BBD0DB' }}></div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        color: '#5A7A8A',
                      }}
                    >
                      DEFAULT CARRIER
                    </div>
                    <div
                      style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        marginTop: '4px',
                        color: '#2D5365',
                      }}
                    >
                      {cust?.carrier}
                    </div>
                  </div>
                  <div style={{ width: '1px', background: '#BBD0DB' }}></div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        color: '#5A7A8A',
                      }}
                    >
                      TERMS
                    </div>
                    <div
                      style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        marginTop: '4px',
                        color: '#2D5365',
                      }}
                    >
                      {cust?.terms}
                    </div>
                  </div>
                  <span
                    style={{
                      alignSelf: 'center',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: '#3F6F86',
                      background: '#fff',
                      border: '1px solid #BBD0DB',
                      borderRadius: '3px',
                      padding: '3px 8px',
                    }}
                  >
                    AUTO-FILLED
                  </span>
                </div>
              )}

              {/* new customer note */}
              {isNewCustomer && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    background: '#F4EEE2',
                    border: '1px solid #E4D2A8',
                    borderRadius: '6px',
                  }}
                >
                  <span
                    style={{
                      flex: 'none',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: '#8A5A14',
                      background: '#fff',
                      border: '1px solid #E4D2A8',
                      borderRadius: '3px',
                      padding: '3px 8px',
                    }}
                  >
                    NEW
                  </span>
                  <span style={{ fontSize: '13px', color: '#8A5A14', lineHeight: 1.4 }}>
                    New customer — will be created on this order with the tier you pick below. Add
                    their carrier &amp; terms later in Customers.
                  </span>
                </div>
              )}

              {/* pricing tier — sets this order's pricing (and a new customer's tier) */}
              {hasSelection && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '9px',
                    }}
                  >
                    <label
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        color: '#5A6670',
                      }}
                    >
                      PRICING TIER
                    </label>
                    <span style={{ fontSize: '11px', color: '#8A99A3' }}>
                      {isNewCustomer
                        ? 'sets the new customer’s tier'
                        : 'defaults to this customer’s tier'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '9px' }}>
                    {(['T1', 'T2', 'T3'] as Tier[]).map((t) => {
                      const on = selectedTier === t;
                      const meta = tierMult[t];
                      return (
                        <button
                          key={t}
                          onClick={() => setSelectedTier(t)}
                          style={{
                            flex: 1,
                            textAlign: 'left',
                            borderRadius: '6px',
                            padding: '11px 14px',
                            cursor: 'pointer',
                            fontFamily: "'Archivo', sans-serif",
                            border: on ? '1.5px solid #3F6F86' : '1.5px solid #D6DCE0',
                            background: on ? '#EEF3F6' : '#fff',
                            color: on ? '#2D5365' : '#5A6670',
                          }}
                        >
                          <div style={{ fontSize: '14px', fontWeight: 700 }}>
                            {meta?.label ?? t}
                          </div>
                          <div
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '11px',
                              color: on ? '#3F6F86' : '#8A99A3',
                              marginTop: '2px',
                            }}
                          >
                            {(meta?.mult ?? 1).toFixed(2)}×
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* warehouse + shipment — where it ships from and how it goes */}
              {hasSelection && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '9px',
                      }}
                    >
                      <label
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          color: '#5A6670',
                        }}
                      >
                        WAREHOUSE
                      </label>
                      <span style={{ fontSize: '11px', color: '#8A99A3' }}>ships from</span>
                    </div>
                    <div style={{ display: 'flex', gap: '9px' }}>
                      {WAREHOUSES.map((w) => {
                        const on = warehouse === w;
                        return (
                          <button
                            key={w}
                            onClick={() => setWarehouse(w)}
                            style={{
                              flex: 1,
                              borderRadius: '6px',
                              padding: '11px 14px',
                              cursor: 'pointer',
                              fontFamily: "'Archivo', sans-serif",
                              fontSize: '14px',
                              fontWeight: 700,
                              border: on ? '1.5px solid #3F6F86' : '1.5px solid #D6DCE0',
                              background: on ? '#EEF3F6' : '#fff',
                              color: on ? '#2D5365' : '#5A6670',
                            }}
                          >
                            {w}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '9px',
                      }}
                    >
                      <label
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          color: '#5A6670',
                        }}
                      >
                        SHIPMENT
                      </label>
                      <span style={{ fontSize: '11px', color: '#8A99A3' }}>carrier / method</span>
                    </div>
                    <select
                      value={carrier}
                      onChange={(e) => setCarrier(e.target.value)}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        fontFamily: "'Archivo', sans-serif",
                        fontSize: '14px',
                        fontWeight: 500,
                        padding: '12px 14px',
                        border: '1.5px solid #C2CAD0',
                        borderRadius: '6px',
                        outline: 'none',
                        background: '#fff',
                        color: '#222A30',
                        cursor: 'pointer',
                      }}
                    >
                      {/* include the customer's saved carrier even if it's not in the standard list */}
                      {(CARRIERS.includes(carrier) ? CARRIERS : [carrier, ...CARRIERS]).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* species — tap to add/remove lines */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '9px',
                  }}
                >
                  <label
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: '#5A6670',
                    }}
                  >
                    SPECIES &amp; GRADE
                  </label>
                  <span style={{ fontSize: '11px', color: '#8A99A3' }}>
                    Tap to add · same species at two grades = two lines
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '9px' }}>
                  {Object.values(skuMap).map((sku) => {
                    const on = lines.some((l) => l.code === sku.code);
                    return (
                      <button
                        key={sku.code}
                        onClick={() => toggleSku(sku.code)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '7px',
                          fontFamily: "'Archivo',sans-serif",
                          fontSize: '14px',
                          fontWeight: 600,
                          borderRadius: '6px',
                          padding: '11px 16px',
                          cursor: 'pointer',
                          border: on ? '1.5px solid #3F6F86' : '1.5px solid #D6DCE0',
                          background: on ? '#EEF3F6' : '#fff',
                          color: on ? '#2D5365' : '#5A6670',
                        }}
                      >
                        <span
                          style={{
                            width: '15px',
                            height: '15px',
                            borderRadius: '4px',
                            flex: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: on ? 'none' : '1.5px solid #C2CAD0',
                            background: on ? '#3F6F86' : '#fff',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          {on ? '✓' : '+'}
                        </span>
                        {sku.species}
                        {sku.grade && (
                          <span
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '10px',
                              fontWeight: 700,
                              color: on ? '#3F6F86' : '#8A99A3',
                              background: on ? '#fff' : '#F4F5F6',
                              border: `1px solid ${on ? '#BBD0DB' : '#E2E6E9'}`,
                              borderRadius: '3px',
                              padding: '1px 5px',
                            }}
                          >
                            {sku.grade}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* line items — independent quantities */}
              <div>
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: '#5A6670',
                    display: 'block',
                    marginBottom: '9px',
                  }}
                >
                  LINE ITEMS &amp; QUANTITIES
                </label>
                {lines.length === 0 ? (
                  <div
                    style={{
                      border: '1.5px dashed #D6DCE0',
                      borderRadius: '8px',
                      padding: '24px',
                      textAlign: 'center',
                      fontSize: '13px',
                      color: '#8A99A3',
                      background: '#fff',
                    }}
                  >
                    Tap a species &amp; grade above to add it to this order.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {pricedLines.map((l) => (
                      <div
                        key={l.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          background: '#fff',
                          border: '1px solid #E2E6E9',
                          borderRadius: '8px',
                          padding: '13px 14px',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <span style={{ fontSize: '15px', fontWeight: 700 }}>{l.species}</span>
                            {l.grade && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  color: '#2D5365',
                                  background: '#EEF3F6',
                                  border: '1px solid #BBD0DB',
                                  borderRadius: '2px',
                                  padding: '1px 6px',
                                }}
                              >
                                {l.grade}
                              </span>
                            )}
                            <span
                              style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: '9px',
                                fontWeight: 600,
                                color: '#8A99A3',
                                border: '1px solid #E2E6E9',
                                borderRadius: '2px',
                                padding: '1px 5px',
                              }}
                            >
                              {l.skuCode}
                            </span>
                            {l.hasOverride && (
                              <span
                                style={{
                                  fontSize: '9px',
                                  fontWeight: 700,
                                  letterSpacing: '0.04em',
                                  color: '#2D5365',
                                  background: '#EEF3F6',
                                  border: '1px solid #BBD0DB',
                                  borderRadius: '2px',
                                  padding: '1px 6px',
                                }}
                              >
                                OVERRIDE
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#8A99A3', marginTop: '2px' }}>
                            @ {money(l.price)}/lb
                            {l.hasOverride
                              ? ' (customer price)'
                              : ` (base × ${mult.toFixed(2)})`} · {money(l.subtotal)}
                          </div>
                        </div>
                        {/* compact stepper */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flex: 'none',
                          }}
                        >
                          <button
                            onClick={() => adjustLineQty(l.id, -5)}
                            style={{
                              width: '34px',
                              height: '38px',
                              fontSize: '20px',
                              fontWeight: 500,
                              background: '#fff',
                              border: '1.5px solid #C2CAD0',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              color: '#222A30',
                            }}
                          >
                            –
                          </button>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'baseline',
                              gap: '4px',
                              width: '86px',
                              justifyContent: 'center',
                              border: '1.5px solid #C2CAD0',
                              borderRadius: '6px',
                              padding: '7px 6px',
                            }}
                          >
                            <input
                              value={l.qty}
                              onChange={(e) =>
                                setLineQty(
                                  l.id,
                                  parseInt(e.target.value.replace(/\D/g, '') || '0', 10)
                                )
                              }
                              style={{
                                width: '48px',
                                border: 'none',
                                outline: 'none',
                                textAlign: 'right',
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: '20px',
                                fontWeight: 600,
                                color: '#222A30',
                                background: 'transparent',
                                padding: 0,
                              }}
                            />
                            <span style={{ fontSize: '12px', color: '#8A99A3' }}>lb</span>
                          </div>
                          <button
                            onClick={() => adjustLineQty(l.id, 5)}
                            style={{
                              width: '34px',
                              height: '38px',
                              fontSize: '20px',
                              fontWeight: 500,
                              background: '#fff',
                              border: '1.5px solid #C2CAD0',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              color: '#222A30',
                            }}
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => removeLine(l.id)}
                          title="Remove"
                          style={{
                            flex: 'none',
                            width: '30px',
                            height: '30px',
                            borderRadius: '6px',
                            border: '1px solid #E2E6E9',
                            background: '#fff',
                            color: '#8A99A3',
                            cursor: 'pointer',
                            fontSize: '16px',
                            lineHeight: 1,
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {/* running total */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        padding: '10px 14px',
                        background: '#F4F5F6',
                        border: '1px solid #E2E6E9',
                        borderRadius: '8px',
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#5A6670' }}>
                        {lines.length} {lines.length === 1 ? 'line' : 'lines'} · {totalLb} lb total
                      </span>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '16px',
                          fontWeight: 700,
                        }}
                      >
                        {money(grandTotal)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* ship date */}
              <div>
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: '#5A6670',
                    display: 'block',
                    marginBottom: '9px',
                  }}
                >
                  SHIP DATE
                </label>
                <div style={{ display: 'flex', gap: '9px', alignItems: 'stretch' }}>
                  {[
                    { label: 'Today', value: today },
                    { label: 'Tomorrow', value: tomorrow },
                  ].map((q) => {
                    const on = !!q.value && shipDate === q.value;
                    return (
                      <button
                        key={q.label}
                        onClick={() => setShipDate(q.value)}
                        style={{
                          textAlign: 'center',
                          borderRadius: '6px',
                          padding: '11px 16px',
                          cursor: 'pointer',
                          fontFamily: "'Archivo', sans-serif",
                          fontSize: '14px',
                          fontWeight: 600,
                          border: on ? '1.5px solid #3F6F86' : '1.5px solid #D6DCE0',
                          background: on ? '#EEF3F6' : '#fff',
                          color: on ? '#2D5365' : '#5A6670',
                        }}
                      >
                        {q.label}
                      </button>
                    );
                  })}
                  <input
                    type="date"
                    value={shipDate}
                    min={today}
                    onChange={(e) => setShipDate(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '14px',
                      fontWeight: 500,
                      padding: '11px 14px',
                      border: '1.5px solid #C2CAD0',
                      borderRadius: '6px',
                      outline: 'none',
                      background: '#fff',
                      color: '#222A30',
                      cursor: 'pointer',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3F6F86';
                      e.target.style.boxShadow = '0 0 0 3px rgba(63,111,134,0.12)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#C2CAD0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                <div style={{ fontSize: '11px', color: '#8A99A3', marginTop: '8px' }}>
                  {shipDate ? `Shipping ${formatShip(shipDate).full}` : 'Pick a ship date'}
                </div>
              </div>
            </div>

            {/* LIVE TICKET */}
            <div style={{ width: '336px', flex: 'none', position: 'sticky', top: 0 }}>
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #E2E6E9',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 14px rgba(34,42,48,0.06)',
                }}
              >
                <div
                  style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid #E2E6E9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '11px',
                      letterSpacing: '0.12em',
                      color: '#5A6670',
                    }}
                  >
                    ORDER TICKET
                  </span>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '11px',
                      color: '#8A99A3',
                    }}
                  >
                    {createdCode || 'NEW'}
                  </span>
                </div>
                <div style={{ padding: '18px' }}>
                  <div
                    style={{
                      fontSize: '19px',
                      fontWeight: 700,
                      letterSpacing: '-0.01em',
                      ...(customerName ? {} : { color: '#B6BEC4' }),
                    }}
                  >
                    {customerName || 'Select customer'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#8A99A3', marginTop: '3px' }}>
                    {cust
                      ? `${tierMeta.label} · ${cust.terms}`
                      : isNewCustomer
                        ? 'New customer · standard pricing'
                        : 'Tier & carrier auto-fill on select'}
                  </div>

                  <div
                    style={{
                      marginTop: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    {/* line items */}
                    {pricedLines.length === 0 ? (
                      <div
                        style={{
                          fontSize: '13px',
                          color: '#B6BEC4',
                          paddingBottom: '11px',
                          borderBottom: '1px solid #EDEFF1',
                        }}
                      >
                        No species added yet
                      </div>
                    ) : (
                      pricedLines.map((l) => (
                        <div
                          key={l.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            borderBottom: '1px solid #EDEFF1',
                            paddingBottom: '10px',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600 }}>
                              {l.species}
                              {l.grade ? ` · ${l.grade}` : ''}
                            </div>
                            <div
                              style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: '11px',
                                color: '#8A99A3',
                                marginTop: '2px',
                              }}
                            >
                              {l.qty} lb @ {money(l.price)}
                            </div>
                          </div>
                          <span
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '14px',
                              fontWeight: 600,
                            }}
                          >
                            {money(l.subtotal)}
                          </span>
                        </div>
                      ))
                    )}

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        borderBottom: '1px solid #EDEFF1',
                        paddingBottom: '11px',
                      }}
                    >
                      <span style={{ fontSize: '13px', color: '#5A6670' }}>Ship date</span>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>
                        {formatShip(shipDate).full}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        borderBottom: '1px solid #EDEFF1',
                        paddingBottom: '11px',
                      }}
                    >
                      <span style={{ fontSize: '13px', color: '#5A6670' }}>Warehouse</span>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>{warehouse}</span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        borderBottom: '1px solid #EDEFF1',
                        paddingBottom: '11px',
                      }}
                    >
                      <span style={{ fontSize: '13px', color: '#5A6670' }}>Shipment</span>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>{carrier || '—'}</span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                      }}
                    >
                      <span style={{ fontSize: '13px', color: '#5A6670' }}>
                        Total · {totalLb} lb
                      </span>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '20px',
                          fontWeight: 600,
                        }}
                      >
                        {money(grandTotal)}
                      </span>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    padding: '0 18px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '9px',
                  }}
                >
                  <button
                    onClick={handleCreateOrder}
                    disabled={!canCreate || saving || created}
                    style={{
                      fontFamily: "'Archivo', sans-serif",
                      fontSize: '15px',
                      fontWeight: 700,
                      border: 'none',
                      borderRadius: '6px',
                      padding: '14px',
                      cursor: canCreate && !saving && !created ? 'pointer' : 'default',
                      ...(canCreate && !created
                        ? { background: '#222A30', color: '#fff' }
                        : { background: '#E2E6E9', color: '#A6AEB4' }),
                    }}
                  >
                    {created
                      ? '✓ Order created'
                      : saving
                        ? 'Creating…'
                        : !hasSelection
                          ? 'Enter a customer name'
                          : !hasLines
                            ? 'Add at least one species'
                            : 'Create order →'}
                  </button>
                  <button
                    onClick={reset}
                    style={{
                      fontFamily: "'Archivo', sans-serif",
                      fontSize: '13px',
                      fontWeight: 600,
                      background: '#fff',
                      color: '#5A6670',
                      border: '1px solid #D6DCE0',
                      borderRadius: '6px',
                      padding: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    Start new order
                  </button>
                </div>
              </div>

              {createError && (
                <div
                  style={{
                    marginTop: '12px',
                    background: '#FBF0EF',
                    border: '1px solid #E3B6B1',
                    borderRadius: '6px',
                    padding: '12px 14px',
                    fontSize: '13px',
                    color: '#A5362C',
                  }}
                >
                  {createError}
                </div>
              )}

              {created && (
                <div
                  style={{
                    marginTop: '12px',
                    background: '#EAF1ED',
                    border: '1px solid #BFD8C9',
                    borderRadius: '6px',
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <span
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: '#3F7D5B',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 'none',
                      }}
                    >
                      ✓
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#2E6347' }}>
                      Order {createdCode} created in {createdTime} — {lines.length}-line order is on
                      the board.
                    </span>
                  </div>
                  <button
                    onClick={() => router.push('/mana/allocation-board')}
                    style={{
                      marginTop: '10px',
                      width: '100%',
                      fontFamily: "'Archivo', sans-serif",
                      fontSize: '13px',
                      fontWeight: 600,
                      background: '#fff',
                      color: '#2E6347',
                      border: '1px solid #BFD8C9',
                      borderRadius: '6px',
                      padding: '10px',
                      cursor: 'pointer',
                    }}
                  >
                    View on Allocation Board →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
