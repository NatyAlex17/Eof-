'use client';

import { createClient } from '@/lib/supabase/client';

// Shared helpers for the vendor portal. Every query here is scoped to the
// signed-in vendor by RLS — the portal never sees another vendor's data,
// and never sees sell prices, customers, or margin.

export interface VendorMe {
  id: string;
  name: string;
  code: string;
  contactEmail: string | null;
  terms: string | null;
  verificationStatus: string; // 'pending' | 'verified' | 'rejected'
  rejectionReason: string | null;
}

export async function loadVendor(): Promise<VendorMe | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('vendors')
    .select('id, name, code, contact_email, terms, verification_status, rejection_reason')
    .maybeSingle(); // RLS -> only their own row
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    code: data.code,
    contactEmail: data.contact_email,
    terms: data.terms,
    verificationStatus: data.verification_status,
    rejectionReason: data.rejection_reason,
  };
}

// Vendor verification status → visual chip metadata.
export function verificationMeta(s: string): {
  label: string;
  color: string;
  bg: string;
  dot: string;
} {
  switch (s) {
    case 'verified':
      return { label: 'Verified', color: '#2E6347', bg: '#EAF1ED', dot: '#3F7D5B' };
    case 'rejected':
      return { label: 'Not approved', color: '#A5362C', bg: '#FBF0EF', dot: '#C2453A' };
    default:
      return { label: 'Pending verification', color: '#8A5A14', bg: '#F4EEE2', dot: '#B7791F' };
  }
}

export const money = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

// Vendor-friendly labels for the document parse lifecycle.
export function docStatusMeta(s: string): { label: string; color: string; bg: string } {
  switch (s) {
    case 'posted':
      return { label: 'Processed', color: '#2E6347', bg: '#EAF1ED' };
    case 'parsed':
    case 'needs_review':
      return { label: 'In review', color: '#2D5365', bg: '#EEF3F6' };
    default: // pending
      return { label: 'Received', color: '#8A5A14', bg: '#F4EEE2' };
  }
}

export function shipmentStatusMeta(s: string): { label: string; color: string; bg: string } {
  switch (s) {
    case 'delivered':
      return { label: 'Delivered', color: '#2E6347', bg: '#EAF1ED' };
    case 'arrived':
      return { label: 'Arrived', color: '#2E6347', bg: '#EAF1ED' };
    case 'in_transit':
      return { label: 'In transit', color: '#2D5365', bg: '#EEF3F6' };
    case 'cancelled':
      return { label: 'Cancelled', color: '#A5362C', bg: '#FBF0EF' };
    default: // expected
      return { label: 'Expected', color: '#8A5A14', bg: '#F4EEE2' };
  }
}

export function statementStatusMeta(s: string): { label: string; color: string; bg: string } {
  switch (s) {
    case 'settled':
      return { label: 'Settled', color: '#2E6347', bg: '#EAF1ED' };
    case 'countered':
      return { label: 'Counter-offer', color: '#8A5A14', bg: '#F4EEE2' };
    case 'sent':
      return { label: 'Awaiting your review', color: '#2D5365', bg: '#EEF3F6' };
    default: // draft
      return { label: 'In preparation', color: '#8A99A3', bg: '#EEF0F2' };
  }
}

export function lotStatusMeta(s: string): { label: string; color: string; bg: string } {
  switch (s) {
    case 'incoming':
      return { label: 'In transit', color: '#8A5A14', bg: '#F4EEE2' };
    case 'received':
      return { label: 'Received', color: '#2D5365', bg: '#EEF3F6' };
    case 'shipped':
      return { label: 'Sold through', color: '#2E6347', bg: '#EAF1ED' };
    default: // available / allocated -> internal detail, show neutral
      return { label: 'In warehouse', color: '#5A6670', bg: '#EEF0F2' };
  }
}
