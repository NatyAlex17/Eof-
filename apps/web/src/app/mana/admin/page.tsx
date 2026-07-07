'use client';

import { useState, useEffect } from 'react';
import Nav from '../components/Nav';
import { createClient } from '@/lib/supabase/client';

type AdminTab = 'users' | 'sku' | 'pricing' | 'mappings' | 'integrations';

interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'operations' | 'finance' | 'sales' | 'logistics' | 'viewer';
  location: string | null;
  status: 'active' | 'invited' | 'inactive';
  last_seen: string | null;
}

interface SKU {
  code: string;
  species: string;
  grade: string | null;
  pack_type: string | null;
  uom: string | null;
  qbo_item: string | null;
  active: boolean;
  base_price_lb: number | null;
  description: string | null;
}

interface PricingTier {
  tier: string;
  label: string;
  terms: string | null;
  base_multiplier: number;
  customers: string[];
}

const ROLES: Profile['role'][] = ['admin', 'operations', 'finance', 'sales', 'logistics', 'viewer'];

const roleMeta = (r: Profile['role']) =>
  ({
    admin: { label: 'Admin', color: '#2D5365', bg: '#EEF3F6' },
    operations: { label: 'Operations', color: '#2E6347', bg: '#EAF1ED' },
    finance: { label: 'Finance', color: '#8A5A14', bg: '#F4EEE2' },
    sales: { label: 'Sales', color: '#5A3E6B', bg: '#F0ECF6' },
    logistics: { label: 'Logistics', color: '#5A6670', bg: '#EEF0F2' },
    viewer: { label: 'Viewer', color: '#8A99A3', bg: '#F4F5F6' },
  })[r];

const statusMeta = (s: Profile['status']) =>
  ({
    active: { label: 'Active', color: '#2E6347', bg: '#EAF1ED', dot: '#3F7D5B' },
    invited: { label: 'Invited', color: '#8A5A14', bg: '#F4EEE2', dot: '#B7791F' },
    inactive: { label: 'Inactive', color: '#8A99A3', bg: '#EEF0F2', dot: '#8A99A3' },
  })[s];

function formatLastSeen(ts: string | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24)
    return `Today ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function AdminPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<AdminTab>('users');

  // Users
  const [users, setUsers] = useState<Profile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [assignModal, setAssignModal] = useState<{ open: boolean; userId: string | null }>({
    open: false,
    userId: null,
  });
  const [selectedRole, setSelectedRole] = useState<Profile['role']>('viewer');
  const [savingRole, setSavingRole] = useState(false);
  const [inviteDrawer, setInviteDrawer] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'viewer' as Profile['role'],
    location: '',
  });
  const [inviting, setInviting] = useState(false);

  // SKUs
  const [skus, setSkus] = useState<SKU[]>([]);
  const [skusLoading, setSkusLoading] = useState(true);

  // Pricing tiers
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [tiersLoading, setTiersLoading] = useState(true);

  // Generic editor (still used for mappings / integrations placeholders)
  const [editor, setEditor] = useState<{ open: boolean; title: string; subtitle: string }>({
    open: false,
    title: '',
    subtitle: '',
  });
  const openEditor = (title: string, subtitle: string) =>
    setEditor({ open: true, title, subtitle });
  const closeEditor = () => setEditor({ open: false, title: '', subtitle: '' });

  // Real editors: SKU add + tier edit write to Supabase
  const EMPTY_SKU = {
    code: '',
    species: '',
    grade: '',
    pack_type: 'Box',
    uom: 'lb',
    qbo_item: '',
    base_price_lb: '',
    description: '',
  };
  const [skuModal, setSkuModal] = useState(false);
  const [skuForm, setSkuForm] = useState(EMPTY_SKU);
  const [savingSku, setSavingSku] = useState(false);
  const [skuError, setSkuError] = useState('');
  // inline base-price editing on the SKU table
  const [priceEdit, setPriceEdit] = useState<{ code: string; draft: string } | null>(null);

  const [tierModal, setTierModal] = useState<{
    tier: string;
    label: string;
    terms: string;
    mult: string;
    // per-species price for THIS tier, keyed by sku code (string drafts for inputs)
    prices: Record<string, string>;
  } | null>(null);
  const [savingTier, setSavingTier] = useState(false);

  // Open the tier editor pre-filled: explicit tier price if set, else base × multiplier
  const openTierModal = (t: PricingTier) => {
    const prices: Record<string, string> = {};
    skus
      .filter((s) => s.active)
      .forEach((s) => {
        const override = tierPrices[t.tier]?.[s.code];
        const auto =
          s.base_price_lb != null
            ? Math.round(s.base_price_lb * t.base_multiplier * 100) / 100
            : null;
        prices[s.code] = override !== undefined ? override.toFixed(2) : auto ? auto.toFixed(2) : '';
      });
    setTierModal({
      tier: t.tier,
      label: t.label,
      terms: t.terms || '',
      mult: t.base_multiplier.toFixed(2),
      prices,
    });
  };

  // species-specific price per tier: { [tier]: { [sku_code]: price } }
  const [tierPrices, setTierPrices] = useState<Record<string, Record<string, number>>>({});
  const [tierPriceEdit, setTierPriceEdit] = useState<{
    tier: string;
    code: string;
    draft: string;
  } | null>(null);

  const saveSku = async () => {
    if (!skuForm.code || !skuForm.species) return;
    setSavingSku(true);
    setSkuError('');
    const priceNum = parseFloat(skuForm.base_price_lb);
    const { error } = await supabase.from('skus').insert({
      code: skuForm.code.toUpperCase(),
      species: skuForm.species,
      grade: skuForm.grade || null,
      pack_type: skuForm.pack_type || null,
      uom: skuForm.uom || 'lb',
      qbo_item: skuForm.qbo_item || null,
      base_price_lb: priceNum > 0 ? Math.round(priceNum * 100) / 100 : null,
      description: skuForm.description.trim() || null,
      active: true,
    });
    setSavingSku(false);
    if (error) {
      setSkuError(
        error.message.includes('duplicate')
          ? `SKU ${skuForm.code.toUpperCase()} already exists.`
          : error.message
      );
      return;
    }
    setSkuModal(false);
    setSkuForm(EMPTY_SKU);
    fetchSkus();
  };

  const saveBasePrice = async () => {
    if (!priceEdit) return;
    const v = parseFloat(priceEdit.draft);
    if (v > 0) {
      await supabase
        .from('skus')
        .update({ base_price_lb: Math.round(v * 100) / 100 })
        .eq('code', priceEdit.code);
      fetchSkus();
    }
    setPriceEdit(null);
  };

  async function fetchTierPrices() {
    const { data } = await supabase.from('tier_species_prices').select('*');
    const map: Record<string, Record<string, number>> = {};
    (data ?? []).forEach((r: { tier: string; sku_code: string; price_lb: number }) => {
      if (!map[r.tier]) map[r.tier] = {};
      map[r.tier][r.sku_code] = Number(r.price_lb);
    });
    setTierPrices(map);
  }

  const saveTierPrice = async () => {
    if (!tierPriceEdit) return;
    const v = parseFloat(tierPriceEdit.draft);
    if (v > 0) {
      await supabase.from('tier_species_prices').upsert(
        {
          tier: tierPriceEdit.tier,
          sku_code: tierPriceEdit.code,
          price_lb: Math.round(v * 100) / 100,
        },
        { onConflict: 'tier,sku_code' }
      );
      fetchTierPrices();
    }
    setTierPriceEdit(null);
  };

  const clearTierPrice = async (tier: string, code: string) => {
    await supabase.from('tier_species_prices').delete().eq('tier', tier).eq('sku_code', code);
    fetchTierPrices();
  };

  const saveTier = async () => {
    if (!tierModal) return;
    setSavingTier(true);
    await supabase
      .from('pricing_tiers')
      .update({ terms: tierModal.terms, base_multiplier: parseFloat(tierModal.mult) || 1 })
      .eq('tier', tierModal.tier);

    // Persist the species prices for this tier: filled = explicit price (upsert),
    // cleared = back to the multiplier (delete the override row)
    const upserts: { tier: string; sku_code: string; price_lb: number }[] = [];
    const deletes: string[] = [];
    Object.entries(tierModal.prices).forEach(([code, draft]) => {
      const v = parseFloat(draft);
      if (v > 0)
        upserts.push({ tier: tierModal.tier, sku_code: code, price_lb: Math.round(v * 100) / 100 });
      else if (tierPrices[tierModal.tier]?.[code] !== undefined) deletes.push(code);
    });
    if (upserts.length > 0) {
      await supabase.from('tier_species_prices').upsert(upserts, { onConflict: 'tier,sku_code' });
    }
    if (deletes.length > 0) {
      await supabase
        .from('tier_species_prices')
        .delete()
        .eq('tier', tierModal.tier)
        .in('sku_code', deletes);
    }

    setSavingTier(false);
    setTierModal(null);
    fetchTiers();
    fetchTierPrices();
  };

  useEffect(() => {
    fetchUsers();
    fetchSkus();
    fetchTiers();
    fetchTierPrices();
  }, []);

  async function fetchUsers() {
    setUsersLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at');
    setUsers((data as Profile[]) ?? []);
    setUsersLoading(false);
  }

  async function fetchSkus() {
    setSkusLoading(true);
    const { data } = await supabase.from('skus').select('*').order('code');
    setSkus((data as SKU[]) ?? []);
    setSkusLoading(false);
  }

  async function fetchTiers() {
    setTiersLoading(true);
    const { data: tierData } = await supabase.from('pricing_tiers').select('*').order('tier');
    const { data: custData } = await supabase.from('customers').select('name, tier');
    const built: PricingTier[] = (tierData ?? []).map((t: Record<string, unknown>) => ({
      tier: t.tier as string,
      label: t.label as string,
      terms: t.terms as string | null,
      base_multiplier: t.base_multiplier as number,
      customers: (custData ?? [])
        .filter((c: Record<string, unknown>) => c.tier === t.tier)
        .map((c: Record<string, unknown>) => c.name as string),
    }));
    setTiers(built);
    setTiersLoading(false);
  }

  const openAssign = (userId: string) => {
    const u = users.find((x) => x.id === userId);
    if (u) setSelectedRole(u.role);
    setAssignModal({ open: true, userId });
  };

  const applyRole = async () => {
    if (!assignModal.userId) return;
    setSavingRole(true);
    await supabase.from('profiles').update({ role: selectedRole }).eq('id', assignModal.userId);
    setUsers((prev) =>
      prev.map((u) => (u.id === assignModal.userId ? { ...u, role: selectedRole } : u))
    );
    setSavingRole(false);
    setAssignModal({ open: false, userId: null });
  };

  const sendInvite = async () => {
    if (!inviteForm.name || !inviteForm.email) return;
    setInviting(true);
    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inviteForm),
    });
    setInviting(false);
    if (res.ok) {
      setInviteForm({ name: '', email: '', role: 'viewer', location: '' });
      setInviteDrawer(false);
      fetchUsers();
    }
  };

  const tabStyle = (on: boolean): React.CSSProperties => ({
    fontFamily: "'Archivo', sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '4px',
    padding: '6px 13px',
    cursor: 'pointer',
    background: on ? '#3F6F86' : 'none',
    color: on ? '#fff' : '#5A6670',
  });

  const inputStyle: React.CSSProperties = {
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

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#8A99A3',
    display: 'block',
    marginBottom: '6px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              Admin
            </span>
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
              {(
                [
                  ['users', 'Users & Roles'],
                  ['sku', 'SKU Master'],
                  ['pricing', 'Pricing Tiers'],
                  ['mappings', 'Vendor Mappings'],
                  ['integrations', 'Integrations'],
                ] as [AdminTab, string][]
              ).map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)} style={tabStyle(tab === key)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {tab === 'users' && (
            <button
              onClick={() => setInviteDrawer(true)}
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
              Invite user
            </button>
          )}
          {tab === 'sku' && (
            <button
              onClick={() => setSkuModal(true)}
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
              Add SKU
            </button>
          )}
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px' }}>
          {/* USERS TAB */}
          {tab === 'users' && (
            <div style={{ maxWidth: '1000px' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}
              >
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '12px',
                    color: '#8A99A3',
                  }}
                >
                  {usersLoading
                    ? 'Loading…'
                    : `${users.filter((u) => u.status === 'active').length} active · ${users.filter((u) => u.status === 'invited').length} invited`}
                </span>
              </div>
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
                    gridTemplateColumns: '1fr 200px 100px 80px 130px 100px 120px',
                    padding: '11px 18px',
                    background: '#FAFBFB',
                    borderBottom: '1px solid #E2E6E9',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    color: '#8A99A3',
                  }}
                >
                  <span>NAME</span>
                  <span>EMAIL</span>
                  <span>ROLE</span>
                  <span>LOCATION</span>
                  <span>STATUS</span>
                  <span>LAST SEEN</span>
                  <span style={{ textAlign: 'right' }}>ACTION</span>
                </div>
                {usersLoading ? (
                  <div style={{ padding: '24px 18px', fontSize: '13px', color: '#8A99A3' }}>
                    Loading…
                  </div>
                ) : (
                  users.map((u) => {
                    const rm = roleMeta(u.role);
                    const sm = statusMeta(u.status);
                    return (
                      <div
                        key={u.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 200px 100px 80px 130px 100px 120px',
                          alignItems: 'center',
                          padding: '13px 18px',
                          borderBottom: '1px solid #EDEFF1',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600 }}>{u.name || '—'}</div>
                        </div>
                        <span
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '12px',
                            color: '#5A6670',
                          }}
                        >
                          {u.email}
                        </span>
                        <span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: rm.color,
                              background: rm.bg,
                              borderRadius: '3px',
                              padding: '3px 9px',
                            }}
                          >
                            {rm.label}
                          </span>
                        </span>
                        <span style={{ fontSize: '12px', color: '#5A6670' }}>
                          {u.location || '—'}
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
                        <span
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '11px',
                            color: '#8A99A3',
                          }}
                        >
                          {formatLastSeen(u.last_seen)}
                        </span>
                        <span style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => openAssign(u.id)}
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
                            Assign role
                          </button>
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* SKU MASTER TAB */}
          {tab === 'sku' && (
            <div style={{ maxWidth: '1000px' }}>
              <div style={{ marginBottom: '14px', fontSize: '13px', color: '#5A6670' }}>
                Master Item Index — used for inventory, invoicing, and QBO item mapping.
              </div>
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
                    gridTemplateColumns: '110px 1fr 70px 90px 60px 1fr 80px',
                    padding: '11px 18px',
                    background: '#FAFBFB',
                    borderBottom: '1px solid #E2E6E9',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    color: '#8A99A3',
                  }}
                >
                  <span>CODE</span>
                  <span>SPECIES · DESCRIPTION</span>
                  <span>GRADE</span>
                  <span style={{ textAlign: 'right' }}>BASE $/LB</span>
                  <span>UOM</span>
                  <span>QBO ITEM NAME</span>
                  <span>STATUS</span>
                </div>
                {skusLoading ? (
                  <div style={{ padding: '24px 18px', fontSize: '13px', color: '#8A99A3' }}>
                    Loading…
                  </div>
                ) : (
                  skus.map((s) => (
                    <div
                      key={s.code}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '110px 1fr 70px 90px 60px 1fr 80px',
                        alignItems: 'center',
                        padding: '13px 18px',
                        borderBottom: '1px solid #EDEFF1',
                        borderLeft: `3px solid ${s.active ? '#3F7D5B' : '#D6DCE0'}`,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        {s.code}
                      </span>
                      <span style={{ minWidth: 0, paddingRight: '12px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600 }}>{s.species}</span>
                        {s.description && (
                          <span
                            style={{
                              display: 'block',
                              fontSize: '11px',
                              color: '#8A99A3',
                              marginTop: '2px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {s.description}
                          </span>
                        )}
                      </span>
                      <span style={{ fontSize: '12px', color: '#5A6670', fontWeight: 600 }}>
                        {s.grade || '—'}
                      </span>
                      <span style={{ textAlign: 'right' }}>
                        {priceEdit?.code === s.code ? (
                          <input
                            autoFocus
                            type="number"
                            step="0.01"
                            min="0"
                            value={priceEdit.draft}
                            onChange={(e) =>
                              setPriceEdit((p) => (p ? { ...p, draft: e.target.value } : p))
                            }
                            onBlur={saveBasePrice}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveBasePrice();
                              if (e.key === 'Escape') setPriceEdit(null);
                            }}
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '12px',
                              fontWeight: 600,
                              width: '72px',
                              padding: '4px 6px',
                              border: '1.5px solid #3F6F86',
                              borderRadius: '4px',
                              outline: 'none',
                              textAlign: 'right',
                            }}
                          />
                        ) : (
                          <button
                            onClick={() =>
                              setPriceEdit({
                                code: s.code,
                                draft: s.base_price_lb ? s.base_price_lb.toFixed(2) : '',
                              })
                            }
                            title="Click to edit base price"
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '13px',
                              fontWeight: 700,
                              background: 'none',
                              border: 'none',
                              borderBottom: '1px dashed #C2CAD0',
                              padding: '2px 0',
                              cursor: 'pointer',
                              color: s.base_price_lb ? '#222A30' : '#B7791F',
                            }}
                          >
                            {s.base_price_lb ? '$' + s.base_price_lb.toFixed(2) : 'Set price'}
                          </button>
                        )}
                      </span>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '12px',
                          color: '#5A6670',
                        }}
                      >
                        {s.uom || '—'}
                      </span>
                      <span style={{ fontSize: '12px', color: '#5A6670' }}>
                        {s.qbo_item || '—'}
                      </span>
                      <span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: s.active ? '#2E6347' : '#8A99A3',
                            background: s.active ? '#EAF1ED' : '#EEF0F2',
                            borderRadius: '3px',
                            padding: '3px 9px',
                          }}
                        >
                          {s.active ? 'Active' : 'Inactive'}
                        </span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* PRICING TIERS TAB */}
          {tab === 'pricing' && (
            <div
              style={{ maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              {tiersLoading ? (
                <div style={{ fontSize: '13px', color: '#8A99A3' }}>Loading…</div>
              ) : (
                tiers.map((t) => (
                  <div
                    key={t.tier}
                    style={{
                      background: '#fff',
                      border: '1px solid #E2E6E9',
                      borderLeft: '3px solid #3F6F86',
                      borderRadius: '8px',
                      padding: '20px 22px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '20px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '13px',
                              fontWeight: 700,
                              color: '#3F6F86',
                            }}
                          >
                            {t.tier}
                          </span>
                          <span style={{ fontSize: '15px', fontWeight: 700 }}>{t.label}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '18px', marginTop: '10px' }}>
                          <div>
                            <div
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                letterSpacing: '0.05em',
                                color: '#8A99A3',
                              }}
                            >
                              PAYMENT TERMS
                            </div>
                            <div
                              style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: '13px',
                                marginTop: '3px',
                                fontWeight: 600,
                              }}
                            >
                              {t.terms || '—'}
                            </div>
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                letterSpacing: '0.05em',
                                color: '#8A99A3',
                              }}
                            >
                              PRICE MULTIPLIER
                            </div>
                            <div
                              style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: '13px',
                                marginTop: '3px',
                                fontWeight: 600,
                              }}
                            >
                              {t.base_multiplier.toFixed(2)}×
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => openTierModal(t)}
                        style={{
                          fontFamily: "'Archivo', sans-serif",
                          fontSize: '12px',
                          fontWeight: 600,
                          background: '#fff',
                          color: '#3F6F86',
                          border: '1px solid #C5D8E2',
                          borderRadius: '5px',
                          padding: '7px 13px',
                          cursor: 'pointer',
                          flex: 'none',
                        }}
                      >
                        Edit tier
                      </button>
                    </div>
                    <div
                      style={{
                        marginTop: '14px',
                        paddingTop: '14px',
                        borderTop: '1px solid #EDEFF1',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                          color: '#8A99A3',
                          marginBottom: '8px',
                        }}
                      >
                        ASSIGNED CUSTOMERS
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {t.customers.length === 0 && (
                          <span style={{ fontSize: '12px', color: '#8A99A3' }}>None assigned</span>
                        )}
                        {t.customers.map((c) => (
                          <span
                            key={c}
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#222A30',
                              background: '#EEF3F6',
                              border: '1px solid #C5D8E2',
                              borderRadius: '4px',
                              padding: '4px 11px',
                            }}
                          >
                            {c}
                          </span>
                        ))}
                        <button
                          onClick={() =>
                            openEditor(
                              `Assign customer to ${t.label}`,
                              'Select a customer to add to this pricing tier.'
                            )
                          }
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#8A99A3',
                            background: 'none',
                            border: '1px dashed #D6DCE0',
                            borderRadius: '4px',
                            padding: '4px 11px',
                            cursor: 'pointer',
                          }}
                        >
                          + Add customer
                        </button>
                      </div>
                    </div>

                    {/* SPECIES PRICING — per-species price for THIS tier (beats the multiplier) */}
                    <div
                      style={{
                        marginTop: '14px',
                        paddingTop: '14px',
                        borderTop: '1px solid #EDEFF1',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          marginBottom: '8px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            color: '#8A99A3',
                          }}
                        >
                          SPECIES PRICING
                        </span>
                        <span style={{ fontSize: '11px', color: '#8A99A3' }}>
                          auto = base × {t.base_multiplier.toFixed(2)} · click to set a species
                          price for this tier
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                          gap: '8px',
                        }}
                      >
                        {skus
                          .filter((s) => s.active)
                          .map((s) => {
                            const override = tierPrices[t.tier]?.[s.code];
                            const auto =
                              s.base_price_lb != null
                                ? Math.round(s.base_price_lb * t.base_multiplier * 100) / 100
                                : null;
                            const isEditing =
                              tierPriceEdit?.tier === t.tier && tierPriceEdit.code === s.code;
                            return (
                              <div
                                key={s.code}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '8px',
                                  background: '#F8F9FA',
                                  border: '1px solid #E2E6E9',
                                  borderLeft: `3px solid ${override !== undefined ? '#3F6F86' : '#D6DCE0'}`,
                                  borderRadius: '5px',
                                  padding: '8px 10px',
                                }}
                              >
                                <span style={{ minWidth: 0 }}>
                                  <span
                                    style={{
                                      display: 'block',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {s.species}
                                    {s.grade ? ` · ${s.grade}` : ''}
                                  </span>
                                  <span
                                    style={{
                                      fontFamily: "'IBM Plex Mono', monospace",
                                      fontSize: '10px',
                                      color: '#8A99A3',
                                    }}
                                  >
                                    {s.code}
                                  </span>
                                </span>
                                {isEditing ? (
                                  <input
                                    autoFocus
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={tierPriceEdit.draft}
                                    onChange={(e) =>
                                      setTierPriceEdit((p) =>
                                        p ? { ...p, draft: e.target.value } : p
                                      )
                                    }
                                    onBlur={saveTierPrice}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveTierPrice();
                                      if (e.key === 'Escape') setTierPriceEdit(null);
                                    }}
                                    style={{
                                      fontFamily: "'IBM Plex Mono', monospace",
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      width: '70px',
                                      padding: '4px 6px',
                                      border: '1.5px solid #3F6F86',
                                      borderRadius: '4px',
                                      outline: 'none',
                                      textAlign: 'right',
                                      flex: 'none',
                                    }}
                                  />
                                ) : (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      flex: 'none',
                                    }}
                                  >
                                    {override !== undefined && (
                                      <button
                                        onClick={() => clearTierPrice(t.tier, s.code)}
                                        title="Remove species price — back to the tier multiplier"
                                        style={{
                                          width: '15px',
                                          height: '15px',
                                          borderRadius: '3px',
                                          border: '1px solid #C5D8E2',
                                          background: '#EEF3F6',
                                          color: '#3F6F86',
                                          fontSize: '10px',
                                          lineHeight: 1,
                                          cursor: 'pointer',
                                          padding: 0,
                                        }}
                                      >
                                        ×
                                      </button>
                                    )}
                                    <button
                                      onClick={() =>
                                        setTierPriceEdit({
                                          tier: t.tier,
                                          code: s.code,
                                          draft: (override ?? auto ?? 0).toFixed(2),
                                        })
                                      }
                                      title={
                                        override !== undefined
                                          ? 'Species price for this tier — click to edit'
                                          : auto != null
                                            ? `Auto from base × multiplier — click to set a species price`
                                            : 'No base price set — click to set one for this tier'
                                      }
                                      style={{
                                        fontFamily: "'IBM Plex Mono', monospace",
                                        fontSize: '12px',
                                        fontWeight: override !== undefined ? 700 : 500,
                                        color:
                                          override !== undefined
                                            ? '#2D5365'
                                            : auto != null
                                              ? '#5A6670'
                                              : '#B7791F',
                                        background:
                                          override !== undefined ? '#EEF3F6' : 'transparent',
                                        border:
                                          override !== undefined
                                            ? '1px solid #C5D8E2'
                                            : '1px dashed #D6DCE0',
                                        borderRadius: '4px',
                                        padding: '3px 8px',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {override !== undefined
                                        ? '$' + override.toFixed(2)
                                        : auto != null
                                          ? '$' + auto.toFixed(2)
                                          : 'set'}
                                    </button>
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        {skus.filter((s) => s.active).length === 0 && (
                          <span style={{ fontSize: '12px', color: '#8A99A3' }}>
                            No active species yet — add one in SKU Master.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* VENDOR MAPPINGS TAB — static config, no live data yet */}
          {tab === 'mappings' && (
            <div style={{ maxWidth: '860px' }}>
              <div style={{ marginBottom: '18px', fontSize: '13px', color: '#5A6670' }}>
                Column mapping rules for each vendor's CSV/Excel packing list format.
              </div>
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
                    gridTemplateColumns: '1fr 120px 120px 120px 120px 100px',
                    padding: '11px 18px',
                    background: '#FAFBFB',
                    borderBottom: '1px solid #E2E6E9',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    color: '#8A99A3',
                  }}
                >
                  <span>VENDOR</span>
                  <span>BOX COL</span>
                  <span>WEIGHT COL</span>
                  <span>SPECIES COL</span>
                  <span>GRADE COL</span>
                  <span style={{ textAlign: 'right' }}>ACTION</span>
                </div>
                {[
                  {
                    vendor: 'Kona Fresh Catch',
                    box: 'box_id',
                    weight: 'net_wt_lbs',
                    species: 'product_name',
                    grade: 'quality_grade',
                  },
                  {
                    vendor: 'Pacific Blue Co.',
                    box: 'BoxNo',
                    weight: 'Weight',
                    species: 'Item',
                    grade: 'Grade',
                  },
                  {
                    vendor: 'Island Seafood',
                    box: 'BOX',
                    weight: 'LBS',
                    species: 'SPECIES',
                    grade: 'GRD',
                  },
                ].map((m) => (
                  <div
                    key={m.vendor}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 120px 120px 120px 120px 100px',
                      alignItems: 'center',
                      padding: '13px 18px',
                      borderBottom: '1px solid #EDEFF1',
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>{m.vendor}</span>
                    {[m.box, m.weight, m.species, m.grade].map((col, i) => (
                      <span
                        key={i}
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '11px',
                          color: '#3F6F86',
                        }}
                      >
                        {col}
                      </span>
                    ))}
                    <span style={{ textAlign: 'right' }}>
                      <button
                        onClick={() =>
                          openEditor(
                            `${m.vendor} — column mapping`,
                            "Map this vendor's CSV/Excel columns to box, weight, species, and grade fields."
                          )
                        }
                        style={{
                          fontFamily: "'Archivo', sans-serif",
                          fontSize: '12px',
                          fontWeight: 600,
                          background: '#fff',
                          color: '#5A6670',
                          border: '1px solid #D6DCE0',
                          borderRadius: '4px',
                          padding: '5px 11px',
                          cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* INTEGRATIONS TAB — static status display */}
          {tab === 'integrations' && (
            <div
              style={{ maxWidth: '780px', display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              {[
                {
                  name: 'QuickBooks Online',
                  status: 'not configured',
                  detail: 'Connect QBO to enable invoice sync and credit memo automation',
                  color: '#8A99A3',
                  bg: '#EEF0F2',
                  dot: '#8A99A3',
                },
                {
                  name: 'Gmail API',
                  status: 'not configured',
                  detail:
                    'Connect Gmail to send vendor statements and parse incoming packing lists',
                  color: '#8A99A3',
                  bg: '#EEF0F2',
                  dot: '#8A99A3',
                },
                {
                  name: 'Supabase Storage',
                  status: 'connected',
                  detail: 'File storage active · vendor packing lists, BOLs, pick-slip PDFs',
                  color: '#3F7D5B',
                  bg: '#EAF1ED',
                  dot: '#3F7D5B',
                },
                {
                  name: 'SMS — Twilio',
                  status: 'not configured',
                  detail: 'Add Twilio account SID and auth token to enable SMS alerts',
                  color: '#8A99A3',
                  bg: '#EEF0F2',
                  dot: '#8A99A3',
                },
                {
                  name: 'Main Freight / 3PL',
                  status: 'manual handoff',
                  detail: 'API integration pending · using structured email + pick slip export',
                  color: '#8A5A14',
                  bg: '#F4EEE2',
                  dot: '#B7791F',
                },
                {
                  name: 'Bill.com',
                  status: 'not configured',
                  detail: 'Compatibility review pending · AP payment workflow not in MVP',
                  color: '#8A99A3',
                  bg: '#EEF0F2',
                  dot: '#8A99A3',
                },
              ].map((int) => (
                <div
                  key={int.name}
                  style={{
                    background: '#fff',
                    border: '1px solid #E2E6E9',
                    borderRadius: '8px',
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '18px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700 }}>{int.name}</span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: int.color,
                          background: int.bg,
                          borderRadius: '3px',
                          padding: '3px 9px',
                        }}
                      >
                        <span
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            background: int.dot,
                          }}
                        />
                        {int.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#8A99A3', marginTop: '6px' }}>
                      {int.detail}
                    </div>
                  </div>
                  <button
                    onClick={() => openEditor(`Configure ${int.name}`, int.detail)}
                    style={{
                      fontFamily: "'Archivo', sans-serif",
                      fontSize: '12px',
                      fontWeight: 600,
                      background: '#fff',
                      color: '#5A6670',
                      border: '1px solid #D6DCE0',
                      borderRadius: '5px',
                      padding: '8px 14px',
                      cursor: 'pointer',
                      flex: 'none',
                    }}
                  >
                    Configure
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ASSIGN ROLE MODAL */}
      {assignModal.open && (
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
          onClick={() => setAssignModal({ open: false, userId: null })}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '10px',
              padding: '28px',
              width: '400px',
              boxShadow: '0 16px 48px rgba(34,42,48,0.22)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                marginBottom: '6px',
              }}
            >
              Assign role
            </div>
            <div style={{ fontSize: '13px', color: '#5A6670', marginBottom: '20px' }}>
              {users.find((u) => u.id === assignModal.userId)?.name} ·{' '}
              {users.find((u) => u.id === assignModal.userId)?.email}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ROLES.map((r) => {
                const m = roleMeta(r);
                const isSelected = selectedRole === r;
                return (
                  <button
                    key={r}
                    onClick={() => setSelectedRole(r)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      background: isSelected ? '#EEF3F6' : '#fff',
                      border: isSelected ? '2px solid #3F6F86' : '1px solid #E2E6E9',
                      borderRadius: '7px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: m.bg,
                        border: `2px solid ${isSelected ? '#3F6F86' : 'transparent'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 'none',
                      }}
                    >
                      {isSelected && (
                        <span
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: '#3F6F86',
                          }}
                        />
                      )}
                    </span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: m.color }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize: '11px', color: '#8A99A3', marginTop: '1px' }}>
                        {
                          {
                            admin: 'Full access · manage users, settings, integrations',
                            operations: 'Inventory, allocation, receiving, pick slips',
                            finance: 'Finance queue, credits, vendor reconciliation',
                            sales: 'Order intake, customer management',
                            logistics: 'Pick slips, shipments, BOL workflow',
                            viewer: 'Read-only access to all modules',
                          }[r]
                        }
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '22px',
              }}
            >
              <button
                onClick={() => setAssignModal({ open: false, userId: null })}
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
                onClick={applyRole}
                disabled={savingRole}
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: '13px',
                  fontWeight: 600,
                  background: savingRole ? '#8A99A3' : '#222A30',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '10px 18px',
                  cursor: savingRole ? 'not-allowed' : 'pointer',
                }}
              >
                {savingRole ? 'Saving…' : 'Apply role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INVITE USER DRAWER */}
      {inviteDrawer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(34,42,48,0.32)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 50,
          }}
          onClick={() => setInviteDrawer(false)}
        >
          <div
            style={{
              width: '440px',
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
                  Invite user
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '12px',
                    color: '#8A99A3',
                    marginTop: '3px',
                  }}
                >
                  An email invitation will be sent
                </div>
              </div>
              <button
                onClick={() => setInviteDrawer(false)}
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
                gap: '16px',
              }}
            >
              <div>
                <label style={labelStyle}>FULL NAME *</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. Sales — LAX"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>EMAIL *</label>
                <input
                  style={inputStyle}
                  type="email"
                  placeholder="user@eof.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>ROLE</label>
                <select
                  style={inputStyle}
                  value={inviteForm.role}
                  onChange={(e) =>
                    setInviteForm((f) => ({ ...f, role: e.target.value as Profile['role'] }))
                  }
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {roleMeta(r).label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>LOCATION</label>
                <input
                  style={inputStyle}
                  placeholder="SFO · LAX · Remote"
                  value={inviteForm.location}
                  onChange={(e) => setInviteForm((f) => ({ ...f, location: e.target.value }))}
                />
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
                onClick={() => setInviteDrawer(false)}
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
                onClick={sendInvite}
                disabled={inviting}
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: '13px',
                  fontWeight: 600,
                  background: inviting ? '#8A99A3' : '#222A30',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '10px 18px',
                  cursor: inviting ? 'not-allowed' : 'pointer',
                }}
              >
                {inviting ? 'Sending…' : 'Send invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD SKU MODAL — writes to skus table */}
      {skuModal && (
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
          onClick={() => setSkuModal(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '10px',
              padding: '26px',
              width: '460px',
              maxWidth: '94vw',
              boxShadow: '0 16px 48px rgba(34,42,48,0.22)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                marginBottom: '18px',
              }}
            >
              Add SKU to Master Index
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>CODE *</label>
                <input
                  style={{
                    ...inputStyle,
                    fontFamily: "'IBM Plex Mono', monospace",
                    textTransform: 'uppercase',
                  }}
                  placeholder="AHI-A+"
                  value={skuForm.code}
                  onChange={(e) => setSkuForm((f) => ({ ...f, code: e.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>SPECIES *</label>
                <input
                  style={inputStyle}
                  placeholder="Ahi Tuna"
                  value={skuForm.species}
                  onChange={(e) => setSkuForm((f) => ({ ...f, species: e.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>GRADE</label>
                <input
                  style={inputStyle}
                  placeholder="A+"
                  value={skuForm.grade}
                  onChange={(e) => setSkuForm((f) => ({ ...f, grade: e.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>PACK TYPE</label>
                <input
                  style={inputStyle}
                  placeholder="Box"
                  value={skuForm.pack_type}
                  onChange={(e) => setSkuForm((f) => ({ ...f, pack_type: e.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>UOM</label>
                <select
                  style={inputStyle}
                  value={skuForm.uom}
                  onChange={(e) => setSkuForm((f) => ({ ...f, uom: e.target.value }))}
                >
                  <option value="lb">lb</option>
                  <option value="kg">kg</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>QBO ITEM NAME</label>
                <input
                  style={inputStyle}
                  placeholder="Ahi Tuna – Grade A+"
                  value={skuForm.qbo_item}
                  onChange={(e) => setSkuForm((f) => ({ ...f, qbo_item: e.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>BASE PRICE $/LB</label>
                <input
                  style={{ ...inputStyle, fontFamily: "'IBM Plex Mono', monospace" }}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="24.50"
                  value={skuForm.base_price_lb}
                  onChange={(e) => setSkuForm((f) => ({ ...f, base_price_lb: e.target.value }))}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>DESCRIPTION</label>
                <textarea
                  style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                  placeholder="Sashimi-grade loins, premium — notes the sales team should see"
                  value={skuForm.description}
                  onChange={(e) => setSkuForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>

            {/* live tier price preview from the base price */}
            {parseFloat(skuForm.base_price_lb) > 0 && tiers.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  marginTop: '14px',
                  background: '#F4F5F6',
                  border: '1px solid #E2E6E9',
                  borderRadius: '6px',
                  padding: '11px 13px',
                }}
              >
                {tiers.map((t) => (
                  <div key={t.tier} style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        color: '#8A99A3',
                      }}
                    >
                      {t.tier} · {t.base_multiplier.toFixed(2)}×
                    </div>
                    <div
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '14px',
                        fontWeight: 600,
                        marginTop: '3px',
                      }}
                    >
                      $
                      {(
                        Math.round(parseFloat(skuForm.base_price_lb) * t.base_multiplier * 100) /
                        100
                      ).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {skuError && (
              <div
                style={{
                  marginTop: '14px',
                  background: '#FBF0EF',
                  border: '1px solid #E3B6B1',
                  borderRadius: '5px',
                  padding: '10px 13px',
                  fontSize: '12px',
                  color: '#A5362C',
                }}
              >
                {skuError}
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '22px',
              }}
            >
              <button
                onClick={() => setSkuModal(false)}
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
                onClick={saveSku}
                disabled={savingSku || !skuForm.code || !skuForm.species}
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: '13px',
                  fontWeight: 600,
                  background:
                    savingSku || !skuForm.code || !skuForm.species ? '#8A99A3' : '#222A30',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '10px 18px',
                  cursor:
                    savingSku || !skuForm.code || !skuForm.species ? 'not-allowed' : 'pointer',
                }}
              >
                {savingSku ? 'Saving…' : 'Add SKU'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT TIER MODAL — writes to pricing_tiers table */}
      {tierModal && (
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
          onClick={() => setTierModal(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '10px',
              padding: '26px',
              width: '520px',
              maxWidth: '94vw',
              maxHeight: '86vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 16px 48px rgba(34,42,48,0.22)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                marginBottom: '4px',
              }}
            >
              Edit {tierModal.label}
            </div>
            <div style={{ fontSize: '12px', color: '#8A99A3', marginBottom: '18px' }}>
              Changes apply to every customer on {tierModal.tier} at the next order.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>PAYMENT TERMS</label>
                <input
                  style={inputStyle}
                  placeholder="Net 15"
                  value={tierModal.terms}
                  onChange={(e) => setTierModal((m) => (m ? { ...m, terms: e.target.value } : m))}
                />
              </div>
              <div>
                <label style={labelStyle}>DEFAULT MULTIPLIER (fallback)</label>
                <input
                  style={{ ...inputStyle, fontFamily: "'IBM Plex Mono', monospace" }}
                  type="number"
                  step="0.01"
                  min="0"
                  value={tierModal.mult}
                  onChange={(e) => setTierModal((m) => (m ? { ...m, mult: e.target.value } : m))}
                />
              </div>
            </div>

            {/* SPECIES PRICES for this tier — every species has its own price */}
            <div
              style={{ marginTop: '18px', minHeight: 0, display: 'flex', flexDirection: 'column' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                }}
              >
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  SPECIES PRICES · $/LB ON {tierModal.tier}
                </label>
                <button
                  onClick={() =>
                    setTierModal((m) => {
                      if (!m) return m;
                      const mult = parseFloat(m.mult) || 1;
                      const next = { ...m.prices };
                      skus
                        .filter((s) => s.active && s.base_price_lb != null)
                        .forEach((s) => {
                          next[s.code] = (
                            Math.round((s.base_price_lb as number) * mult * 100) / 100
                          ).toFixed(2);
                        });
                      return { ...m, prices: next };
                    })
                  }
                  title="Refill every species from base price × the multiplier above"
                  style={{
                    fontFamily: "'Archivo', sans-serif",
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#3F6F86',
                    background: '#EEF3F6',
                    border: '1px solid #C5D8E2',
                    borderRadius: '4px',
                    padding: '4px 9px',
                    cursor: 'pointer',
                  }}
                >
                  Fill from multiplier
                </button>
              </div>

              <div
                style={{
                  overflowY: 'auto',
                  border: '1px solid #E2E6E9',
                  borderRadius: '6px',
                }}
              >
                {skus.filter((s) => s.active).length === 0 && (
                  <div style={{ padding: '16px', fontSize: '12px', color: '#8A99A3' }}>
                    No active species yet — add them in SKU Master first.
                  </div>
                )}
                {skus
                  .filter((s) => s.active)
                  .map((s, i) => {
                    const auto =
                      s.base_price_lb != null
                        ? Math.round(s.base_price_lb * (parseFloat(tierModal.mult) || 1) * 100) /
                          100
                        : null;
                    return (
                      <div
                        key={s.code}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 110px',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '9px 12px',
                          borderBottom: '1px solid #EDEFF1',
                          background: i % 2 === 0 ? '#fff' : '#FAFBFB',
                        }}
                      >
                        <span style={{ minWidth: 0 }}>
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>
                            {s.species}
                            {s.grade ? ` · ${s.grade}` : ''}
                          </span>
                          <span
                            style={{
                              display: 'block',
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '10px',
                              color: '#8A99A3',
                              marginTop: '1px',
                            }}
                          >
                            {s.code}
                            {auto != null ? ` · auto $${auto.toFixed(2)}` : ' · no base price'}
                          </span>
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={auto != null ? auto.toFixed(2) : '0.00'}
                          value={tierModal.prices[s.code] ?? ''}
                          onChange={(e) =>
                            setTierModal((m) =>
                              m ? { ...m, prices: { ...m.prices, [s.code]: e.target.value } } : m
                            )
                          }
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '13px',
                            fontWeight: 600,
                            padding: '7px 9px',
                            border: '1px solid #D6DCE0',
                            borderRadius: '5px',
                            outline: 'none',
                            textAlign: 'right',
                            background: '#fff',
                          }}
                        />
                      </div>
                    );
                  })}
              </div>
              <div style={{ fontSize: '11px', color: '#8A99A3', marginTop: '8px' }}>
                Each species keeps its own price on this tier. Clear a field to fall back to base ×
                multiplier.
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '18px',
                flex: 'none',
              }}
            >
              <button
                onClick={() => setTierModal(null)}
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
                onClick={saveTier}
                disabled={savingTier}
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: '13px',
                  fontWeight: 600,
                  background: savingTier ? '#8A99A3' : '#222A30',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '10px 18px',
                  cursor: savingTier ? 'not-allowed' : 'pointer',
                }}
              >
                {savingTier ? 'Saving…' : 'Save tier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GENERIC EDITOR MODAL */}
      {editor.open && (
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
          onClick={closeEditor}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '10px',
              padding: '26px',
              width: '440px',
              maxWidth: '94vw',
              boxShadow: '0 16px 48px rgba(34,42,48,0.22)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                marginBottom: '6px',
              }}
            >
              {editor.title}
            </div>
            <div
              style={{ fontSize: '13px', color: '#5A6670', marginBottom: '20px', lineHeight: 1.5 }}
            >
              {editor.subtitle}
            </div>
            <div
              style={{
                background: '#F4F5F6',
                border: '1px dashed #D6DCE0',
                borderRadius: '6px',
                padding: '16px',
                fontSize: '12px',
                color: '#8A99A3',
                textAlign: 'center',
              }}
            >
              Configuration form — wired to backend in a later slice.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '22px' }}>
              <button
                onClick={closeEditor}
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
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
