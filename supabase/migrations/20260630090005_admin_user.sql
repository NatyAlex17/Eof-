-- =============================================================================
-- MANA — Seed the default admin user (dev/demo only)
-- email: admin@example.com  password: 12345678
-- The on_auth_user_created trigger fires on this insert and auto-creates the
-- profiles row with role='admin' because it will be the first profile.
--
-- Run AFTER the four schema migrations (0001-0004).
-- Safe to re-run — the ON CONFLICT DO NOTHING prevents duplicates.
-- =============================================================================

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@example.com',
  crypt('12345678', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Admin"}'::jsonb,
  false,
  now(),
  now(),
  '',
  '',
  '',
  ''
)
on conflict do nothing;
