'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { createOrder } from '@/lib/data/mutations';
import { loadCatalog, money, type Catalog } from '../portalData';

interface LineItem {
  id: number;
  code: string;
  qty: number;
}

// Shipment methods = the documented freight_mode values (F7).
type Method = 'trucker' | 'air' | 'customer_pickup';
const METHODS: { key: Method; label: string; hint: string }[] = [
  { key: 'trucker', label: 'Truck delivery', hint: 'Delivered by truck to your address' },
  { key: 'air', label: 'Air freight', hint: 'Flown to your address' },
  { key: 'customer_pickup', label: 'Customer pickup', hint: 'You collect from our warehouse' },
];

export default function PortalOrderPage() {
  const [cat, setCat] = useState<Catalog | null>(null);
  const [lines, setLines] = useState<LineItem[]>([]);
  const [seq, setSeq] = useState(1);
  const [shipDate, setShipDate] = useState('');
  const [today, setToday] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [doneCode, setDoneCode] = useState<string | null>(null);

  // Delivery details — prefilled from the account, editable per order.
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [editContact, setEditContact] = useState(false);
  const [address, setAddress] = useState('');
  const [method, setMethod] = useState<Method>('trucker');

  useEffect(() => {
    (async () => {
      const c = await loadCatalog();
      setCat(c);
      // Prefill contact from the account (from signup).
      setContactName(c.customer?.contact || c.customer?.name || '');
      setContactPhone(c.customer?.phone || '');
      // Remember the last-used address/method from their most recent order,
      // else fall back to the address saved on their account.
      const supabase = createClient();
      const { data: last } = await supabase
        .from('orders')
        .select('delivery_address, contact_name, contact_phone, freight_mode')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setAddress(last?.delivery_address || c.customer?.address || '');
      if (last?.contact_name) setContactName(last.contact_name);
      if (last?.contact_phone) setContactPhone(last.contact_phone);
      if (last?.freight_mode) setMethod(last.freight_mode as Method);
    })();
    const d = new Date();
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setToday(iso);
    setShipDate(iso);
  }, []);

  const skuByCode = (code: string) => cat?.skus.find((s) => s.code === code);

  const toggle = (code: string) =>
    setLines((prev) => {
      if (prev.some((l) => l.code === code)) return prev.filter((l) => l.code !== code);
      const next = [...prev, { id: seq, code, qty: 25 }];
      setSeq((n) => n + 1);
      return next;
    });
  const setQty = (id: number, v: number) =>
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, qty: Math.max(0, Math.round(v)) } : l))
    );
  const adjust = (id: number, d: number) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, qty: Math.max(0, l.qty + d) } : l)));

  const priced = lines.map((l) => {
    const s = skuByCode(l.code);
    const price = cat?.priceOf(l.code) ?? 0;
    return {
      ...l,
      species: s?.species ?? '—',
      grade: s?.grade ?? null,
      price,
      subtotal: price * l.qty,
    };
  });
  const totalLb = lines.reduce((a, l) => a + l.qty, 0);
  const total = priced.reduce((a, l) => a + l.subtotal, 0);
  const hasPricing = !!cat?.hasPricing;
  const isPickup = method === 'customer_pickup';
  const methodLabel = METHODS.find((m) => m.key === method)?.label ?? method;
  const addressOk = isPickup || address.trim().length > 0;
  const canSubmit =
    !!cat?.customer &&
    hasPricing &&
    lines.length > 0 &&
    lines.some((l) => l.qty > 0) &&
    contactName.trim().length > 0 &&
    addressOk;

  const submit = async () => {
    if (!canSubmit || !cat?.customer || saving) return;
    setSaving(true);
    setError('');
    const initials =
      cat.customer.name
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 4) || 'ORD';
    const code = `${initials}-${Date.now().toString(36).slice(-5).toUpperCase()}`;

    const { error: err } = await createOrder(
      {
        customer_id: cat.customer.id,
        code,
        // carrier holds the human method label so staff screens stay populated;
        // freight_mode carries the structured value.
        carrier: methodLabel,
        freight_mode: method,
        ship_date: shipDate || null,
        // Warehouse is decided by staff when routing a customer order.
        location: null,
        contact_name: contactName.trim(),
        contact_phone: contactPhone.trim() || null,
        delivery_address: isPickup ? null : address.trim(),
        color: '#5A3E6B',
        source: 'customer',
      },
      priced
        .filter((l) => l.qty > 0)
        .map((l) => ({
          species: l.species,
          grade: l.grade,
          target_weight: l.qty,
          unit_price: Math.round(l.price * 100) / 100,
        }))
    );
    setSaving(false);
    if (err) {
      setError(err.message || 'Could not submit your order.');
      return;
    }
    setDoneCode(code);
  };

  const reset = () => {
    setLines([]);
    setDoneCode(null);
    setError('');
  };

  return (
    <>
      <header
        style={{
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '0 28px',
          height: '58px',
          borderBottom: '1px solid #E2E6E9',
          background: '#FFFFFF',
        }}
      >
        <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
          Place an order
        </span>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        {cat && !hasPricing && !doneCode && (
          <div
            style={{
              maxWidth: '1000px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#F4EEE2',
              border: '1px solid #E4D2A8',
              borderRadius: '8px',
              padding: '14px 16px',
              marginBottom: '22px',
            }}
          >
            <span
              style={{
                flex: 'none',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: '#8A5A14',
                background: '#fff',
                border: '1px solid #E4D2A8',
                borderRadius: '3px',
                padding: '3px 8px',
              }}
            >
              SETUP
            </span>
            <span style={{ fontSize: '13px', color: '#8A5A14', lineHeight: 1.4 }}>
              Prices will be listed shortly. Our team is setting up your account — you&apos;ll be
              able to place orders as soon as your pricing is ready.
            </span>
          </div>
        )}
        {doneCode ? (
          <div style={{ maxWidth: '520px' }}>
            <div
              style={{
                background: '#fff',
                border: '1px solid #E2E6E9',
                borderRadius: '10px',
                padding: '28px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: '#EAF1ED',
                  color: '#2E6347',
                  fontSize: '22px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                }}
              >
                ✓
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>Order {doneCode} received</div>
              <div
                style={{
                  fontSize: '13px',
                  color: '#5A6670',
                  margin: '8px 0 20px',
                  lineHeight: 1.5,
                }}
              >
                Our team will confirm availability and pricing, then prepare your order. You can
                track its status any time under My Orders.
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  onClick={reset}
                  style={{
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
                  Place another
                </button>
                <Link
                  href="/portal/orders"
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    background: '#222A30',
                    color: '#fff',
                    borderRadius: '5px',
                    padding: '10px 18px',
                    textDecoration: 'none',
                  }}
                >
                  View my orders
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{ display: 'flex', gap: '28px', maxWidth: '1000px', alignItems: 'flex-start' }}
          >
            {/* left: pick items */}
            <div style={{ flex: 1, minWidth: 0 }}>
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
                CHOOSE SPECIES &amp; GRADE
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '9px', marginBottom: '24px' }}>
                {!cat ? (
                  <span style={{ fontSize: '13px', color: '#8A99A3' }}>Loading catalog…</span>
                ) : (
                  cat.skus.map((s) => {
                    const on = lines.some((l) => l.code === s.code);
                    return (
                      <button
                        key={s.code}
                        onClick={() => toggle(s.code)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '14px',
                          fontWeight: 600,
                          borderRadius: '6px',
                          padding: '11px 15px',
                          cursor: 'pointer',
                          border: on ? '1.5px solid #3F6F86' : '1.5px solid #D6DCE0',
                          background: on ? '#EEF3F6' : '#fff',
                          color: on ? '#2D5365' : '#5A6670',
                        }}
                      >
                        <span>
                          {s.species}
                          {s.grade ? ` ${s.grade}` : ''}
                        </span>
                        {hasPricing && (
                          <span
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '11px',
                              color: on ? '#3F6F86' : '#8A99A3',
                            }}
                          >
                            {money(cat.priceOf(s.code))}/lb
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

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
                QUANTITIES
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
                  Tap a product above to add it to your order.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {priced.map((l) => (
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
                        <div style={{ fontSize: '15px', fontWeight: 700 }}>
                          {l.species}
                          {l.grade ? ` · ${l.grade}` : ''}
                        </div>
                        <div style={{ fontSize: '11px', color: '#8A99A3', marginTop: '2px' }}>
                          {hasPricing
                            ? `${money(l.price)}/lb · ${money(l.subtotal)}`
                            : 'Price pending'}
                        </div>
                      </div>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 'none' }}
                      >
                        <button onClick={() => adjust(l.id, -5)} style={stepBtn}>
                          –
                        </button>
                        <div style={qtyBox}>
                          <input
                            value={l.qty}
                            onChange={(e) =>
                              setQty(l.id, parseInt(e.target.value.replace(/\D/g, '') || '0', 10))
                            }
                            style={qtyInput}
                          />
                          <span style={{ fontSize: '12px', color: '#8A99A3' }}>lb</span>
                        </div>
                        <button onClick={() => adjust(l.id, 5)} style={stepBtn}>
                          +
                        </button>
                      </div>
                      <button onClick={() => toggle(l.code)} title="Remove" style={removeBtn}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <label
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: '#5A6670',
                  display: 'block',
                  margin: '22px 0 9px',
                }}
              >
                REQUESTED SHIP DATE
              </label>
              <input
                type="date"
                value={shipDate}
                min={today}
                onChange={(e) => setShipDate(e.target.value)}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '14px',
                  padding: '11px 14px',
                  border: '1.5px solid #C2CAD0',
                  borderRadius: '6px',
                  outline: 'none',
                  background: '#fff',
                  color: '#222A30',
                }}
              />

              {/* delivery contact — prefilled from the account, editable */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  margin: '22px 0 9px',
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
                  DELIVERY CONTACT
                </label>
                <button
                  onClick={() => setEditContact((v) => !v)}
                  style={{
                    fontFamily: "'Archivo', sans-serif",
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#3F6F86',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {editContact ? 'Done' : 'Change'}
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input
                  value={contactName}
                  disabled={!editContact}
                  placeholder="Contact name"
                  onChange={(e) => setContactName(e.target.value)}
                  style={{
                    fontFamily: "'Archivo', sans-serif",
                    fontSize: '14px',
                    padding: '11px 14px',
                    border: '1.5px solid #C2CAD0',
                    borderRadius: '6px',
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                    background: editContact ? '#fff' : '#F4F5F6',
                    color: editContact ? '#222A30' : '#5A6670',
                  }}
                />
                <input
                  value={contactPhone}
                  disabled={!editContact}
                  placeholder="Phone"
                  onChange={(e) => setContactPhone(e.target.value)}
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '14px',
                    padding: '11px 14px',
                    border: '1.5px solid #C2CAD0',
                    borderRadius: '6px',
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                    background: editContact ? '#fff' : '#F4F5F6',
                    color: editContact ? '#222A30' : '#5A6670',
                  }}
                />
              </div>
              <div style={{ fontSize: '11px', color: '#8A99A3', marginTop: '8px' }}>
                From your account — tap Change to use different details for this order.
              </div>

              {/* shipment method (freight mode) */}
              <label
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: '#5A6670',
                  display: 'block',
                  margin: '22px 0 9px',
                }}
              >
                SHIPMENT METHOD
              </label>
              <div style={{ display: 'flex', gap: '9px', flexWrap: 'wrap' }}>
                {METHODS.map((m) => {
                  const on = method === m.key;
                  return (
                    <button
                      key={m.key}
                      onClick={() => setMethod(m.key)}
                      title={m.hint}
                      style={{
                        borderRadius: '6px',
                        padding: '11px 16px',
                        cursor: 'pointer',
                        fontFamily: "'Archivo', sans-serif",
                        fontSize: '14px',
                        fontWeight: 700,
                        border: on ? '1.5px solid #3F6F86' : '1.5px solid #D6DCE0',
                        background: on ? '#EEF3F6' : '#fff',
                        color: on ? '#2D5365' : '#5A6670',
                      }}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>

              {/* delivery address — not needed for pickup */}
              {isPickup ? (
                <div
                  style={{
                    margin: '18px 0 0',
                    fontSize: '13px',
                    color: '#2D5365',
                    background: '#EEF3F6',
                    border: '1px solid #C5D8E2',
                    borderRadius: '6px',
                    padding: '12px 14px',
                    lineHeight: 1.5,
                  }}
                >
                  You&apos;ll collect this order from our warehouse. Our team will confirm the
                  pickup location and time.
                </div>
              ) : (
                <>
                  <label
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: '#5A6670',
                      display: 'block',
                      margin: '22px 0 9px',
                    }}
                  >
                    DELIVERY ADDRESS
                  </label>
                  <textarea
                    value={address}
                    placeholder="Street, city, state, ZIP"
                    onChange={(e) => setAddress(e.target.value)}
                    style={{
                      fontFamily: "'Archivo', sans-serif",
                      fontSize: '14px',
                      padding: '11px 14px',
                      border: '1.5px solid #C2CAD0',
                      borderRadius: '6px',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box',
                      minHeight: '68px',
                      resize: 'vertical',
                      background: '#fff',
                      color: '#222A30',
                    }}
                  />
                </>
              )}
            </div>

            {/* right: summary */}
            <div style={{ width: '320px', flex: 'none', position: 'sticky', top: 0 }}>
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #E2E6E9',
                  borderRadius: '8px',
                  padding: '18px',
                }}
              >
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '11px',
                    letterSpacing: '0.12em',
                    color: '#5A6670',
                    marginBottom: '14px',
                  }}
                >
                  ORDER SUMMARY
                </div>
                {priced.length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#B6BEC4' }}>No items yet</div>
                ) : (
                  priced.map((l) => (
                    <div
                      key={l.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '13px',
                        padding: '7px 0',
                        borderBottom: '1px solid #EDEFF1',
                      }}
                    >
                      <span>
                        {l.species}
                        {l.grade ? ` ${l.grade}` : ''} · {l.qty} lb
                      </span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
                        {hasPricing ? money(l.subtotal) : '—'}
                      </span>
                    </div>
                  ))
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginTop: '14px',
                  }}
                >
                  <span style={{ fontSize: '13px', color: '#5A6670' }}>Total · {totalLb} lb</span>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '20px',
                      fontWeight: 700,
                    }}
                  >
                    {hasPricing ? money(total) : '—'}
                  </span>
                </div>
                {error && (
                  <div
                    style={{
                      marginTop: '14px',
                      background: '#FBF0EF',
                      border: '1px solid #E3B6B1',
                      borderRadius: '5px',
                      padding: '9px 12px',
                      fontSize: '12px',
                      color: '#A5362C',
                    }}
                  >
                    {error}
                  </div>
                )}
                <button
                  onClick={submit}
                  disabled={!canSubmit || saving}
                  style={{
                    width: '100%',
                    marginTop: '16px',
                    fontFamily: "'Archivo', sans-serif",
                    fontSize: '15px',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '6px',
                    padding: '13px',
                    cursor: !canSubmit || saving ? 'default' : 'pointer',
                    background: !canSubmit || saving ? '#E2E6E9' : '#222A30',
                    color: !canSubmit || saving ? '#A6AEB4' : '#fff',
                  }}
                >
                  {saving ? 'Submitting…' : 'Submit order'}
                </button>
                <div
                  style={{ fontSize: '11px', color: '#8A99A3', marginTop: '10px', lineHeight: 1.4 }}
                >
                  Your order is sent to our team to confirm availability and final pricing before it
                  ships.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const stepBtn: React.CSSProperties = {
  width: '34px',
  height: '38px',
  fontSize: '20px',
  background: '#fff',
  border: '1.5px solid #C2CAD0',
  borderRadius: '6px',
  cursor: 'pointer',
  color: '#222A30',
};
const qtyBox: React.CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: '4px',
  width: '84px',
  justifyContent: 'center',
  border: '1.5px solid #C2CAD0',
  borderRadius: '6px',
  padding: '7px 6px',
};
const qtyInput: React.CSSProperties = {
  width: '46px',
  border: 'none',
  outline: 'none',
  textAlign: 'right',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '20px',
  fontWeight: 600,
  color: '#222A30',
  background: 'transparent',
  padding: 0,
};
const removeBtn: React.CSSProperties = {
  flex: 'none',
  width: '30px',
  height: '30px',
  borderRadius: '6px',
  border: '1px solid #E2E6E9',
  background: '#fff',
  color: '#8A99A3',
  cursor: 'pointer',
  fontSize: '16px',
};
