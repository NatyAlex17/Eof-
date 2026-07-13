-- =============================================================================
-- MANA — Downgrade claim evidence (box, weight, photos)
--
-- Blanca's real process: the customer sends a photo + the box weight for a
-- downgrade. This lets the customer portal capture the box number (`boxes`,
-- already present), the weight, and attach photos.
--
-- Run AFTER 20260711100003_vendor_packing_form.sql. Safe to re-run.
-- =============================================================================

alter table public.credit_claims
  add column if not exists weight_lb numeric(10, 2),
  add column if not exists photo_paths jsonb not null default '[]'::jsonb;

-- Private bucket for claim evidence photos.
insert into storage.buckets (id, name, public)
values ('claim-photos', 'claim-photos', false)
on conflict (id) do nothing;

-- A customer uploads only into their own folder: claim-photos/{customer_id}/...
drop policy if exists "claim_photos_insert" on storage.objects;
create policy "claim_photos_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'claim-photos'
    and (storage.foldername(name))[1] = public.app_customer_id()::text
  );

-- Customer reads their own photos; staff read all.
drop policy if exists "claim_photos_read" on storage.objects;
create policy "claim_photos_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'claim-photos'
    and (
      (storage.foldername(name))[1] = public.app_customer_id()::text
      or public.app_role()::text not in ('customer', 'vendor')
    )
  );
