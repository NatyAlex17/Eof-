import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Self-service signup for vendors (suppliers). Creates the auth user, a vendors
// record, and links the profile as role 'vendor'. Service role is required
// because RLS + the profile guard block a self-service user from setting their
// own role or inserting a vendors row.
export async function POST(request: Request) {
  const { companyName, contact, email, password } = await request.json();

  if (!companyName || !email || !password) {
    return NextResponse.json(
      { error: 'Company name, email, and password are required.' },
      { status: 400 }
    );
  }
  if (String(password).length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Auth user (confirmed — they can sign in immediately).
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: companyName, role: 'vendor' },
  });
  if (authErr || !created.user) {
    const msg = authErr?.message || 'Could not create the account.';
    const already = /already|registered|exists/i.test(msg);
    return NextResponse.json(
      { error: already ? 'An account with that email already exists. Try signing in.' : msg },
      { status: already ? 409 : 500 }
    );
  }
  const userId = created.user.id;

  // 2. Vendor record. code = kebab slug of the name (vendors.code is unique).
  const code =
    companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'vendor';

  const { data: vendor, error: vendErr } = await admin
    .from('vendors')
    .insert({ name: companyName.trim(), code, contact_email: email })
    .select()
    .single();

  if (vendErr || !vendor) {
    await admin.auth.admin.deleteUser(userId); // roll back so they can retry
    const dup = /duplicate|unique/i.test(vendErr?.message || '');
    return NextResponse.json(
      {
        error: dup
          ? 'A vendor with that name already exists. Please contact us to link your account.'
          : vendErr?.message || 'Could not create the vendor record.',
      },
      { status: dup ? 409 : 500 }
    );
  }

  // 3. Link the auto-provisioned profile as role 'vendor'.
  await admin
    .from('profiles')
    .update({
      name: contact?.trim() || companyName.trim(),
      role: 'vendor',
      status: 'active',
      vendor_id: vendor.id,
    })
    .eq('id', userId);

  return NextResponse.json({ ok: true });
}
