-- =============================================================================
-- MANA — Vendor verification gate
--
-- A self-signed-up vendor starts 'pending' and CANNOT submit documents until a
-- staff member verifies them. Existing (staff-created) vendors are backfilled
-- to 'verified' so nothing that predates this gate breaks.
--
-- Run AFTER 20260711100001_vendor_portal.sql. Safe to re-run.
-- =============================================================================

alter table public.vendors
  add column if not exists verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references public.profiles(id) on delete set null,
  add column if not exists rejection_reason text;

-- Vendors that existed before this gate are trusted / already onboarded.
update public.vendors
   set verification_status = 'verified'
 where verification_status = 'pending';

-- Is the signed-in vendor verified? SECURITY DEFINER so it can be used inside
-- the documents / storage insert policies without RLS recursion.
create or replace function public.app_vendor_verified()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.vendors v
    join public.profiles p on p.vendor_id = v.id
    where p.id = auth.uid() and v.verification_status = 'verified'
  );
$$;

grant execute on function public.app_vendor_verified() to authenticated;

-- Only a VERIFIED vendor may insert documents.
drop policy if exists "documents_vendor_insert" on public.documents;
create policy "documents_vendor_insert" on public.documents
  for insert to authenticated
  with check (
    public.app_role()::text = 'vendor'
    and vendor_id = public.app_vendor_id()
    and public.app_vendor_verified()
    and kind in ('packing_list', 'commercial_invoice')
  );

-- Same gate on the storage upload (no orphan files from unverified vendors).
drop policy if exists "vendor_docs_insert" on storage.objects;
create policy "vendor_docs_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vendor-docs'
    and (storage.foldername(name))[1] = public.app_vendor_id()::text
    and public.app_vendor_verified()
  );

-- Staff who manage vendors (admin, operations) can set verification.
drop policy if exists "vendors_write" on public.vendors;
create policy "vendors_write" on public.vendors
  for all to authenticated
  using (public.app_role()::text in ('admin', 'operations'))
  with check (public.app_role()::text in ('admin', 'operations'));
