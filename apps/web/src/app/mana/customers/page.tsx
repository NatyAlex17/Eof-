'use client';

import { useEffect, useState } from 'react';
import Nav from '../components/Nav';
import { createClient } from '@/lib/supabase/client';

interface PriceOverride {
  sku: string;
  species: string;
  price: number;
  effectiveFrom: string;
}

// Shape of a customers row (+ nested price_overrides) as read from Supabase.
interface DbCustomer {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  tier: 'T1' | 'T2' | 'T3' | null;
  default_carrier: string | null;
  terms: string | null;
  location: string | null;
  standing_order: string | null;
  channel_pref: string | null;
  status: 'active' | 'inactive' | null;
  created_at: string;
  price_overrides?: {
    sku: string;
    species: string | null;
    price: number;
    effective_from: string | null;
  }[];
}

interface Customer {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  tier: 'T1' | 'T2' | 'T3' | null; // null = not assigned yet (portal signups)
  defaultCarrier: string;
  terms: string;
  location: string;
  standingOrder?: string;
  channelPref: string;
  status: 'active' | 'inactive';
  createdAt: string;
  overrides: PriceOverride[];
}

const TIER_META: Record<string, { label: string; color: string; bg: string }> = {
  T1: { label: 'Tier 1 — Premium', color: '#2D5365', bg: '#EEF3F6' },
  T2: { label: 'Tier 2 — Standard', color: '#2E6347', bg: '#EAF1ED' },
  T3: { label: 'Tier 3 — COD', color: '#8A5A14', bg: '#F4EEE2' },
};

// Meta for a tier that may be unassigned. Staff see "Unassigned" so they know
// to set a tier before the customer's portal shows pricing.
const tierMeta = (t: string | null) =>
  (t && TIER_META[t]) || { label: 'Unassigned', color: '#8A5A14', bg: '#F4EEE2' };

function mapCustomer(c: DbCustomer): Customer {
  return {
    id: c.id,
    name: c.name,
    contact: c.contact ?? '',
    phone: c.phone ?? '',
    email: c.email ?? '',
    tier: c.tier ?? null,
    defaultCarrier: c.default_carrier ?? '—',
    terms: c.terms ?? '—',
    location: c.location ?? '—',
    standingOrder: c.standing_order ?? undefined,
    channelPref: c.channel_pref ?? 'Phone',
    status: c.status ?? 'active',
    createdAt: c.created_at,
    overrides: (c.price_overrides ?? []).map((o) => ({
      sku: o.sku,
      species: o.species ?? o.sku,
      price: Number(o.price),
      effectiveFrom: o.effective_from ?? '—',
    })),
  };
}

type FormState = {
  name: string;
  contact: string;
  phone: string;
  email: string;
  tier: 'T1' | 'T2' | 'T3' | ''; // '' = leave unassigned
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
  tier: '',
  defaultCarrier: '',
  terms: 'Net 30',
  location: 'SFO',
  standingOrder: '',
  channelPref: 'Phone',
};

export default function CustomersPage() {
  const supabase = createClient();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'unassigned' | 'T1' | 'T2' | 'T3'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [addedFilter, setAddedFilter] = useState<'all' | '7' | '30'>('all');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ open: boolean; editingId: string | null }>({
    open: false,
    editingId: null,
  });
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  async function fetchAll() {
    setLoading(true);
    const { data } = await supabase.from('customers').select('*, price_overrides(*)').order('name');
    setCustomers(((data ?? []) as unknown as DbCustomer[]).map(mapCustomer));
    setLoading(false);
  }

  useEffect(() => {
    fetchAll();
  }, []);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setEditor({ open: true, editingId: null });
  };

  const openEdit = (c: Customer) => {
    setForm({
      name: c.name,
      contact: c.contact,
      phone: c.phone,
      email: c.email,
      tier: c.tier ?? '',
      defaultCarrier: c.defaultCarrier,
      terms: c.terms,
      location: c.location,
      standingOrder: c.standingOrder || '',
      channelPref: c.channelPref,
    });
    setEditor({ open: true, editingId: c.id });
    setSelectedId(null);
  };

  const saveCustomer = async () => {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    setFormError('');
    const payload = {
      name: form.name.trim(),
      contact: form.contact || null,
      phone: form.phone || null,
      email: form.email || null,
      tier: form.tier || null,
      default_carrier: form.defaultCarrier || null,
      terms: form.terms || null,
      location: form.location || null,
      standing_order: form.standingOrder || null,
      channel_pref: form.channelPref || null,
    };
    const { error } = editor.editingId
      ? await supabase.from('customers').update(payload).eq('id', editor.editingId)
      : await supabase.from('customers').insert({ ...payload, status: 'active' });
    setSaving(false);
    if (error) {
      setFormError(
        error.message.includes('duplicate')
          ? `A customer named "${form.name.trim()}" already exists.`
          : error.message
      );
      return;
    }
    setEditor({ open: false, editingId: null });
    setForm(EMPTY_FORM);
    fetchAll();
  };

  // Distinct warehouses present in the data, for the location filter.
  const locations = Array.from(
    new Set(customers.map((c) => c.location).filter((l) => l && l !== '—'))
  ).sort();

  const now = Date.now();
  const filtered = customers
    .filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.contact.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    })
    .filter((c) =>
      tierFilter === 'all' ? true : tierFilter === 'unassigned' ? !c.tier : c.tier === tierFilter
    )
    .filter((c) => (statusFilter === 'all' ? true : c.status === statusFilter))
    .filter((c) => (locationFilter === 'all' ? true : c.location === locationFilter))
    .filter((c) => {
      if (addedFilter === 'all') return true;
      const cutoff = now - Number(addedFilter) * 86400000;
      return new Date(c.createdAt).getTime() >= cutoff;
    })
    .sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sort === 'oldest' ? da - db : db - da;
    });

  const unassignedCount = customers.filter((c) => !c.tier).length;
  const newCount = customers.filter(
    (c) => new Date(c.createdAt).getTime() >= now - 7 * 86400000
  ).length;
  const filtersActive =
    !!search ||
    tierFilter !== 'all' ||
    statusFilter !== 'all' ||
    locationFilter !== 'all' ||
    addedFilter !== 'all';
  const clearFilters = () => {
    setSearch('');
    setTierFilter('all');
    setStatusFilter('all');
    setLocationFilter('all');
    setAddedFilter('all');
  };

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

  const selStyle: React.CSSProperties = {
    fontFamily: "'Archivo', sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    color: '#5A6670',
    background: '#fff',
    border: '1px solid #D6DCE0',
    borderRadius: '5px',
    padding: '7px 10px',
    cursor: 'pointer',
    outline: 'none',
  };
  const chipStyle = (on: boolean): React.CSSProperties => ({
    fontFamily: "'Archivo', sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    borderRadius: '20px',
    padding: '6px 13px',
    cursor: 'pointer',
    border: `1px solid ${on ? '#3F6F86' : '#D6DCE0'}`,
    background: on ? '#3F6F86' : '#fff',
    color: on ? '#fff' : '#5A6670',
  });

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

        {/* FILTER TOOLBAR */}
        <div
          style={{
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            padding: '11px 28px',
            borderBottom: '1px solid #E2E6E9',
            background: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setAddedFilter((f) => (f === '7' ? 'all' : '7'))}
              style={chipStyle(addedFilter === '7')}
            >
              New this week · {newCount}
            </button>
            <button
              onClick={() => setTierFilter((f) => (f === 'unassigned' ? 'all' : 'unassigned'))}
              style={chipStyle(tierFilter === 'unassigned')}
            >
              Unassigned tier · {unassignedCount}
            </button>
            <span style={{ fontSize: '12px', color: '#8A99A3', marginLeft: '4px' }}>
              {filtered.length} of {customers.length}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value as typeof tierFilter)}
              style={selStyle}
              title="Filter by tier"
            >
              <option value="all">All tiers</option>
              <option value="unassigned">Unassigned</option>
              <option value="T1">Tier 1</option>
              <option value="T2">Tier 2</option>
              <option value="T3">Tier 3</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              style={selStyle}
              title="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              style={selStyle}
              title="Filter by warehouse"
            >
              <option value="all">All warehouses</option>
              {locations.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <select
              value={addedFilter}
              onChange={(e) => setAddedFilter(e.target.value as typeof addedFilter)}
              style={selStyle}
              title="Filter by date added"
            >
              <option value="all">Any time</option>
              <option value="7">Added · last 7 days</option>
              <option value="30">Added · last 30 days</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              style={selStyle}
              title="Sort"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A–Z</option>
            </select>
            {filtersActive && (
              <button
                onClick={clearFilters}
                style={{ ...selStyle, color: '#A5362C', border: '1px solid #E3B6B1' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

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
              const tm = tierMeta(c.tier);
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
                      {c.tier ?? 'Unassigned'}
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
            {(loading || filtered.length === 0) && (
              <div
                style={{
                  padding: '26px 18px',
                  textAlign: 'center',
                  fontSize: '13px',
                  color: '#8A99A3',
                }}
              >
                {loading
                  ? 'Loading customers…'
                  : customers.length === 0
                    ? 'No customers yet. Add one here, or create an order for a new customer in Order Intake.'
                    : 'No customers match your search.'}
              </div>
            )}
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
                      color: tierMeta(selected.tier).color,
                      background: tierMeta(selected.tier).bg,
                      borderRadius: '3px',
                      padding: '3px 9px',
                    }}
                  >
                    {tierMeta(selected.tier).label}
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
                    {selected.tier
                      ? `No overrides — uses ${tierMeta(selected.tier).label} pricing.`
                      : 'No tier assigned yet — assign one so this customer sees pricing in their portal.'}
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
                            setForm((f) => ({ ...f, tier: e.target.value as FormState['tier'] }))
                          }
                        >
                          <option value="">— Unassigned (no portal pricing yet) —</option>
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
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              {formError && (
                <span
                  style={{
                    flex: 1,
                    fontSize: '12px',
                    color: '#A5362C',
                    lineHeight: 1.4,
                  }}
                >
                  {formError}
                </span>
              )}
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
                disabled={saving || !form.name.trim()}
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: '13px',
                  fontWeight: 600,
                  background: saving || !form.name.trim() ? '#8A99A3' : '#222A30',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '10px 18px',
                  cursor: saving || !form.name.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Saving…' : editor.editingId ? 'Save changes' : 'Create customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
