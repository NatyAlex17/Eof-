// Write operations — every mutation the UI performs goes through here.
// Rules: NUMERIC weights round to 1 decimal; allocation is content-level;
// board locking goes through the lock_board / unlock_board RPCs only.
//
// Every exported function carries an explicit return type. This is required, not
// cosmetic: under pnpm's nested node_modules TypeScript can't name the inferred
// Supabase response types portably (error TS2742), so we annotate with our own
// portable row types + PostgrestError (imported from a direct dependency).
import { createClient } from '../supabase/client';
import type { Json } from '../database.types';
import type { PostgrestError } from '@supabase/supabase-js';
import type { BoxContent, Order, Customer, Lot } from './types';

const supabase = () => createClient();
const round1 = (n: number) => Math.round(n * 10) / 10;

type MutationError = PostgrestError | { message: string };
type Result<T> = Promise<{ data: T | null; error: MutationError | null }>;

// ---------------------------------------------------------------------------
// Allocation ("the dance")
// ---------------------------------------------------------------------------

/**
 * Assign (or unassign with null) a box-content portion to an order line.
 * The caller is responsible for matching species to the line — the UI enforces
 * it, and RLS restricts writers to admin/operations.
 */
export async function assignContent(
  contentId: string,
  orderLineId: string | null
): Result<BoxContent> {
  return supabase()
    .from('box_contents')
    .update({ assigned_order_line_id: orderLineId })
    .eq('id', contentId)
    .eq('locked', false) // never reassign locked fish
    .select()
    .single();
}

/**
 * Split a content portion into two pieces by weight.
 * Deletes the original row and inserts two rows sharing a split_group so a
 * merge can restore it. Piece weights always sum to the original (NUMERIC-safe).
 */
export async function splitContent(
  content: { id: string; box_id: string; species: string; grade: string | null; weight: number },
  weightA: number,
  orderLineA: string | null,
  orderLineB: string | null
): Result<BoxContent[]> {
  const sb = supabase();
  const wA = round1(Math.min(Math.max(weightA, 0.1), content.weight - 0.1));
  const wB = round1(content.weight - wA);
  const group = crypto.randomUUID();

  const { error: delErr } = await sb
    .from('box_contents')
    .delete()
    .eq('id', content.id)
    .eq('locked', false);
  if (delErr) return { data: null, error: delErr };

  return sb
    .from('box_contents')
    .insert([
      {
        box_id: content.box_id,
        species: content.species,
        grade: content.grade,
        weight: wA,
        assigned_order_line_id: orderLineA,
        split_group: group,
        part: 'A',
      },
      {
        box_id: content.box_id,
        species: content.species,
        grade: content.grade,
        weight: wB,
        assigned_order_line_id: orderLineB,
        split_group: group,
        part: 'B',
      },
    ])
    .select();
}

/** Merge a split group back into one unassigned portion. */
export async function mergeSplit(splitGroup: string): Result<BoxContent> {
  const sb = supabase();
  const { data: pieces, error } = await sb
    .from('box_contents')
    .select('*')
    .eq('split_group', splitGroup);
  if (error || !pieces || pieces.length === 0) return { data: null, error };
  if (pieces.some((p) => p.locked)) {
    return { data: null, error: { message: 'Cannot merge: a piece is locked' } };
  }

  const total = round1(pieces.reduce((s, p) => s + Number(p.weight), 0));
  const first = pieces[0];

  const { error: delErr } = await sb.from('box_contents').delete().eq('split_group', splitGroup);
  if (delErr) return { data: null, error: delErr };

  return sb
    .from('box_contents')
    .insert({
      box_id: first.box_id,
      species: first.species,
      grade: first.grade,
      weight: total,
      assigned_order_line_id: null,
    })
    .select()
    .single();
}

// ---------------------------------------------------------------------------
// Lock pipeline — RPCs only, never direct table writes
// ---------------------------------------------------------------------------

export async function lockBoard(location: string): Result<Json> {
  return supabase().rpc('lock_board', { p_location: location });
}

export async function unlockBoard(location: string): Result<Json> {
  return supabase().rpc('unlock_board', { p_location: location });
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

/** Create an order with its species lines. Returns the order row. */
export async function createOrder(
  order: {
    customer_id: string;
    code: string;
    carrier?: string | null;
    ship_date?: string | null;
    location?: string | null;
    color?: string | null;
  },
  lines: Array<{
    species: string;
    grade?: string | null;
    target_weight: number;
    unit_price?: number | null;
  }>
): Result<Order> {
  const sb = supabase();
  const { data: created, error } = await sb.from('orders').insert(order).select().single();
  if (error || !created) return { data: null, error };

  const { error: lineErr } = await sb
    .from('order_lines')
    .insert(lines.map((l) => ({ ...l, order_id: created.id })));
  if (lineErr) {
    // keep atomic-ish: remove the parent if lines failed
    await sb.from('orders').delete().eq('id', created.id);
    return { data: null, error: lineErr };
  }
  return { data: created, error: null };
}

/** Create a customer — the intake "NEW" path. Tier defaults to T2 if unset. */
export async function createCustomer(
  name: string,
  extras?: {
    email?: string;
    phone?: string;
    tier?: 'T1' | 'T2' | 'T3';
    location?: string | null;
    default_carrier?: string | null;
  }
): Result<Customer> {
  const { tier = 'T2', ...rest } = extras ?? {};
  return supabase()
    .from('customers')
    .insert({ name, tier, status: 'active', ...rest })
    .select()
    .single();
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

/** Insert a lot with boxes and per-species contents (import confirm / manual add). */
export async function createLot(
  lot: {
    lot_code: string;
    vendor_id?: string | null;
    location?: string | null;
    status?: 'incoming' | 'received';
  },
  boxes: Array<{
    label: string;
    idx: number;
    contents: Array<{ species: string; grade?: string | null; weight: number }>;
  }>
): Result<Lot> {
  const sb = supabase();
  const { data: createdLot, error } = await sb
    .from('lots')
    .insert({
      ...lot,
      status: lot.status ?? 'received',
      received_at: lot.status === 'incoming' ? null : new Date().toISOString(),
    })
    .select()
    .single();
  if (error || !createdLot) return { data: null, error };

  for (const b of boxes) {
    const { data: createdBox, error: boxErr } = await sb
      .from('boxes')
      .insert({ lot_id: createdLot.id, label: b.label, idx: b.idx })
      .select()
      .single();
    if (boxErr || !createdBox) return { data: null, error: boxErr };

    const { error: contentErr } = await sb.from('box_contents').insert(
      b.contents.map((c) => ({
        box_id: createdBox.id,
        species: c.species,
        grade: c.grade ?? null,
        weight: round1(c.weight),
      }))
    );
    if (contentErr) return { data: null, error: contentErr };
  }
  return { data: createdLot, error: null };
}

// ---------------------------------------------------------------------------
// Audit — call after any finance/inventory mutation that is not RPC-covered
// ---------------------------------------------------------------------------

export async function logAudit(
  action: string,
  entity: string,
  entityId: string,
  after?: Json
): Result<null> {
  return supabase()
    .from('audit_log')
    .insert({ action, entity, entity_id: entityId, after: after ?? null });
}
