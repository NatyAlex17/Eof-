'use client';

import { useState } from 'react';
import Nav from '../components/Nav';

interface PriceOverride {
  sku: string;
  species: string;
  price: number;
  effectiveFrom: string;
}

interface Customer {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  tier: 'T1' | 'T2' | 'T3';
  defaultCarrier: string;
  terms: string;
  location: string;
  standingOrder?: string;
  channelPref: string;
  status: 'active' | 'inactive';
  overrides: PriceOverride[];
}

const TIER_META: Record<Customer['tier'], { label: string; color: string; bg: string }> = {
  T1: { label: 'Tier 1 — Premium', color: '#2D5365', bg: '#EEF3F6' },
  T2: { label: 'Tier 2 — Standard', color: '#2E6347', bg: '#EAF1ED' },
  T3: { label: 'Tier 3 — COD', color: '#8A5A14', bg: '#F4EEE2' },
};

const SEED: Customer[] = [
  {
    id: 'c1',
    name: 'Nobu',
    contact: 'Nobu Matsuhisa',
    phone: '(415) 555-0188',
    email: 'orders@nobu-sf.com',
    tier: 'T1',
    defaultCarrier: 'Main Freight',
    terms: 'Net 15',
    location: 'SFO',
    standingOrder: 'Mon/Thu — Ahi A+, 40 lb',
    channelPref: 'Phone',
    status: 'active',
    overrides: [
      { sku: 'AHI-A+', species: 'Ahi Tuna A+', price: 24.5, effectiveFrom: 'Jun 1, 2026' },
    ],
  },
  {
    id: 'c2',
    name: 'Morimoto',
    contact: 'M. Kitchen',
    phone: '(415) 555-0204',
    email: 'purchasing@morimoto.com',
    tier: 'T1',
    defaultCarrier: 'Main Freight',
    terms: 'Net 15',
    location: 'SFO',
    standingOrder: 'Wed — Salmon A, 30 lb',
    channelPref: 'Email',
    status: 'active',
    overrides: [],
  },
  {
    id: 'c3',
    name: "Roy's",
    contact: 'Roy Yamaguchi',
    phone: '(310) 555-0142',
    email: 'kitchen@roys.com',
    tier: 'T2',
    defaultCarrier: 'Gold Coast 3PL',
    terms: 'Net 30',
    location: 'LAX',
    channelPref: 'Text',
    status: 'active',
    overrides: [{ sku: 'ONO-A', species: 'Ono A', price: 17.0, effectiveFrom: 'May 15, 2026' }],
  },
  {
    id: 'c4',
    name: "Alan Wong's",
    contact: 'Alan Wong',
    phone: '(808) 555-0190',
    email: 'orders@alanwongs.com',
    tier: 'T2',
    defaultCarrier: 'Island Air Cargo',
    terms: 'Net 30',
    location: 'LAX',
    channelPref: 'Phone',
    status: 'active',
    overrides: [],
  },
  {
    id: 'c5',
    name: "Tiki's Grill",
    contact: 'Front desk',
    phone: '(808) 555-0233',
    email: 'tikis@grill.com',
    tier: 'T3',
    defaultCarrier: 'Customer pickup',
    terms: 'COD',
    location: 'SFO',
    channelPref: 'Phone',
    status: 'inactive',
    overrides: [],
  },
];

type FormState = {
  name: string;
  contact: string;
  phone: string;
  email: string;
  tier: Customer['tier'];
  defaultCarrier: string;
  terms: string;
  location: string;
  standingOrder: string;
  channelPref: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  contact: '',
  phone: '',
  email: '',
  tier: 'T2',
  defaultCarrier: '',
  terms: 'Net 30',
  location: 'SFO',
  standingOrder: '',
  channelPref: 'Phone',
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(SEED);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ open: boolean; editingId: string | null }>({
    open: false,
    editingId: null,
  });
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditor({ open: true, editingId: null });
  };

  const openEdit = (c: Customer) => {
    setForm({
      name: c.name,
      contact: c.contact,
      phone: c.phone,
      email: c.email,
      tier: c.tier,
      defaultCarrier: c.defaultCarrier,
      terms: c.terms,
      location: c.location,
      standingOrder: c.standingOrder || '',
      channelPref: c.channelPref,
    });
    setEditor({ open: true, editingId: c.id });
    setSelectedId(null);
  };

  const saveCustomer = () => {
    if (!form.name.trim()) return;
    if (editor.editingId) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === editor.editingId
            ? { ...c, ...form, standingOrder: form.standingOrder || undefined }
            : c
        )
      );
    } else {
      const newCustomer: Customer = {
        id: 'c' + Date.now(),
        ...form,
        standingOrder: form.standingOrder || undefined,
        status: 'active',
        overrides: [],
      };
      setCustomers((prev) => [newCustomer, ...prev]);
    }
    setEditor({ open: false, editingId: null });
    setForm(EMPTY_FORM);
  };

  const filtered = customers.filter((c) =>
    search
      ? c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.contact.toLowerCase().includes(search.toLowerCase())
      : true
  );

  const selected = customers.find((c) => c.id === selectedId) || null;

  const money = (n: number) =>
    '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const labelStyle: React.CSSProperties = {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#8A99A3',
    marginBottom: '4px',
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
              Customers
            </span>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                color: '#8A99A3',
              }}
            >
              {customers.filter((c) => c.status === 'active').length} active
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers…"
              style={{
                width: '240px',
                fontFamily: "'Archivo', sans-serif",
                fontSize: '13px',
                padding: '8px 12px',
                border: '1px solid #D6DCE0',
                borderRadius: '5px',
                background: '#fff',
                color: '#222A30',
                outline: 'none',
              }}
            />
            <button
              onClick={openNew}
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
              New customer
            </button>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px' }}>
          <div
            style={{
              background: '#fff',
              border: '1px solid #E2E6E9',
              borderRadius: '8px',
              overflow: 'hidden',
              maxWidth: '1100px',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 150px 120px 90px 110px 110px',
                gap: 0,
                padding: '11px 18px',
                background: '#FAFBFB',
                borderBottom: '1px solid #E2E6E9',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.07em',
                color: '#8A99A3',
              }}
            >
              <span>CUSTOMER</span>
              <span>TIER</span>
              <span>DEFAULT CARRIER</span>
              <span>TERMS</span>
              <span>LOCATION</span>
              <span style={{ textAlign: 'right' }}>ACTION</span>
            </div>
            {filtered.map((c) => {
              const tm = TIER_META[c.tier];
              return (
                <div
                  key={c.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 150px 120px 90px 110px 110px',
                    gap: 0,
                    alignItems: 'center',
                    padding: '13px 18px',
                    borderBottom: '1px solid #EDEFF1',
                    borderLeft: `3px solid ${c.status === 'active' ? '#3F7D5B' : '#D6DCE0'}`,
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedId(c.id)}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: '11px', color: '#8A99A3', marginTop: '1px' }}>
                      {c.contact} · {c.channelPref}
                      {c.status === 'inactive' && ' · inactive'}
                    </div>
                  </div>
                  <span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: tm.color,
                        background: tm.bg,
                        borderRadius: '3px',
                        padding: '3px 9px',
                      }}
                    >
                      {c.tier}
                    </span>
                  </span>
                  <span style={{ fontSize: '12px', color: '#5A6670' }}>{c.defaultCarrier}</span>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '12px',
                      color: '#5A6670',
                    }}
                  >
                    {c.terms}
                  </span>
                  <span style={{ fontSize: '12px', color: '#5A6670' }}>{c.location}</span>
                  <span style={{ textAlign: 'right' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(c.id);
                      }}
                      style={{
                        fontFamily: "'Archivo', sans-serif",
                        fontSize: '12px',
                        fontWeight: 600,
                        background: '#fff',
                        color: '#3F6F86',
                        border: '1px solid #C5D8E2',
                        borderRadius: '5px',
                        padding: '6px 12px',
                        cursor: 'pointer',
                      }}
                    >
                      View
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CUSTOMER DETAIL DRAWER */}
      {selected && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(34,42,48,0.32)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 50,
          }}
          onClick={() => setSelectedId(null)}
        >
          <div
            style={{
              width: '520px',
              maxWidth: '94vw',
              height: '100%',
              background: '#F4F5F6',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-12px 0 40px rgba(34,42,48,0.18)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '20px 24px',
                background: '#fff',
                borderBottom: '1px solid #E2E6E9',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.01em' }}>
                    {selected.name}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: TIER_META[selected.tier].color,
                      background: TIER_META[selected.tier].bg,
                      borderRadius: '3px',
                      padding: '3px 9px',
                    }}
                  >
                    {TIER_META[selected.tier].label}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '12px',
                    color: '#8A99A3',
                    marginTop: '4px',
                  }}
                >
                  {selected.contact} · {selected.phone}
                </div>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                style={{
                  fontSize: '20px',
                  background: 'none',
                  border: 'none',
                  color: '#8A99A3',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
              }}
            >
              {/* defaults card */}
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #E2E6E9',
                  borderRadius: '8px',
                  padding: '18px 20px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: '#8A99A3',
                    marginBottom: '14px',
                  }}
                >
                  ORDER DEFAULTS
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={labelStyle}>EMAIL</div>
                    <div style={{ fontSize: '13px' }}>{selected.email}</div>
                  </div>
                  <div>
                    <div style={labelStyle}>INTAKE CHANNEL</div>
                    <div style={{ fontSize: '13px' }}>{selected.channelPref}</div>
                  </div>
                  <div>
                    <div style={labelStyle}>DEFAULT CARRIER</div>
                    <div style={{ fontSize: '13px' }}>{selected.defaultCarrier}</div>
                  </div>
                  <div>
                    <div style={labelStyle}>PAYMENT TERMS</div>
                    <div style={{ fontSize: '13px', fontFamily: "'IBM Plex Mono', monospace" }}>
                      {selected.terms}
                    </div>
                  </div>
                  <div>
                    <div style={labelStyle}>LOCATION</div>
                    <div style={{ fontSize: '13px' }}>{selected.location}</div>
                  </div>
                  <div>
                    <div style={labelStyle}>STANDING ORDER</div>
                    <div style={{ fontSize: '13px' }}>{selected.standingOrder || '—'}</div>
                  </div>
                </div>
              </div>

              {/* pricing overrides */}
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #E2E6E9',
                  borderRadius: '8px',
                  padding: '18px 20px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '14px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: '#8A99A3',
                    }}
                  >
                    PRICING OVERRIDES
                  </div>
                  <span style={{ fontSize: '11px', color: '#8A99A3' }}>
                    Effective-dated · audited
                  </span>
                </div>
                {selected.overrides.length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#8A99A3' }}>
                    No overrides — uses {TIER_META[selected.tier].label} pricing.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selected.overrides.map((o) => (
                      <div
                        key={o.sku}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          background: '#F4F5F6',
                          borderRadius: '5px',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>{o.species}</div>
                          <div
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '11px',
                              color: '#8A99A3',
                            }}
                          >
                            {o.sku} · from {o.effectiveFrom}
                          </div>
                        </div>
                        <div
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '15px',
                            fontWeight: 600,
                          }}
                        >
                          {money(o.price)}
                          <span style={{ fontSize: '10px', color: '#8A99A3' }}>/lb</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                padding: '16px 24px',
                background: '#fff',
                borderTop: '1px solid #E2E6E9',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <button
                onClick={() => setSelectedId(null)}
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
                Close
              </button>
              <button
                onClick={() => selected && openEdit(selected)}
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: '13px',
                  fontWeight: 600,
                  background: '#222A30',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '10px 18px',
                  cursor: 'pointer',
                }}
              >
                Edit customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW / EDIT CUSTOMER DRAWER */}
      {editor.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(34,42,48,0.32)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 60,
          }}
          onClick={() => setEditor({ open: false, editingId: null })}
        >
          <div
            style={{
              width: '480px',
              maxWidth: '94vw',
              height: '100%',
              background: '#F4F5F6',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-12px 0 40px rgba(34,42,48,0.18)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '20px 24px',
                background: '#fff',
                borderBottom: '1px solid #E2E6E9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
                  {editor.editingId ? 'Edit customer' : 'New customer'}
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '12px',
                    color: '#8A99A3',
                    marginTop: '3px',
                  }}
                >
                  Defaults auto-fill on new orders · overridable per order
                </div>
              </div>
              <button
                onClick={() => setEditor({ open: false, editingId: null })}
                style={{
                  fontSize: '20px',
                  background: 'none',
                  border: 'none',
                  color: '#8A99A3',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
              }}
            >
              {(() => {
                const fieldLabel: React.CSSProperties = {
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: '#8A99A3',
                  display: 'block',
                  marginBottom: '6px',
                };
                const fieldInput: React.CSSProperties = {
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: '13px',
                  border: '1px solid #D6DCE0',
                  borderRadius: '5px',
                  padding: '9px 12px',
                  width: '100%',
                  boxSizing: 'border-box',
                  color: '#222A30',
                  background: '#fff',
                  outline: 'none',
                };
                return (
                  <>
                    <div>
                      <label style={fieldLabel}>CUSTOMER NAME *</label>
                      <input
                        style={fieldInput}
                        placeholder="e.g. Nobu"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={fieldLabel}>CONTACT</label>
                        <input
                          style={fieldInput}
                          value={form.contact}
                          onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label style={fieldLabel}>PHONE</label>
                        <input
                          style={fieldInput}
                          value={form.phone}
                          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={fieldLabel}>EMAIL</label>
                      <input
                        style={fieldInput}
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={fieldLabel}>PRICING TIER</label>
                        <select
                          style={fieldInput}
                          value={form.tier}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, tier: e.target.value as Customer['tier'] }))
                          }
                        >
                          <option value="T1">Tier 1 — Premium</option>
                          <option value="T2">Tier 2 — Standard</option>
                          <option value="T3">Tier 3 — COD</option>
                        </select>
                      </div>
                      <div>
                        <label style={fieldLabel}>PAYMENT TERMS</label>
                        <input
                          style={fieldInput}
                          value={form.terms}
                          onChange={(e) => setForm((f) => ({ ...f, terms: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={fieldLabel}>DEFAULT CARRIER</label>
                        <input
                          style={fieldInput}
                          value={form.defaultCarrier}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, defaultCarrier: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <label style={fieldLabel}>LOCATION</label>
                        <select
                          style={fieldInput}
                          value={form.location}
                          onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                        >
                          <option value="SFO">SFO</option>
                          <option value="LAX">LAX</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={fieldLabel}>INTAKE CHANNEL</label>
                        <select
                          style={fieldInput}
                          value={form.channelPref}
                          onChange={(e) => setForm((f) => ({ ...f, channelPref: e.target.value }))}
                        >
                          <option value="Phone">Phone</option>
                          <option value="Text">Text</option>
                          <option value="Email">Email</option>
                        </select>
                      </div>
                      <div>
                        <label style={fieldLabel}>STANDING ORDER</label>
                        <input
                          style={fieldInput}
                          placeholder="optional"
                          value={form.standingOrder}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, standingOrder: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div
              style={{
                padding: '16px 24px',
                background: '#fff',
                borderTop: '1px solid #E2E6E9',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <button
                onClick={() => setEditor({ open: false, editingId: null })}
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
              <button
                onClick={saveCustomer}
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: '13px',
                  fontWeight: 600,
                  background: '#222A30',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '10px 18px',
                  cursor: 'pointer',
                }}
              >
                {editor.editingId ? 'Save changes' : 'Create customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
