-- =============================================================================
-- MANA — Vendor packing lists via structured form (no file parsing)
--
-- Vendors' PDFs are not standardized, so parsing is unreliable. Instead vendors
-- key their packing list directly into a form; the structured lines land in
-- documents.parsed_payload with NO uploaded file. Commercial invoices are no
-- longer submitted by vendors — the system generates a professional document
-- from the packing-list data instead.
--
-- Run AFTER 20260711100002_vendor_verification.sql. Safe to re-run.
-- =============================================================================

-- Form submissions have no storage object.
alter table public.documents alter column storage_path drop not null;

-- Vendors now submit ONLY packing lists (structured), never 'posted'.
drop policy if exists "documents_vendor_insert" on public.documents;
create policy "documents_vendor_insert" on public.documents
  for insert to authenticated
  with check (
    public.app_role()::text = 'vendor'
    and vendor_id = public.app_vendor_id()
    and public.app_vendor_verified()
    and kind = 'packing_list'
    and parse_status <> 'posted'
  );
