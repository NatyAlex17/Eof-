'use client';

import { createClient } from '@/lib/supabase/client';

// Everything the portal pages need, already scoped to the signed-in customer by
// RLS. Pricing precedence matches Order Intake: customer override > tier-species
// price > base × tier multiplier.

export interface PortalSku {
  code: string;
  species: string;
  grade: string | null;
  basePrice: number;
}

export interface PortalCustomer {
  id: string;
  name: string;
  tier: string | null;
  location: string | null;
  carrier: string | null;
  contact: string | null;
  phone: string | null;
  address: string | null;
}

export interface Catalog {
  customer: PortalCustomer | null;
  // True once staff have assigned this customer a tier — pricing is only shown
  // to the customer after that. Never surface the tier value itself in the UI.
  hasPricing: boolean;
  mult: number;
  skus: PortalSku[];
  priceOf: (code: string) => number;
}

export async function loadCatalog(): Promise<Catalog> {
  const supabase = createClient();

  const [{ data: cust }, { data: skus }, { data: tiers }] = await Promise.all([
    supabase
      .from('customers')
      .select('id, name, tier, location, default_carrier, contact, phone, address')
      .maybeSingle(),
    supabase.from('skus').select('code, species, grade, base_price_lb, active').order('species'),
    supabase.from('pricing_tiers').select('tier, base_multiplier'),
  ]);

  const tier = cust?.tier ?? null;
  const hasPricing = !!tier;
  const mult = tier ? Number((tiers ?? []).find((t) => t.tier === tier)?.base_multiplier ?? 1) : 1;

  const [{ data: tsp }, { data: ov }] = await Promise.all([
    tier
      ? supabase.from('tier_species_prices').select('sku_code, price_lb').eq('tier', tier)
      : Promise.resolve({ data: [] as { sku_code: string; price_lb: number }[] }),
    supabase.from('price_overrides').select('sku, price'), // RLS returns only their own
  ]);

  const tspMap: Record<string, number> = {};
  (tsp ?? []).forEach((r: { sku_code: string; price_lb: number }) => {
    tspMap[r.sku_code] = Number(r.price_lb);
  });
  const ovMap: Record<string, number> = {};
  (ov ?? []).forEach((r: { sku: string; price: number }) => {
    ovMap[r.sku] = Number(r.price);
  });

  const list: PortalSku[] = (skus ?? [])
    .filter((s) => s.active)
    .map((s) => ({
      code: s.code,
      species: s.species,
      grade: s.grade,
      basePrice: Number(s.base_price_lb ?? 0),
    }));

  const priceOf = (code: string): number => {
    if (ovMap[code] != null) return ovMap[code];
    if (tspMap[code] != null) return tspMap[code];
    const sku = list.find((s) => s.code === code);
    return sku ? Math.round(sku.basePrice * mult * 100) / 100 : 0;
  };

  return {
    customer: cust
      ? {
          id: cust.id,
          name: cust.name,
          tier: cust.tier,
          location: cust.location,
          carrier: cust.default_carrier,
          contact: cust.contact,
          phone: cust.phone,
          address: cust.address,
        }
      : null,
    hasPricing,
    mult,
    skus: list,
    priceOf,
  };
}

export const money = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Shared status → colour chip metadata for the portal.
export function statusMeta(s: string): { label: string; color: string; bg: string } {
  switch (s) {
    case 'open':
      return { label: 'Received', color: '#8A5A14', bg: '#F4EEE2' };
    case 'allocated':
      return { label: 'Being prepared', color: '#2D5365', bg: '#EEF3F6' };
    case 'locked':
      return { label: 'Confirmed', color: '#2D5365', bg: '#EEF3F6' };
    case 'shipped':
      return { label: 'Shipped', color: '#2E6347', bg: '#EAF1ED' };
    case 'invoiced':
      return { label: 'Invoiced', color: '#2E6347', bg: '#EAF1ED' };
    default:
      return { label: s, color: '#5A6670', bg: '#EEF0F2' };
  }
}
