// Read queries — the single Supabase access point for reads.
// All return { data, error } untouched so callers decide how to surface errors.
import { createClient } from '../supabase/client';
import type { LotTree } from './types';

const supabase = () => createClient();

/** Lots with nested boxes and contents, newest first. Optionally filter by location. */
export async function fetchLots(location?: string) {
  let q = supabase()
    .from('lots')
    .select('*, boxes(*, box_contents(*))')
    .order('created_at', { ascending: false });
  if (location) q = q.eq('location', location);
  const { data, error } = await q;
  return { data: (data ?? []) as LotTree[], error };
}

/** Orders with per-line fulfillment (the board's left column). */
export async function fetchOrderFulfillment(location?: string) {
  let q = supabase().from('orders_with_fulfillment').select('*');
  if (location) q = q.eq('location', location);
  return q;
}

/** Species lines with live fulfilled weight (81/90 per species). */
export async function fetchOrderLines(orderId?: string) {
  let q = supabase().from('order_lines_with_fulfillment').select('*');
  if (orderId) q = q.eq('order_id', orderId);
  return q;
}

/** Live available / allocated / incoming lb per species. */
export async function fetchAvailability(location?: string) {
  let q = supabase().from('availability_by_species').select('*');
  if (location) q = q.eq('location', location);
  return q;
}

export async function fetchCustomers() {
  return supabase()
    .from('customers')
    .select('*, price_overrides(*), standing_orders(*)')
    .order('name');
}

export async function fetchSkus() {
  return supabase().from('skus').select('*').order('code');
}

export async function fetchPricingTiers() {
  return supabase().from('pricing_tiers').select('*').order('tier');
}

export async function fetchVendors() {
  return supabase()
    .from('vendors')
    .select('*, vendor_mappings(*), vendor_species_codes(*)')
    .order('name');
}

export async function fetchInvoices() {
  return supabase()
    .from('invoices')
    .select('*, customers(name), orders(code)')
    .order('created_at', { ascending: false });
}

export async function fetchPickSlips() {
  return supabase()
    .from('pick_slips')
    .select('*, orders(code, customer_id, customers(name))')
    .order('generated_at', { ascending: false });
}

export async function fetchNotifications(userId: string) {
  return supabase()
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
}
