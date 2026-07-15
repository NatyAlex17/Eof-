// Per-role page access for the staff (/mana) platform.
//
// The OWNER (CEO, profiles.is_owner) always sees everything and is the only
// one who can assign roles or edit this access map. Every other staff role —
// including admin — sees only the pages granted in role_page_access.
//
// Safety: a role with ZERO rows in role_page_access falls back to full access,
// so the app keeps working before the migration is run / seeded.
import { createClient } from './supabase/client';

export interface PageDef {
  key: string;
  label: string;
  href: string;
  group: 'OPERATIONS' | 'FINANCE' | 'OVERVIEW' | 'SYSTEM';
}

export const PAGE_REGISTRY: PageDef[] = [
  {
    key: 'allocation-board',
    label: 'Allocation Board',
    href: '/mana/allocation-board',
    group: 'OPERATIONS',
  },
  { key: 'order-intake', label: 'Order Intake', href: '/mana/order-intake', group: 'OPERATIONS' },
  { key: 'order-inbox', label: 'Order Inbox', href: '/mana/order-inbox', group: 'OPERATIONS' },
  { key: 'orders', label: 'Orders', href: '/mana/orders', group: 'OPERATIONS' },
  { key: 'inventory', label: 'Lots & Inventory', href: '/mana/inventory', group: 'OPERATIONS' },
  { key: 'customers', label: 'Customers', href: '/mana/customers', group: 'OPERATIONS' },
  { key: 'pick-slips', label: 'Pick Slips', href: '/mana/pick-slips', group: 'OPERATIONS' },
  { key: 'documents', label: 'Documents Inbox', href: '/mana/documents', group: 'OPERATIONS' },
  { key: 'price-sheet', label: 'Price Sheet', href: '/mana/price-sheet', group: 'FINANCE' },
  {
    key: 'purchase-orders',
    label: 'Purchase Orders',
    href: '/mana/purchase-orders',
    group: 'FINANCE',
  },
  { key: 'finance-queue', label: 'Finance Queue', href: '/mana/finance-queue', group: 'FINANCE' },
  { key: 'credits', label: 'Credits & Downgrades', href: '/mana/credits', group: 'FINANCE' },
  {
    key: 'vendor-reconciliation',
    label: 'Vendor Recon',
    href: '/mana/vendor-reconciliation',
    group: 'FINANCE',
  },
  {
    key: 'operations-dashboard',
    label: 'Operations',
    href: '/mana/operations-dashboard',
    group: 'OVERVIEW',
  },
  {
    key: 'finance-dashboard',
    label: 'Finance',
    href: '/mana/finance-dashboard',
    group: 'OVERVIEW',
  },
  { key: 'ceo-dashboard', label: 'Executive', href: '/mana/ceo-dashboard', group: 'OVERVIEW' },
  { key: 'notifications', label: 'Notifications', href: '/mana/notifications', group: 'SYSTEM' },
  {
    key: 'vendor-verification',
    label: 'Vendor Verification',
    href: '/mana/vendor-verification',
    group: 'SYSTEM',
  },
  { key: 'settings', label: 'Settings', href: '/mana/settings', group: 'SYSTEM' },
  { key: 'admin', label: 'Admin', href: '/mana/admin', group: 'SYSTEM' },
];

/** Map a /mana pathname to its page key (longest href prefix wins). */
export function pageKeyForPath(pathname: string): string | null {
  let best: PageDef | null = null;
  for (const p of PAGE_REGISTRY) {
    if (pathname === p.href || pathname.startsWith(p.href + '/')) {
      if (!best || p.href.length > best.href.length) best = p;
    }
  }
  return best?.key ?? null;
}

export interface Access {
  role: string;
  isOwner: boolean;
  /** Page keys this user can see. The owner gets every key. */
  allowed: Set<string>;
}

/** Load the signed-in staff user's role, owner flag, and allowed pages. */
export async function fetchAccess(): Promise<Access> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { role: 'viewer', isOwner: false, allowed: new Set() };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_owner')
    .eq('id', user.id)
    .maybeSingle();
  const role = (profile?.role as string) || 'viewer';
  const isOwner = !!profile?.is_owner;

  if (isOwner) {
    return { role, isOwner, allowed: new Set(PAGE_REGISTRY.map((p) => p.key)) };
  }

  const { data: rows } = await supabase
    .from('role_page_access')
    .select('page_key')
    .eq('role', role);

  // No rows for this role => table not seeded yet (or a brand-new role):
  // fall back to full access rather than locking the user out.
  if (!rows || rows.length === 0) {
    return { role, isOwner, allowed: new Set(PAGE_REGISTRY.map((p) => p.key)) };
  }

  const allowed = new Set(rows.map((r) => r.page_key));
  allowed.add('settings'); // everyone can manage their own account
  return { role, isOwner, allowed };
}
