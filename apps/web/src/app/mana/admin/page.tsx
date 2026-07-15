'use client';

import { useState, useEffect } from 'react';
import Nav from '../components/Nav';
import { createClient } from '@/lib/supabase/client';
import { PAGE_REGISTRY } from '@/lib/access';
import type { Database } from '@/lib/database.types';

// Roles can be added at runtime (extends the enum), so the generated enum type
// is a subset. Cast writes through this alias where a role string is stored.
type RoleValue = Database['public']['Enums']['user_role'];

type AdminTab = 'users' | 'sku' | 'pricing' | 'access' | 'mappings' | 'integrations';

interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
  location: string | null;
  status: 'active' | 'invited' | 'inactive';
  last_seen: string | null;
}

interface RoleDef {
  key: string;
  label: string;
  description: string | null;
  color: string;
  bg: string;
  is_system: boolean;
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

// Fallback used until the roles table loads (and if it's empty). Mirrors the
// seed in 20260710100001_roles.sql so the UI looks identical either way.
const DEFAULT_ROLES: RoleDef[] = [
  {
    key: 'admin',
    label: 'Admin',
    description: 'Full access · manage users, settings, integrations',
    color: '#2D5365',
    bg: '#EEF3F6',
    is_system: true,
  },
  {
    key: 'operations',
    label: 'Operations',
    description: 'Inventory, allocation, receiving, pick slips',
    color: '#2E6347',
    bg: '#EAF1ED',
    is_system: true,
  },
  {
    key: 'finance',
    label: 'Finance',
    description: 'Finance queue, credits, vendor reconciliation',
    color: '#8A5A14',
    bg: '#F4EEE2',
    is_system: true,
  },
  {
    key: 'sales',
    label: 'Sales',
    description: 'Order intake, customer management',
    color: '#5A3E6B',
    bg: '#F0ECF6',
    is_system: true,
  },
  {
    key: 'logistics',
    label: 'Logistics',
    description: 'Pick slips, shipments, BOL workflow',
    color: '#5A6670',
    bg: '#EEF0F2',
    is_system: true,
  },
  {
    key: 'viewer',
    label: 'Viewer',
    description: 'Read-only access to all modules',
    color: '#8A99A3',
    bg: '#F4F5F6',
    is_system: true,
  },
];

// A palette offered when creating a custom role.
const ROLE_PALETTE = [
  { color: '#2D5365', bg: '#EEF3F6' },
  { color: '#2E6347', bg: '#EAF1ED' },
  { color: '#8A5A14', bg: '#F4EEE2' },
  { color: '#5A3E6B', bg: '#F0ECF6' },
  { color: '#A5362C', bg: '#FBF0EF' },
  { color: '#5A6670', bg: '#EEF0F2' },
];

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

  // Owner (CEO) — the only user who can assign roles or edit page access.
  const [isOwner, setIsOwner] = useState(false);

  // Page access matrix: role -> set of allowed page keys.
  const [pageAccess, setPageAccess] = useState<Record<string, Set<string>>>({});
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState('');

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
    role: 'viewer' as string,
    location: '',
  });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  // credentials shown once after a user is created (email + generated password)
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(
    null
  );
  const [copied, setCopied] = useState<string | null>(null);

  // Roles registry (DB-backed; falls back to the 6 built-ins until it loads)
  const [roleDefs, setRoleDefs] = useState<RoleDef[]>(DEFAULT_ROLES);
  // 'customer' and 'vendor' are registered here only so their portal accounts
  // get a label/color in the Users list — they're external accounts created
  // via self-signup, never assignable from the staff role picker.
  const ROLES = roleDefs.map((r) => r.key).filter((k) => k !== 'customer' && k !== 'vendor');
  const roleMeta = (r: string) => {
    const found = roleDefs.find((d) => d.key === r);
    return (
      found ?? {
        key: r,
        label: r ? r[0].toUpperCase() + r.slice(1) : r,
        description: null,
        color: '#5A6670',
        bg: '#EEF0F2',
        is_system: false,
      }
    );
  };
  const [roleModal, setRoleModal] = useState<{
    label: string;
    description: string;
    paletteIdx: number;
  } | null>(null);
  const [savingRoleDef, setSavingRoleDef] = useState(false);
  const [roleDefError, setRoleDefError] = useState('');

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

  // Real editors: SKU add/edit + tier edit write to Supabase
  const EMPTY_SKU = {
    code: '',
    species: '',
    grade: '',
    pack_type: 'Box',
    uom: 'lb',
    qbo_item: '',
    base_price_lb: '',
    description: '',
    active: true,
  };
  const [skuModal, setSkuModal] = useState(false);
  // null = adding a new SKU; a code = editing that existing SKU
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [skuForm, setSkuForm] = useState(EMPTY_SKU);
  const [savingSku, setSavingSku] = useState(false);
  const [skuError, setSkuError] = useState('');

  const openAddSku = () => {
    setEditingSku(null);
    setSkuForm(EMPTY_SKU);
    setSkuError('');
    setSkuModal(true);
  };

  const openEditSku = (s: SKU) => {
    setEditingSku(s.code);
    setSkuForm({
      code: s.code,
      species: s.species,
      grade: s.grade ?? '',
      pack_type: s.pack_type ?? '',
      uom: s.uom ?? 'lb',
      qbo_item: s.qbo_item ?? '',
      base_price_lb: s.base_price_lb != null ? String(s.base_price_lb) : '',
      description: s.description ?? '',
      active: s.active,
    });
    setSkuError('');
    setSkuModal(true);
  };
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
    // Common columns for both insert and update (code is immutable — it's the PK
    // and other tables reference it).
    const fields = {
      species: skuForm.species,
      grade: skuForm.grade || null,
      pack_type: skuForm.pack_type || null,
      uom: skuForm.uom || 'lb',
      qbo_item: skuForm.qbo_item || null,
      base_price_lb: priceNum > 0 ? Math.round(priceNum * 100) / 100 : null,
      description: skuForm.description.trim() || null,
      active: skuForm.active,
    };
    const { error } = editingSku
      ? await supabase.from('skus').update(fields).eq('code', editingSku)
      : await supabase.from('skus').insert({ code: skuForm.code.toUpperCase(), ...fields });
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
    setEditingSku(null);
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
    fetchRoles();
    fetchSkus();
    fetchTiers();
    fetchOwnerAndAccess();
    fetchTierPrices();
  }, []);

  async function fetchUsers() {
    setUsersLoading(true);
    // Staff only — customer/vendor portal accounts live in this same table
    // but are managed via their own signup flows, not the staff roster.
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .not('role', 'in', '(customer,vendor)')
      .order('created_at');
    setUsers((data as Profile[]) ?? []);
    setUsersLoading(false);
  }

  async function fetchOwnerAndAccess() {
    setAccessLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: me } = await supabase
        .from('profiles')
        .select('is_owner')
        .eq('id', user.id)
        .maybeSingle();
      setIsOwner(!!me?.is_owner);
    }
    const { data: rows } = await supabase.from('role_page_access').select('role, page_key');
    const map: Record<string, Set<string>> = {};
    (rows ?? []).forEach((r) => {
      (map[r.role] ??= new Set()).add(r.page_key);
    });
    setPageAccess(map);
    setAccessLoading(false);
  }

  // Owner-only: grant/revoke one page for one role. Optimistic, reverts on error.
  const toggleAccess = async (role: string, pageKey: string) => {
    if (!isOwner) return;
    setAccessError('');
    const has = pageAccess[role]?.has(pageKey) ?? false;
    setPageAccess((prev) => {
      const next = { ...prev, [role]: new Set(prev[role] ?? []) };
      if (has) next[role].delete(pageKey);
      else next[role].add(pageKey);
      return next;
    });
    const { error } = has
      ? await supabase.from('role_page_access').delete().eq('role', role).eq('page_key', pageKey)
      : await supabase.from('role_page_access').insert({ role, page_key: pageKey });
    if (error) {
      setAccessError(error.message);
      setPageAccess((prev) => {
        const next = { ...prev, [role]: new Set(prev[role] ?? []) };
        if (has) next[role].add(pageKey);
        else next[role].delete(pageKey);
        return next;
      });
    }
  };

  async function fetchRoles() {
    const { data } = await supabase.from('roles').select('*').order('sort');
    if (data && data.length > 0) setRoleDefs(data as RoleDef[]);
  }

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  const saveRoleDef = async () => {
    if (!roleModal || !roleModal.label.trim()) return;
    setSavingRoleDef(true);
    setRoleDefError('');
    const pal = ROLE_PALETTE[roleModal.paletteIdx] ?? ROLE_PALETTE[0];
    const { error } = await supabase.rpc('add_role', {
      p_key: roleModal.label,
      p_label: roleModal.label.trim(),
      p_description: roleModal.description.trim() || undefined,
      p_color: pal.color,
      p_bg: pal.bg,
    });
    setSavingRoleDef(false);
    if (error) {
      setRoleDefError(error.message);
      return;
    }
    setRoleModal(null);
    fetchRoles();
  };

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
    await supabase
      .from('profiles')
      .update({ role: selectedRole as RoleValue })
      .eq('id', assignModal.userId);
    setUsers((prev) =>
      prev.map((u) => (u.id === assignModal.userId ? { ...u, role: selectedRole } : u))
    );
    setSavingRole(false);
    setAssignModal({ open: false, userId: null });
  };

  const sendInvite = async () => {
    if (!inviteForm.name || !inviteForm.email) return;
    setInviting(true);
    setInviteError('');
    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Non-owners always create viewers; the owner assigns the real role.
      body: JSON.stringify({ ...inviteForm, role: isOwner ? inviteForm.role : 'viewer' }),
    });
    const body = await res.json().catch(() => ({}));
    setInviting(false);
    if (res.ok && body.password) {
      // Show the generated credentials once; the admin copies + hands them over.
      setCreatedCreds({ email: body.email, password: body.password });
      fetchUsers();
    } else {
      setInviteError(body.error || 'Could not create the user.');
    }
  };

  const closeInviteDrawer = () => {
    setInviteDrawer(false);
    setCreatedCreds(null);
    setInviteError('');
    setInviteForm({ name: '', email: '', role: 'viewer', location: '' });
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
                  ...(isOwner ? [['access', 'Page access'] as [AdminTab, string]] : []),
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isOwner && (
                <button
                  onClick={() => {
                    setRoleDefError('');
                    setRoleModal({ label: '', description: '', paletteIdx: 0 });
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    fontFamily: "'Archivo', sans-serif",
                    fontSize: '13px',
                    fontWeight: 600,
                    background: '#fff',
                    color: '#3F6F86',
                    border: '1px solid #C5D8E2',
                    borderRadius: '5px',
                    padding: '9px 14px',
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
                  Add role
                </button>
              )}
              <button
                onClick={() => {
                  setCreatedCreds(null);
                  setInviteError('');
                  setInviteDrawer(true);
                }}
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
                Add user
              </button>
            </div>
          )}
          {tab === 'sku' && (
            <button
              onClick={openAddSku}
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

              {/* ROLES IN THE SYSTEM — the assignable set; add via "Add role" */}
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #E2E6E9',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: '#8A99A3',
                    }}
                  >
                    ROLES IN THE SYSTEM
                  </span>
                  <span style={{ fontSize: '11px', color: '#8A99A3' }}>
                    {roleDefs.length} roles · used in Assign role &amp; Add user
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {roleDefs.map((r) => (
                    <span
                      key={r.key}
                      title={r.description || undefined}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: r.color,
                        background: r.bg,
                        borderRadius: '4px',
                        padding: '5px 11px',
                      }}
                    >
                      {r.label}
                      {!r.is_system && (
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            color: '#8A99A3',
                          }}
                        >
                          CUSTOM
                        </span>
                      )}
                    </span>
                  ))}
                  {isOwner && (
                    <button
                      onClick={() => {
                        setRoleDefError('');
                        setRoleModal({ label: '', description: '', paletteIdx: 0 });
                      }}
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#8A99A3',
                        background: 'none',
                        border: '1px dashed #D6DCE0',
                        borderRadius: '4px',
                        padding: '5px 11px',
                        cursor: 'pointer',
                      }}
                    >
                      + Add role
                    </button>
                  )}
                </div>
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
                          {isOwner ? (
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
                          ) : (
                            <span
                              title="Only the owner can assign roles"
                              style={{ fontSize: '11px', color: '#8A99A3' }}
                            >
                              Owner only
                            </span>
                          )}
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
                    gridTemplateColumns: '110px 1fr 70px 90px 60px 1fr 80px 70px',
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
                  <span style={{ textAlign: 'right' }}>ACTION</span>
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
                        gridTemplateColumns: '110px 1fr 70px 90px 60px 1fr 80px 70px',
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
                      <span style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => openEditSku(s)}
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
                          Edit
                        </button>
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

          {/* PAGE ACCESS TAB — owner-only matrix of what each role can see */}
          {tab === 'access' && isOwner && (
            <div style={{ maxWidth: '1100px' }}>
              <div style={{ marginBottom: '14px', fontSize: '13px', color: '#5A6670' }}>
                Choose which pages each role can see. Changes apply the next time that person loads
                a page. You (the owner) always see everything.
              </div>
              {accessError && (
                <div
                  style={{
                    marginBottom: '12px',
                    background: '#FBF0EF',
                    border: '1px solid #E3B6B1',
                    borderRadius: '5px',
                    padding: '9px 13px',
                    fontSize: '12px',
                    color: '#A5362C',
                  }}
                >
                  {accessError}
                </div>
              )}
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #E2E6E9',
                  borderRadius: '8px',
                  overflow: 'auto',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `220px repeat(${roleDefs.filter((r) => !['customer', 'vendor'].includes(r.key)).length}, 1fr)`,
                    padding: '11px 18px',
                    background: '#FAFBFB',
                    borderBottom: '1px solid #E2E6E9',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    color: '#8A99A3',
                    gap: '8px',
                  }}
                >
                  <span>PAGE</span>
                  {roleDefs
                    .filter((r) => !['customer', 'vendor'].includes(r.key))
                    .map((r) => (
                      <span key={r.key} style={{ textAlign: 'center', color: r.color }}>
                        {r.label.toUpperCase()}
                      </span>
                    ))}
                </div>
                {accessLoading ? (
                  <div style={{ padding: '22px 18px', fontSize: '13px', color: '#8A99A3' }}>
                    Loading…
                  </div>
                ) : (
                  (['OPERATIONS', 'FINANCE', 'OVERVIEW', 'SYSTEM'] as const).map((group) => (
                    <div key={group}>
                      <div
                        style={{
                          padding: '9px 18px 5px',
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '9px',
                          letterSpacing: '0.14em',
                          color: '#8A99A3',
                          background: '#FAFBFB',
                          borderBottom: '1px solid #EDEFF1',
                        }}
                      >
                        {group}
                      </div>
                      {PAGE_REGISTRY.filter((p) => p.group === group).map((p) => (
                        <div
                          key={p.key}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: `220px repeat(${roleDefs.filter((r) => !['customer', 'vendor'].includes(r.key)).length}, 1fr)`,
                            alignItems: 'center',
                            padding: '9px 18px',
                            borderBottom: '1px solid #EDEFF1',
                            gap: '8px',
                          }}
                        >
                          <span style={{ fontSize: '13px', fontWeight: 500 }}>{p.label}</span>
                          {roleDefs
                            .filter((r) => !['customer', 'vendor'].includes(r.key))
                            .map((r) => {
                              const on = pageAccess[r.key]?.has(p.key) ?? false;
                              return (
                                <span key={r.key} style={{ textAlign: 'center' }}>
                                  <button
                                    onClick={() => toggleAccess(r.key, p.key)}
                                    title={`${r.label} · ${p.label}`}
                                    style={{
                                      width: '20px',
                                      height: '20px',
                                      borderRadius: '4px',
                                      border: on ? 'none' : '1.5px solid #D6DCE0',
                                      background: on ? '#3F6F86' : '#fff',
                                      color: '#fff',
                                      fontSize: '12px',
                                      lineHeight: 1,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    {on ? '✓' : ''}
                                  </button>
                                </span>
                              );
                            })}
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
              <div
                style={{ fontSize: '11px', color: '#8A99A3', marginTop: '10px', lineHeight: 1.5 }}
              >
                Settings stays available to everyone (people manage their own account there). A role
                with no pages ticked falls back to full access until you configure it.
              </div>
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
                        {m.description}
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

      {/* ADD USER DRAWER — creates the account + generates a first password */}
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
          onClick={closeInviteDrawer}
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
                  {createdCreds ? 'User created' : 'Add user'}
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '12px',
                    color: '#8A99A3',
                    marginTop: '3px',
                  }}
                >
                  {createdCreds
                    ? 'Copy the password and share it securely'
                    : 'A password is generated automatically'}
                </div>
              </div>
              <button
                onClick={closeInviteDrawer}
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

            {createdCreds ? (
              /* SUCCESS — show credentials once, with copy buttons */
              <>
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
                  <div
                    style={{
                      background: '#EAF1ED',
                      border: '1px solid #B4D2C0',
                      borderRadius: '6px',
                      padding: '12px 14px',
                      fontSize: '12px',
                      color: '#2E6347',
                      lineHeight: 1.5,
                    }}
                  >
                    Account is active. Give these credentials to the user — they can sign in now and
                    change the password under <strong>Settings</strong>. This password won&apos;t be
                    shown again.
                  </div>

                  {(
                    [
                      ['EMAIL', createdCreds.email, 'email'],
                      ['TEMPORARY PASSWORD', createdCreds.password, 'password'],
                    ] as [string, string, string][]
                  ).map(([label, value, key]) => (
                    <div key={key}>
                      <label style={labelStyle}>{label}</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div
                          style={{
                            ...inputStyle,
                            fontFamily: "'IBM Plex Mono', monospace",
                            display: 'flex',
                            alignItems: 'center',
                            userSelect: 'all',
                          }}
                        >
                          {value}
                        </div>
                        <button
                          onClick={() => copyText(value, key)}
                          style={{
                            fontFamily: "'Archivo', sans-serif",
                            fontSize: '12px',
                            fontWeight: 600,
                            background: copied === key ? '#2E6347' : '#fff',
                            color: copied === key ? '#fff' : '#3F6F86',
                            border: `1px solid ${copied === key ? '#2E6347' : '#C5D8E2'}`,
                            borderRadius: '5px',
                            padding: '0 14px',
                            cursor: 'pointer',
                            flex: 'none',
                          }}
                        >
                          {copied === key ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() =>
                      copyText(
                        `Email: ${createdCreds.email}\nPassword: ${createdCreds.password}`,
                        'both'
                      )
                    }
                    style={{
                      fontFamily: "'Archivo', sans-serif",
                      fontSize: '12px',
                      fontWeight: 600,
                      background: copied === 'both' ? '#2E6347' : '#EEF3F6',
                      color: copied === 'both' ? '#fff' : '#3F6F86',
                      border: `1px solid ${copied === 'both' ? '#2E6347' : '#C5D8E2'}`,
                      borderRadius: '5px',
                      padding: '9px 14px',
                      cursor: 'pointer',
                    }}
                  >
                    {copied === 'both' ? 'Copied both' : 'Copy email + password'}
                  </button>
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
                    onClick={() => {
                      setCreatedCreds(null);
                      setInviteError('');
                      setInviteForm({ name: '', email: '', role: 'viewer', location: '' });
                    }}
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
                    Add another
                  </button>
                  <button
                    onClick={closeInviteDrawer}
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
                    Done
                  </button>
                </div>
              </>
            ) : (
              /* FORM */
              <>
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
                    {isOwner ? (
                      <select
                        style={inputStyle}
                        value={inviteForm.role}
                        onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value }))}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {roleMeta(r).label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div
                        style={{
                          ...inputStyle,
                          background: '#F4F5F6',
                          color: '#8A99A3',
                          cursor: 'default',
                        }}
                      >
                        Viewer — the owner assigns the final role
                      </div>
                    )}
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
                  {inviteError && (
                    <div
                      style={{
                        background: '#FBF0EF',
                        border: '1px solid #E3B6B1',
                        borderRadius: '5px',
                        padding: '10px 13px',
                        fontSize: '12px',
                        color: '#A5362C',
                      }}
                    >
                      {inviteError}
                    </div>
                  )}
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
                    onClick={closeInviteDrawer}
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
                    disabled={inviting || !inviteForm.name || !inviteForm.email}
                    style={{
                      fontFamily: "'Archivo', sans-serif",
                      fontSize: '13px',
                      fontWeight: 600,
                      background:
                        inviting || !inviteForm.name || !inviteForm.email ? '#8A99A3' : '#222A30',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '5px',
                      padding: '10px 18px',
                      cursor:
                        inviting || !inviteForm.name || !inviteForm.email
                          ? 'not-allowed'
                          : 'pointer',
                    }}
                  >
                    {inviting ? 'Creating…' : 'Create user'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ADD ROLE MODAL — calls add_role() RPC (extends the enum + registry) */}
      {roleModal && (
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
          onClick={() => setRoleModal(null)}
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
            <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              Add role
            </div>
            <div style={{ fontSize: '12px', color: '#8A99A3', margin: '4px 0 18px' }}>
              A new role becomes selectable when assigning roles and adding users.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>ROLE NAME *</label>
                <input
                  autoFocus
                  style={inputStyle}
                  placeholder="e.g. Warehouse Lead"
                  value={roleModal.label}
                  onChange={(e) => setRoleModal((m) => (m ? { ...m, label: e.target.value } : m))}
                />
                {roleModal.label.trim() && (
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '11px',
                      color: '#8A99A3',
                      marginTop: '5px',
                    }}
                  >
                    key:{' '}
                    {roleModal.label
                      .trim()
                      .toLowerCase()
                      .replace(/[^a-z0-9_]+/g, '_')}
                  </div>
                )}
              </div>
              <div>
                <label style={labelStyle}>DESCRIPTION</label>
                <input
                  style={inputStyle}
                  placeholder="What this role can do"
                  value={roleModal.description}
                  onChange={(e) =>
                    setRoleModal((m) => (m ? { ...m, description: e.target.value } : m))
                  }
                />
              </div>
              <div>
                <label style={labelStyle}>COLOR</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {ROLE_PALETTE.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setRoleModal((m) => (m ? { ...m, paletteIdx: i } : m))}
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '6px',
                        background: p.bg,
                        border:
                          roleModal.paletteIdx === i ? `2px solid ${p.color}` : '1px solid #E2E6E9',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: p.color,
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {roleDefError && (
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
                {roleDefError}
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
                onClick={() => setRoleModal(null)}
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
                onClick={saveRoleDef}
                disabled={savingRoleDef || !roleModal.label.trim()}
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: '13px',
                  fontWeight: 600,
                  background: savingRoleDef || !roleModal.label.trim() ? '#8A99A3' : '#222A30',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '10px 18px',
                  cursor: savingRoleDef || !roleModal.label.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {savingRoleDef ? 'Adding…' : 'Add role'}
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
              {editingSku ? `Edit ${editingSku}` : 'Add SKU to Master Index'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>CODE *</label>
                <input
                  style={{
                    ...inputStyle,
                    fontFamily: "'IBM Plex Mono', monospace",
                    textTransform: 'uppercase',
                    ...(editingSku
                      ? { background: '#F4F5F6', color: '#8A99A3', cursor: 'not-allowed' }
                      : {}),
                  }}
                  placeholder="AHI-A+"
                  value={skuForm.code}
                  disabled={!!editingSku}
                  title={editingSku ? 'Code is the identifier and cannot be changed' : undefined}
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
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>STATUS</label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '9px',
                    fontSize: '13px',
                    color: '#222A30',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={skuForm.active}
                    onChange={(e) => setSkuForm((f) => ({ ...f, active: e.target.checked }))}
                  />
                  Active — available for orders, pricing, and inventory
                </label>
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
                {savingSku ? 'Saving…' : editingSku ? 'Save changes' : 'Add SKU'}
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
