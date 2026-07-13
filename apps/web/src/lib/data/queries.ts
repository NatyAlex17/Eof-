// Read queries — the single Supabase access point for reads.
// All return { data, error } untouched so callers decide how to surface errors.
// Explicit return types are required for pnpm portability (TS2742) — see mutations.ts.
import { createClient } from '../supabase/client';
import type { PostgrestError } from '@supabase/supabase-js';
import type {
  LotTree,
  OrderFulfillment,
  OrderLineFulfillment,
  SpeciesAvailability,
  Customer,
  Sku,
  PricingTier,
  Vendor,
  Invoice,
  PickSlip,
  Notification,
} from './types';

const supabase = () => createClient();

type Read<T> = Promise<{ data: T | null; error: PostgrestError | null }>;

/** Lots with nested boxes and contents, newest first. Optionally filter by location. */
export async function fetchLots(
  location?: string
): Promise<{ data: LotTree[]; error: PostgrestError | null }> {
  let q = supabase()
    .from('lots')
    .select('*, vendors(name), boxes(*, box_contents(*))')
    .order('created_at', { ascending: false });
  if (location) q = q.eq('location', location);
  const { data, error } = await q;
  return { data: (data ?? []) as LotTree[], error };
}

/** Orders with per-line fulfillment (the board's left column). */
export async function fetchOrderFulfillment(location?: string): Read<OrderFulfillment[]> {
  let q = supabase().from('orders_with_fulfillment').select('*');
  if (location) q = q.eq('location', location);
  return q;
}

/** Species lines with live fulfilled weight (81/90 per species). */
export async function fetchOrderLines(orderId?: string): Read<OrderLineFulfillment[]> {
  let q = supabase().from('order_lines_with_fulfillment').select('*');
  if (orderId) q = q.eq('order_id', orderId);
  return q;
}

/** Live available / allocated / incoming lb per species. */
export async function fetchAvailability(location?: string): Read<SpeciesAvailability[]> {
  let q = supabase().from('availability_by_species').select('*');
  if (location) q = q.eq('location', location);
  return q;
}

export async function fetchCustomers(): Read<Customer[]> {
  return supabase()
    .from('customers')
    .select('*, price_overrides(*), standing_orders(*)')
    .order('name');
}

export async function fetchSkus(): Read<Sku[]> {
  return supabase().from('skus').select('*').order('code');
}

export async function fetchPricingTiers(): Read<PricingTier[]> {
  return supabase().from('pricing_tiers').select('*').order('tier');
}

export async function fetchVendors(): Read<Vendor[]> {
  return supabase()
    .from('vendors')
    .select('*, vendor_mappings(*), vendor_species_codes(*)')
    .order('name');
}

export async function fetchInvoices(): Read<Invoice[]> {
  return supabase()
    .from('invoices')
    .select('*, customers(name), orders(code)')
    .order('created_at', { ascending: false });
}

export async function fetchPickSlips(): Read<PickSlip[]> {
  return supabase()
    .from('pick_slips')
    .select('*, orders(code, customer_id, customers(name))')
    .order('generated_at', { ascending: false });
}

export async function fetchNotifications(userId: string): Read<Notification[]> {
  return supabase()
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
}
